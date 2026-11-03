import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type MarriageServiceRequest } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { SmsCredentialCryptoService } from '../../communications/sms/sms-credential-crypto.service';
import { normalizeIranianMobile } from '../../identity/domain/phone-number';
import { marriageDefinition, type MarriageDefinition } from '../domain/marriage-service';
import { canonicalAssessmentJson } from '../domain/assessment-canonical-json';
import { adminPublicationHash } from '../purchases/assessment-admin-purchase.service';
import { CoupleLinkService } from './couple-link.service';
import { EducationalCoupleService } from './educational/educational-couple.service';
import type { MarriageRequestAcceptDto, MarriageRequestCreateDto } from './marriage-request.dto';

type Tx = Prisma.TransactionClient;
const missing = () => new NotFoundException({ code: 'MARRIAGE_REQUEST_NOT_FOUND', message: 'This service request is unavailable for this account.', details: {} });
const conflict = () => new ConflictException({ code: 'MARRIAGE_REQUEST_CONFLICT', message: 'Review the current service, invitation and independent acceptances.', details: {} });
const command = (key?: string) => { if (!key || !/^[\x21-\x7e]{1,200}$/u.test(key)) throw conflict(); return key; };

@Injectable()
export class MarriageRequestService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly crypto: SmsCredentialCryptoService, private readonly links: CoupleLinkService, private readonly educational: EducationalCoupleService) {}

  async settings(publicationId: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx);
      const source = await this.source(tx, publicationId, patient.clinicId, true);
      const policy = await this.links.policy(ctx.actorUserId, ctx);
      return { publicationId, title: source.offeringVersion.title, amountRial: source.offeringVersion.amountRial!.toString(), definition: marriageDefinition(source.offeringVersion.authoringTexts)!, eligibleRoles: await this.eligible(tx, patient.id, marriageDefinition(source.offeringVersion.authoringTexts)!), linkingPolicy: policy };
    });
  }

  async create(body: MarriageRequestCreateDto, keyInput: string | undefined, ctx: Context, transaction?: Tx) {
    const key = command(keyInput);
    let phone: string;
    try { phone = normalizeIranianMobile(body.recipientPhone); } catch { throw new UnprocessableEntityException({ code: 'MARRIAGE_PHONE_INVALID', message: 'Enter a valid mobile number.', details: {} }); }
    const fingerprint = this.crypto.phoneFingerprints(phone)[0]!;
    const payloadHash = createHash('sha256').update(canonicalAssessmentJson({ ...body, recipientPhone: fingerprint })).digest('hex');
    const execute = async (tx: Tx) => {
      const patient = await this.patient(tx, ctx);
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'marriage-create:' + patient.id + ':' + key},0))`);
      const prior = await tx.marriageServiceRequest.findUnique({ where: { initiatorPatientId_idempotencyKey: { initiatorPatientId: patient.id, idempotencyKey: key } } });
      if (prior) { if (prior.payloadHash !== payloadHash) throw conflict(); return this.project(tx, prior, patient.id, ctx); }
      if (phone === patient.user.phone) throw new UnprocessableEntityException({ code: 'MARRIAGE_SELF_INVITATION', message: 'Invite a different person.', details: {} });
      const source = await this.source(tx, body.publicationId, patient.clinicId, true);
      const definition = marriageDefinition(source.offeringVersion.authoringTexts)!;
      if (!(await this.eligible(tx, patient.id, definition)).includes(body.initiatorRole)) throw new UnprocessableEntityException({ code: 'MARRIAGE_OWN_PROFILE_INELIGIBLE', message: 'Complete your profile and review the conditions for this role.', details: {} });
      const link = await this.links.create(ctx.actorUserId, { consentPolicyVersionId: body.consentPolicyVersionId, consentAccepted: body.consentAccepted }, `marriage:${createHash('sha256').update(key).digest('hex')}`, ctx, tx);
      const encrypted = this.crypto.encrypt({ phone });
      const row = await tx.marriageServiceRequest.create({ data: { clinicId: patient.clinicId, publicationId: body.publicationId, initiatorPatientId: patient.id, initiatorRole: body.initiatorRole, recipientHash: fingerprint, encryptedPayload: new Uint8Array(encrypted.ciphertext), encryptionNonce: new Uint8Array(encrypted.nonce), authenticationTag: new Uint8Array(encrypted.tag), encryptionKeyVersion: encrypted.keyVersion, linkId: link.id, idempotencyKey: key, payloadHash } });
      await this.audit(tx, 'MARRIAGE_REQUEST_CREATED', row.id, ctx);
      return this.project(tx, row, patient.id, ctx);
    };
    return transaction ? execute(transaction) : this.prisma.$transaction(execute, { maxWait: 30000, timeout: 15000 });
  }

  async list(page: number, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx);
      const verified = await this.verified(tx, patient.user.phone, ctx);
      const where = { clinicId: patient.clinicId, OR: [{ initiatorPatientId: patient.id }, ...(verified ? [{ recipientPatientId: patient.id }, { recipientPatientId: null, recipientHash: { in: this.crypto.phoneFingerprints(patient.user.phone) } }] : [])] };
      const [rows, total] = await Promise.all([tx.marriageServiceRequest.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 }), tx.marriageServiceRequest.count({ where })]);
      const items = [];
      for (const row of rows) items.push(await this.project(tx, row, patient.id, ctx));
      await this.audit(tx, 'MARRIAGE_REQUEST_LIST_READ', patient.id, ctx);
      return { items, total, page, pageSize: 20 };
    });
  }

  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => { const { patient, row } = await this.owned(tx, id, ctx); await this.audit(tx, 'MARRIAGE_REQUEST_READ', id, ctx); return this.project(tx, row, patient.id, ctx); });
  }

  async review(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const { row, patient } = await this.owned(tx,id,ctx,true);
      if (row.initiatorPatientId === patient.id) throw missing();
      if (row.status !== 'PENDING') return this.project(tx,row,patient.id,ctx);
      const source = await this.source(tx,row.publicationId,row.clinicId,true);
      const definition = marriageDefinition(source.offeringVersion.authoringTexts)!;
      const recipientRole = definition.roles.find(role => role.id !== row.initiatorRole)!;
      const eligible = (await this.eligible(tx,patient.id,definition)).includes(recipientRole.id) && (await this.eligible(tx,row.initiatorPatientId,definition)).includes(row.initiatorRole);
      const next = await tx.marriageServiceRequest.update({where:{id},data:{recipientIneligible:!eligible}});
      await this.audit(tx,'MARRIAGE_CONDITIONS_REVIEWED',id,ctx);
      return this.project(tx,next,patient.id,ctx);
    });
  }

  async accept(id: string, body: MarriageRequestAcceptDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const { row, patient } = await this.owned(tx, id, ctx, true);
      if (patient.id === row.initiatorPatientId || body.consentAccepted !== true) throw missing();
      if (row.status === 'ACCEPTED') return this.project(tx, row, patient.id, ctx);
      if (row.status !== 'PENDING') throw conflict();
      const source = await this.source(tx, row.publicationId, patient.clinicId, true);
      const definition = marriageDefinition(source.offeringVersion.authoringTexts)!;
      const recipientRole = definition.roles.find(role => role.id !== row.initiatorRole)!;
      if (!(await this.eligible(tx, patient.id, definition)).includes(recipientRole.id) || !(await this.eligible(tx, row.initiatorPatientId, definition)).includes(row.initiatorRole)) {
        const next = await tx.marriageServiceRequest.update({ where: { id }, data: { recipientIneligible: true } });
        await this.audit(tx, 'MARRIAGE_ELIGIBILITY_NOT_CONFIRMED', id, ctx);
        return this.project(tx, next, patient.id, ctx);
      }
      await this.links.acceptServiceRequest(tx, row.linkId, ctx.actorUserId, body.consentPolicyVersionId, ctx);
      await tx.marriageServiceRequest.update({ where: { id }, data: { recipientPatientId: patient.id } });
      const educational = await this.educational.create({ coupleSessionId: row.linkId, publicationId: source.id, publicationHash: adminPublicationHash(source) }, `marriage:${id}`, ctx, tx);
      const next = await tx.marriageServiceRequest.update({ where: { id }, data: { recipientPatientId: patient.id, educationalId: educational.id, status: 'ACCEPTED', recipientIneligible: false } });
      await this.audit(tx, 'MARRIAGE_REQUEST_ACCEPTED', id, ctx);
      return this.project(tx, next, patient.id, ctx);
    }, { maxWait: 30000, timeout: 15000 });
  }

  async replace(id: string, body: MarriageRequestCreateDto, keyInput: string|undefined, ctx: Context) {
    const key = command(keyInput);
    return this.prisma.$transaction(async tx => {
      const { row, patient } = await this.owned(tx,id,ctx,true);
      if (row.initiatorPatientId !== patient.id || body.publicationId !== row.publicationId) throw missing();
      const prior = await tx.marriageServiceRequest.findUnique({ where: { replacesId: id } });
      if (prior) { if (prior.idempotencyKey !== key) throw conflict(); return this.create(body,key,ctx,tx); }
      if (row.status !== 'PENDING') throw conflict();
      const next = await this.create(body,key,ctx,tx);
      if (next.id === id) throw conflict();
      await tx.marriageServiceRequest.update({ where: { id: next.id }, data: { replacesId: id } });
      await tx.marriageServiceRequest.update({ where: { id }, data: { status: 'REPLACED' } });
      await this.audit(tx,'MARRIAGE_REQUEST_REPLACED',id,ctx);
      return next;
    }, { maxWait: 30000, timeout: 15000 });
  }

  async cancel(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const { patient, row } = await this.owned(tx, id, ctx, true);
      if (row.initiatorPatientId !== patient.id) throw missing();
      if (row.status !== 'PENDING' && row.status !== 'CANCELLED') throw conflict();
      const next = await tx.marriageServiceRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
      await this.audit(tx, 'MARRIAGE_REQUEST_CANCELLED', id, ctx);
      return this.project(tx, next, patient.id, ctx);
    });
  }

  async owned(tx: Tx, id: string, ctx: Context, lock = false) {
    const patient = await this.patient(tx, ctx);
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM marriage_service_requests WHERE id=${id}::uuid AND clinic_id=${patient.clinicId}::uuid FOR UPDATE`);
    const row = await tx.marriageServiceRequest.findFirst({ where: { id, clinicId: patient.clinicId } });
    if (!row || row.initiatorPatientId !== patient.id && (!await this.verified(tx, patient.user.phone, ctx) || (row.recipientPatientId !== null ? row.recipientPatientId !== patient.id : !this.crypto.phoneFingerprints(patient.user.phone).includes(row.recipientHash)))) throw missing();
    return { row, patient };
  }

  private async patient(tx: Tx, ctx: Context) {
    const clinicId = await this.authority.scope(tx, 'patient', ctx);
    const patient = await tx.patientProfile.findUnique({ where: { userId: ctx.actorUserId }, include: { user: true } });
    if (!patient || patient.clinicId !== clinicId || patient.user.status !== 'ACTIVE') throw missing();
    return patient;
  }
  private async verified(tx: Tx, phone: string, ctx: Context) { return !!await tx.session.count({ where: { id: ctx.actorSessionId, userId: ctx.actorUserId, verifiedPhone: phone, revokedAt: null, expiresAt: { gt: new Date() } } }); }
  private async source(tx: Tx, id: string, clinicId: string, current: boolean) {
    if (current) await tx.$queryRaw(Prisma.sql`SELECT id FROM clinics WHERE id=${clinicId}::uuid FOR SHARE`);
    const source = await tx.assessmentAdminPublication.findFirst({ where: { id, offeringVersion: { clinicId, kind: 'COUPLES' } }, include: { offeringVersion: true } });
    if (!source || !marriageDefinition(source.offeringVersion.authoringTexts)) throw missing();
    if (current) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_admin_publications WHERE id=${id}::uuid FOR SHARE`);
      const [proof] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT assessment_admin_offering_current(${source.offeringVersionId}::uuid) AND assessment_publicly_available(${source.offeringVersion.assessmentVersionId}::uuid) AS allowed`);
      if (source.status !== 'ACTIVE' || !proof?.allowed) throw conflict();
    }
    return source;
  }
  private async eligible(tx: Tx, patientId: string, definition: MarriageDefinition) {
    const result: string[] = [];
    for (const role of definition.roles) { const [proof] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT marriage_patient_role_eligible(${patientId}::uuid,${JSON.stringify(role)}::jsonb) AS allowed`); if (proof?.allowed) result.push(role.id); }
    return result;
  }
  private async ownIneligibility(tx: Tx, patientId: string, role: MarriageDefinition['roles'][number]) {
    const [profile] = await tx.$queryRaw<{ gender: string|null; birthDate: Date|null; allowed: boolean }[]>(Prisma.sql`
      SELECT profile.gender, coalesce(
        (SELECT r.birth_date FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=p.id),
        (SELECT birth_date FROM patient_entries WHERE patient_id=p.id)) AS "birthDate",
        marriage_patient_role_eligible(p.id,${JSON.stringify(role)}::jsonb) AS allowed
      FROM patient_profiles p LEFT JOIN user_profiles profile ON profile.user_id=p.user_id WHERE p.id=${patientId}::uuid`);
    if (profile?.allowed) return null;
    if (!profile?.gender || !profile.birthDate) return 'PROFILE_INCOMPLETE';
    return role.genders.includes(profile.gender as 'MALE'|'FEMALE') ? 'AGE_BELOW_MINIMUM' : 'GENDER_NOT_ALLOWED';
  }
  private async project(tx: Tx, row: MarriageServiceRequest, patientId: string, ctx: Context) {
    const source = await this.source(tx, row.publicationId, row.clinicId, false);
    const definition = marriageDefinition(source.offeringVersion.authoringTexts)!;
    const isInitiator = row.initiatorPatientId === patientId;
    const recipientPhoneMasked = isInitiator ? `09•••••${normalizeIranianMobile(this.crypto.decrypt(row).phone).slice(-4)}` : null;
    const ownRole = isInitiator ? row.initiatorRole : definition.roles.find(role => role.id !== row.initiatorRole)!.id;
    const link = await tx.coupleSession.findUniqueOrThrow({ where: { id: row.linkId }, include: { consentPolicy: true } });
    const policy = link.consentPolicy;
    const ownIneligibilityReason = await this.ownIneligibility(tx,patientId,definition.roles.find(role => role.id === ownRole)!);
    const initiator = await tx.userProfile.findFirst({ where: { user: { patientProfile: { id: row.initiatorPatientId } } }, select: { firstName: true,lastName: true } });
    const initiatorName = [initiator?.firstName,initiator?.lastName].filter(Boolean).join(' ') || null;
    const deliveries = isInitiator ? await tx.marriageInvitationDelivery.findFirst({ where: { requestId: row.id }, orderBy: { createdAt: 'desc' } }) : null;
    const ownProfile = await tx.userProfile.findFirst({ where: { user: { patientProfile: { id: patientId } } }, select: { firstName: true, lastName: true } });
    const profileRequired = ownIneligibilityReason === 'PROFILE_INCOMPLETE' || !ownProfile?.firstName?.trim() || !ownProfile.lastName?.trim();
    const nextPath = profileRequired ? `/welcome?marriageRequestId=${row.id}` : row.status === 'ACCEPTED' && row.educationalId ? `/assessment/couples/educational/${row.educationalId}?marriageRequestId=${row.id}` : `/assessment/marriage/requests/${row.id}`;
    return { continuation: { profileRequired, nextPath }, id: row.id, status: row.status, isInitiator, recipientPhoneMasked, initiatorName, ownIneligibilityReason, ownEligible: (await this.eligible(tx, patientId, definition)).includes(ownRole), eligibilityNotConfirmed: row.recipientIneligible, ownRole, service: { publicationId: row.publicationId, title: source.offeringVersion.title, amountRial: source.offeringVersion.amountRial!.toString(), definition, eligibleRoles: await this.eligible(tx, patientId, definition), linkingPolicy: { id: policy.id, versionNumber: policy.versionNumber, policyKey: policy.policyKey, locale: policy.locale, title: policy.title, body: policy.body, contentHash: policy.contentHash } }, invitationPath: `/assessment/marriage/requests/${row.id}`, educationalId: row.educationalId, smsStatus: deliveries?.status ?? null, createdAt: row.createdAt };
  }
  private async audit(tx: Tx, action: string, subjectId: string, ctx: Context) { await tx.auditEvent.create({ data: { action, subjectType: 'MARRIAGE_SERVICE_REQUEST', subjectId, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0,128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}
