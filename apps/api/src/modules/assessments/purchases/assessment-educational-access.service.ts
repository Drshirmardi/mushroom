import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { AssessmentAccessService } from '../access/assessment-access.service';
import { financialKey, lockFinancial } from '../../billing/billing.policy';
import type { AssessmentFreeAccessDto, AssessmentPurchasePageQueryDto } from './assessment-purchase.dto';
import { adminPublicationHash } from './assessment-admin-purchase.service';

const missing = () => new NotFoundException({ code: 'ASSESSMENT_PURCHASE_NOT_FOUND', message: 'Owned educational offering or access was not found.', details: {} });
const conflict = () => new ConflictException({ code: 'ASSESSMENT_PURCHASE_CONFLICT', message: 'Exact current offering, adult beneficiary and independent acceptance required.', details: {} });
const include = { offeringVersion: { include: { assessmentVersion: true, consentPolicies: true } } } as const;
type Publication = Prisma.AssessmentAdminPublicationGetPayload<{ include: typeof include }>;

@Injectable()
export class AssessmentEducationalAccessService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly access: AssessmentAccessService) {}

  async catalog(query: AssessmentPurchasePageQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx);
      const scope = Prisma.sql`FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id WHERE o.clinic_id=${patient.clinicId}::uuid AND o.price_mode='PAID' AND assessment_admin_offering_current(o.id) AND assessment_publicly_available(o.assessment_version_id) ${query.offeringKey ? Prisma.sql`AND o.offering_key=${query.offeringKey}` : Prisma.empty} ${query.kind ? Prisma.sql`AND o.kind=${query.kind}` : Prisma.empty}`;
      const [ids, count] = await Promise.all([tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT pub.id ${scope} ORDER BY pub.created_at DESC,pub.id DESC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`), tx.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT count(*)::int AS total ${scope}`)]);
      const records = ids.length ? await tx.assessmentAdminPublication.findMany({ where: { id: { in: ids.map(row => row.id) } }, include }) : [];
      const byId = new Map(records.map(row => [row.id, row]));
      const rows = ids.map(row => byId.get(row.id)!);
      await this.audit(tx, 'ASSESSMENT_CATALOG_READ', patient.id, ctx);
      return { items: rows.map(row => this.summary(row)), total: count[0]!.total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async offering(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx);
      const row = await tx.assessmentAdminPublication.findFirst({ where: { id, offeringVersion: { clinicId: patient.clinicId } }, include });
      if (!row) throw missing();
      const processing = row.offeringVersion.consentPolicies.find(p => p.policyKey === 'ASSESSMENT_PROCESSING');
      const accepted = processing ? await tx.patientConsentRecord.findFirst({ where: { patientId: patient.id, policyVersionId: processing.id, contentHash: processing.contentHash, withdrawnAt: null } }) : null;
      const terms = row.offeringVersion.consentPolicies.find(p => p.policyKey === 'ASSESSMENT_PURCHASE_TERMS');
      const termsConsent = terms ? await tx.patientConsentRecord.findFirst({ where: { patientId: patient.id, policyVersionId: terms.id, contentHash: terms.contentHash, withdrawnAt: null } }) : null;
      const grant = row.offeringVersion.priceMode === 'FREE'
        ? await tx.assessmentAccessGrant.findUnique({ where: { freeAdminPublicationId_patientId: { freeAdminPublicationId: row.id, patientId: patient.id } }, include: { submission: { select: { id: true, state: true } } } })
        : await tx.assessmentAccessGrant.findFirst({ where: { patientId: patient.id, clinicId: patient.clinicId, purchase: { adminPublicationId: row.id, intent: { purpose: 'ASSESSMENT', status: 'PAID' } } }, include: { submission: { select: { id: true, state: true } } }, orderBy: { grantedAt: 'desc' } });
      const [visibility] = await tx.$queryRaw<{ visible: boolean }[]>(Prisma.sql`SELECT assessment_publicly_available(${row.offeringVersion.assessmentVersionId}::uuid) AS visible`);
      if (!visibility?.visible && !grant) throw missing();
      if(row.offeringVersion.priceMode==='FREE'&&!grant)throw missing();
      const blockers = this.blockers(row);
      const [current] = await tx.$queryRaw<{ current: boolean }[]>(Prisma.sql`SELECT assessment_admin_offering_current(${row.offeringVersionId}::uuid) AS current`);
      if (!current?.current) blockers.push('CURRENT_OFFERING_UNAVAILABLE');
      if (!(await tx.$queryRaw<{ adult: boolean }[]>(Prisma.sql`SELECT couple_patient_is_adult(${patient.id}::uuid) AS adult`))[0]?.adult) blockers.push('ADULT_BIRTH_DATE_REQUIRED');
      if (grant && grant.processingConsentRecordId !== accepted?.id) blockers.push('PROCESSING_ACCEPTANCE_WITHDRAWN');
      const pending = await tx.billingIntent.findFirst({where:{patientId:patient.id,clinicId:patient.clinicId,purpose:'ASSESSMENT',status:'PENDING',assessmentPurchase:{adminPublicationId:row.id},OR:[{expiresAt:{gt:new Date()}},{attempts:{some:{status:{in:['CREATED','REDIRECT_READY','VERIFYING','REQUIRES_RECONCILIATION']}}}}]},select:{id:true},orderBy:{createdAt:'desc'}});
      const publicPurchaseAvailable=row.offeringVersion.kind==='INDIVIDUAL'&&row.offeringVersion.priceMode==='PAID'&&!!visibility?.visible&&!!current?.current&&!pending&&(!grant||grant.submission?.state==='COMPLETE'||grant.processingConsentRecordId!==accepted?.id)&&blockers.every(code=>code==='PROCESSING_ACCEPTANCE_WITHDRAWN');
      await this.audit(tx, 'ASSESSMENT_OFFERING_READ', row.id, ctx);
      return { ...this.summary(row), publicPurchaseAvailable,pendingIntentId:pending?.id??null,processingPolicy: processing ? { id: processing.id, policyKey: processing.policyKey, versionNumber: processing.versionNumber, locale: processing.locale, title: processing.title, body: processing.body, contentHash: processing.contentHash, status: processing.status } : null,
        termsPolicy: terms ? { id: terms.id, policyKey: terms.policyKey, versionNumber: terms.versionNumber, locale: terms.locale, title: terms.title, body: terms.body, contentHash: terms.contentHash, status: terms.status } : null,
        termsConsentId: termsConsent?.id ?? null, processingConsentId: accepted?.id ?? null, accessGrantId: grant?.id ?? null, submissionId: grant?.submission?.id ?? null, accessSupported: blockers.every(code => code === 'CURRENT_OFFERING_UNAVAILABLE') && (blockers.length === 0 || !!grant), blockers };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async claim(body: AssessmentFreeAccessDto, rawKey: string | undefined, ctx: Context) {
    const key = financialKey(rawKey);
    const payloadHash = createHash('sha256').update(JSON.stringify([body.publicationId.toLowerCase(), body.processingConsentRecordId.toLowerCase()])).digest('hex');
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx);
      await lockFinancial(tx, `assessment-free-command:${patient.id}:${key}`);
      const command = await tx.assessmentFreeAccessCommand.findUnique({ where: { patientId_idempotencyKey: { patientId: patient.id, idempotencyKey: key } }, include: { grant: true } });
      if (command) {
        if (command.payloadHash !== payloadHash) throw conflict();
        await this.audit(tx, 'ASSESSMENT_PURCHASE_READ', command.grantId, ctx);
        return { id: command.grantId, accessMode: 'FREE' as const, publicationId: command.grant.freeAdminPublicationId!, grantedAt: command.grant.grantedAt };
      }
      const pointer = await tx.assessmentAdminPublication.findFirst({ where: { id: body.publicationId, offeringVersion: { clinicId: patient.clinicId } }, include });
      if (!pointer) throw missing();
      const sourceId = pointer.offeringVersion.assessmentVersionId;
      await lockFinancial(tx, `assessment:start:${patient.id}:${sourceId}`);
      await lockFinancial(tx, `assessment-purchase:${patient.id}:${sourceId}`);
      await lockFinancial(tx, `assessment-protocol:${sourceId}`);
      await tx.$queryRaw(Prisma.sql`SELECT pub.id FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id JOIN assessment_versions v ON v.id=o.assessment_version_id WHERE pub.id=${body.publicationId}::uuid FOR SHARE OF pub,o,v`);
      await tx.$queryRaw(Prisma.sql`SELECT c.id FROM patient_consent_records c JOIN consent_policy_versions p ON p.id=c.policy_version_id WHERE c.id=${body.processingConsentRecordId}::uuid FOR SHARE OF c,p`);
      const row = await tx.assessmentAdminPublication.findUniqueOrThrow({ where: { id: pointer.id }, include });
      if (row.offeringVersion.priceMode !== 'FREE' || this.blockers(row).length) throw conflict();
      const policy = row.offeringVersion.consentPolicies.find(p => p.policyKey === 'ASSESSMENT_PROCESSING')!;
      const consent = await tx.patientConsentRecord.findFirst({ where: { id: body.processingConsentRecordId, patientId: patient.id, policyVersionId: policy.id, contentHash: policy.contentHash, withdrawnAt: null } });
      if (!consent) throw conflict();
      const existing = await tx.assessmentAccessGrant.findUnique({ where: { freeAdminPublicationId_patientId: { freeAdminPublicationId: row.id, patientId: patient.id } } });
      if (existing) {
        if (existing.processingConsentRecordId !== consent.id) throw conflict();
        await this.access.processingGrant(tx, existing.id, patient, ctx);
        await tx.assessmentFreeAccessCommand.create({ data: { patientId: patient.id, idempotencyKey: key, payloadHash, grantId: existing.id } });
        await this.audit(tx, 'ASSESSMENT_PURCHASE_READ', existing.id, ctx);
        return { id: existing.id, accessMode: 'FREE' as const, publicationId: row.id, grantedAt: existing.grantedAt };
      }
      throw new ConflictException({code:'ASSESSMENT_PAYMENT_REQUIRED',message:'Free acquisition is reserved for initial entry.',details:{}});
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  private blockers(row: Publication) {
    const offer = row.offeringVersion, blockers: string[] = [];
    if (row.status !== 'ACTIVE' || offer.status !== 'DRAFT') blockers.push('PUBLICATION_RETIRED');
    if (offer.assessmentVersion.status !== 'PUBLISHED' || row.questionnaireContentHash !== offer.assessmentVersion.contentHash) blockers.push('PUBLICATION_SOURCE_CHANGED');
    if (offer.kind !== 'INDIVIDUAL') blockers.push('DIGITAL_ACCESS_INTEGRATION_REQUIRED');
    const policy = offer.consentPolicies.find(p => p.policyKey === 'ASSESSMENT_PROCESSING');
    if (!policy || policy.status !== 'ACTIVE' || (row.documentHashes as Record<string, string>).ASSESSMENT_PROCESSING !== policy.contentHash || createHash('sha256').update(policy.body, 'utf8').digest('hex') !== policy.contentHash) blockers.push('PROCESSING_POLICY_UNAVAILABLE');
    if (offer.priceMode === 'PAID') {
      const terms = offer.consentPolicies.find(p => p.policyKey === 'ASSESSMENT_PURCHASE_TERMS');
      if (!terms || terms.status !== 'ACTIVE' || (row.documentHashes as Record<string, string>).ASSESSMENT_PURCHASE_TERMS !== terms.contentHash || createHash('sha256').update(terms.body, 'utf8').digest('hex') !== terms.contentHash) blockers.push('PURCHASE_TERMS_UNAVAILABLE');
      if (!offer.amountRial || offer.amountRial <= 0n || offer.paymentPoint !== 'PRE_START') blockers.push('PRICE_CONFIGURATION_INCOMPLETE');
    }
    return blockers;
  }
  private summary(row: Publication) { const offer = row.offeringVersion; return { id: row.id, publicationHash: adminPublicationHash(row), offeringVersionId: offer.id, title: offer.title, kind: offer.kind, priceMode: offer.priceMode, amountRial: offer.amountRial?.toString() ?? null, currency: offer.currency, algorithmId: offer.algorithmId, algorithmVersion: offer.algorithmVersion, publicationAuthority: 'ADMIN_PUBLISHED' as const }; }
  private async patient(tx: Prisma.TransactionClient, ctx: Context) { const clinicId = await this.authority.scope(tx, 'patient', ctx); const patient = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId } }); if (patient.clinicId !== clinicId) throw missing(); await this.access.self(tx, patient, ctx); return patient; }
  private async audit(tx: Prisma.TransactionClient, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'ASSESSMENT_ACCESS', subjectId: id, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}
