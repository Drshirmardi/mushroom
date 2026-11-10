import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type PatientProfile, type BillingIntent } from '../../../generated/prisma/client';
import { BillingTargetRegistry, type BillingTarget, type PreparedTarget } from '../../billing/billing-target.registry';
import { lockFinancial, type FinancialContext, type Tx } from '../../billing/billing.policy';
import { marriageDefinition } from '../domain/marriage-service';
import { adminPublicationHash } from '../purchases/assessment-admin-purchase.service';

const conflict = (message = 'Marriage assessment payment is unavailable.') =>
  new ConflictException({ code: 'MARRIAGE_PAYMENT_UNAVAILABLE', message, details: {} });

@Injectable()
export class MarriageBillingTarget implements BillingTarget, OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: BillingTargetRegistry,
  ) {}

  onModuleInit() {
    this.registry.register('MARRIAGE_REQUEST', this);
  }

  async prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget> {
    const publicationId = input.publicationId;
    if (!publicationId || !/^[a-f0-9-]{36}$/i.test(publicationId)) throw conflict('Valid publication required.');
    const termsConsentRecordId = input.termsConsentRecordId;
    if (!termsConsentRecordId || !/^[a-f0-9-]{36}$/i.test(termsConsentRecordId)) throw conflict('Valid terms consent required.');

    return this.prisma.$transaction(async tx => {
      await lockFinancial(tx, `marriage-prepay:${patient.id}:${publicationId.toLowerCase()}`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM clinics WHERE id=${patient.clinicId}::uuid FOR SHARE`);
      const source = await tx.assessmentAdminPublication.findFirst({
        where: { id: publicationId, offeringVersion: { clinicId: patient.clinicId, kind: 'COUPLES', priceMode: 'PAID' } },
        include: { offeringVersion: { include: { assessmentVersion: true, consentPolicies: true } } },
      });
      if (!source || !marriageDefinition(source.offeringVersion.authoringTexts)) throw conflict('Couples marriage service not found.');
      const definition = marriageDefinition(source.offeringVersion.authoringTexts)!;

      await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_admin_publications WHERE id=${publicationId}::uuid FOR SHARE`);
      const [proof] = await tx.$queryRaw<{ allowed: boolean }[]>(
        Prisma.sql`SELECT assessment_admin_offering_current(${source.offeringVersionId}::uuid) AND assessment_publicly_available(${source.offeringVersion.assessmentVersionId}::uuid) AS allowed`,
      );
      if (source.status !== 'ACTIVE' || !proof?.allowed) throw conflict('Marriage service offering is not active.');

      const terms = source.offeringVersion.consentPolicies.find(p => p.policyKey === 'ASSESSMENT_PURCHASE_TERMS');
      const termsHash = (source.documentHashes as Record<string, string>)?.ASSESSMENT_PURCHASE_TERMS;
      if (!terms || !termsHash || terms.contentHash !== termsHash) throw conflict('Terms policy unavailable.');

      const [termsConsent] = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${termsConsentRecordId}::uuid AND patient_id=${patient.id}::uuid AND policy_version_id=${terms.id}::uuid AND content_hash=${termsHash} AND withdrawn_at IS NULL FOR SHARE`,
      );
      if (!termsConsent) throw conflict('Valid terms consent required.');

      let eligibleCount = 0;
      for (const role of definition.roles) {
        const [roleProof] = await tx.$queryRaw<{ allowed: boolean }[]>(
          Prisma.sql`SELECT marriage_patient_role_eligible(${patient.id}::uuid, ${JSON.stringify(role)}::jsonb) AS allowed`,
        );
        if (roleProof?.allowed) eligibleCount++;
      }
      if (eligibleCount === 0) throw conflict('Patient profile is not eligible for this marriage assessment.');

      const amount = source.offeringVersion.amountRial;
      if (!amount || amount <= 0n) throw conflict('Tariff must be positive.');

      const [clock] = await tx.$queryRaw<{ expiry: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP + INTERVAL '900 seconds' AS expiry`);
      return {
        amountRial: amount,
        expiresAt: clock!.expiry,
        snapshot: {
          publicationId: source.id,
          publicationHash: adminPublicationHash(source),
          assessmentVersionId: source.offeringVersion.assessmentVersionId,
          title: source.offeringVersion.title,
          amountRial: amount.toString(),
          initiatorPatientId: patient.id,
          termsConsentRecordId,
        },
      };
    });
  }

  async reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget) {
    const snapshot = prepared.snapshot as { publicationId: string; assessmentVersionId: string };
    await lockFinancial(tx, `marriage-prepay:${patient.id}:${snapshot.publicationId.toLowerCase()}`);

    const [pending] = await tx.$queryRaw<{ n: number }[]>(
      Prisma.sql`SELECT count(*)::int AS n FROM billing_intents i
        WHERE i.patient_id = ${patient.id}::uuid AND i.purpose = 'MARRIAGE_REQUEST'
          AND i.snapshot->>'publicationId' = ${snapshot.publicationId}
          AND (
            (i.status = 'PENDING' AND (i.expires_at > CURRENT_TIMESTAMP OR EXISTS (SELECT 1 FROM billing_gateway_attempts a WHERE a.intent_id = i.id AND a.status IN ('CREATED','REDIRECT_READY','VERIFYING','REQUIRES_RECONCILIATION'))))
            OR
            (i.status = 'PAID' AND i.assessment_purchase_id IS NULL AND NOT EXISTS (
              SELECT 1 FROM marriage_service_requests r WHERE r.paid_intent_id = i.id AND r.status IN ('PENDING', 'ACCEPTED')
            ) AND NOT EXISTS (
              SELECT 1 FROM billing_refunds rf WHERE rf.intent_id = i.id AND rf.status = 'COMPLETED'
            ))
          )`,
    );
    if (pending?.n) throw conflict('An active prepayment or pending payment already exists for this test.');
    return { kind: 'NONE' as const };
  }

  async lock(tx: Tx, intent: BillingIntent) {
    const snapshot = intent.snapshot as { publicationId?: string };
    if (snapshot?.publicationId) {
      await lockFinancial(tx, `marriage-prepay:${intent.patientId}:${snapshot.publicationId.toLowerCase()}`);
    }
  }

  async canSettle(tx: Tx, intent: BillingIntent) {
    const snapshot = intent.snapshot as { publicationId?: string };
    if (!snapshot?.publicationId) return false;
    const [proof] = await tx.$queryRaw<{ allowed: boolean }[]>(
      Prisma.sql`SELECT ${intent.expiresAt}::timestamptz > CURRENT_TIMESTAMP AS allowed`,
    );
    return !!proof?.allowed;
  }

  async settle(_tx: Tx, _intent: BillingIntent, _context: FinancialContext) {
    return { kind: 'NONE' as const };
  }

  async refund(_tx: Tx, _intent: BillingIntent, _amountRial: bigint, _refundId: string) {
    return;
  }
}
