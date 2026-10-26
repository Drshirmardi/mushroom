import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type CoupleInvitation, type CoupleSession } from '../../../generated/prisma/client';
import { normalizeIranianMobile } from '../../identity/domain/phone-number';
import { coupleSessionSelect, coupleSessionSummary } from './couple-link.projection';
import type { CoupleInvitationAcceptDto, CoupleInvitationCreateDto, CoupleLinkConsentDto, CoupleSessionListQueryDto } from './couple-link.dto';

type Context = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const missing = (invitation = false) => new NotFoundException({ code: invitation ? 'COUPLE_INVITATION_NOT_FOUND' : 'COUPLE_SESSION_NOT_FOUND', message: 'The couple resource was not found.', details: {} });
const stateConflict = () => new ConflictException({ code: 'COUPLE_STATE_CONFLICT', message: 'The couple link no longer accepts this operation.', details: {} });
const unavailableInvitee = () => new UnprocessableEntityException({ code: 'COUPLE_INVITATION_UNAVAILABLE', message: 'Invitation requires a different registered patient in the same clinic.', details: {} });
const commandKey = (value: string | undefined) => {
  const key = value?.trim();
  if (!key || key.length > 200 || !/^[\x21-\x7e]+$/u.test(key)) throw new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A valid Idempotency-Key is required.', details: {} });
  return key;
};
const reused = () => new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key was used for a different operation.', details: {} });

@Injectable()
export class CoupleLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async policy(userId: string, context: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, userId); const policy = await this.activePolicy(tx, patient.clinicId);
      await this.audit(tx, 'COUPLE_LINK_POLICY_READ', policy.id, context);
      return policy;
    });
  }
  async create(userId: string, body: CoupleLinkConsentDto, rawKey: string | undefined, context: Context) {
    this.explicitConsent(body.consentAccepted);
    const key = commandKey(rawKey); const payloadHash = hash(JSON.stringify({ policyId: body.consentPolicyVersionId.toLowerCase(), consentAccepted: true }));
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, userId);
      await this.lockCommand(tx, `couple-create:${patient.id}:${key}`);
      const previous = await tx.coupleSession.findUnique({ where: { initiatorPatientId_idempotencyKey: { initiatorPatientId: patient.id, idempotencyKey: key } } });
      if (previous) { if (previous.payloadHash !== payloadHash || previous.clinicId !== patient.clinicId) throw reused(); return this.summary(tx, previous.id, patient.id, context); }
      await this.adult(tx, patient.id);
      const policy = await this.activePolicy(tx, patient.clinicId); this.assertPolicy(policy.id, body.consentPolicyVersionId);
      const session = await tx.coupleSession.create({ data: { clinicId: patient.clinicId, initiatorPatientId: patient.id, consentPolicyVersionId: policy.id, consentContentHash: policy.contentHash, idempotencyKey: key, payloadHash } });
      await this.join(tx, session, patient.id, 'INITIATOR', context);
      await this.audit(tx, 'COUPLE_SESSION_CREATED', session.id, context);
      return this.summary(tx, session.id, patient.id, context);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async list(userId: string, query: CoupleSessionListQueryDto, context: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, userId);
      const where = { clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } };
      const [rows, total] = await Promise.all([
        tx.coupleSession.findMany({ where, select: coupleSessionSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        tx.coupleSession.count({ where }),
      ]);
      await this.audit(tx, 'COUPLE_SESSION_LIST_READ', patient.id, context);
      return { items: rows.map(row => coupleSessionSummary(row, patient.id)), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async get(userId: string, id: string, context: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, userId); await this.owned(tx, id, patient);
      return this.summary(tx, id, patient.id, context);
    });
  }
  async invite(userId: string, id: string, body: CoupleInvitationCreateDto, rawKey: string | undefined, context: Context) {
    const key = commandKey(rawKey); let phone: string;
    try { phone = normalizeIranianMobile(body.recipientPhone); } catch { throw unavailableInvitee(); }
    const payloadHash = hash(JSON.stringify({ sessionId: id.toLowerCase(), recipientPhone: phone, recipientPatientId: body.recipientPatientId.toLowerCase() }));
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, userId);
      await this.lockCommand(tx, `couple-invite:${patient.id}:${key}`);
      const session = await this.owned(tx, id, patient, true);
      if (session.initiatorPatientId !== patient.id) throw missing();
      const previous = await tx.coupleInvitation.findUnique({ where: { issuerPatientId_idempotencyKey: { issuerPatientId: patient.id, idempotencyKey: key } } });
      if (previous) {
        if (previous.payloadHash !== payloadHash || previous.sessionId !== id.toLowerCase()) throw reused();
        await this.audit(tx, 'COUPLE_INVITATION_READ', previous.id, context); return this.invitationResponse(previous, null);
      }
      if (session.state !== 'AWAITING_PARTNER') throw stateConflict();
      const recipient = await tx.patientProfile.findFirst({ where: { clinicId: patient.clinicId, user: { phone, status: 'ACTIVE' }, id: { equals: body.recipientPatientId, not: patient.id } }, select: { id: true } });
      if (!recipient) throw unavailableInvitee();
      const pending = await tx.coupleInvitation.findFirst({ where: { sessionId: id, status: 'PENDING' }, select: { createdAt: true } });
      await tx.coupleInvitation.updateMany({ where: { sessionId: id, status: 'PENDING' }, data: { status: 'REVOKED', revokedAt: await this.now(tx, pending?.createdAt) } });
      const token = randomBytes(32).toString('base64url');
      const invitation = await tx.coupleInvitation.create({ data: { sessionId: id, clinicId: patient.clinicId, issuerPatientId: patient.id, recipientPatientId: recipient.id, tokenHash: hash(token), idempotencyKey: key, payloadHash } });
      await this.audit(tx, 'COUPLE_INVITATION_ISSUED', invitation.id, context);
      return this.invitationResponse(invitation, token);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async preview(userId: string, token: string, context: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, userId); const invitation = await this.invitation(tx, token, patient);
      if (invitation.status !== 'PENDING') throw missing(true);
      const session = await tx.coupleSession.findUniqueOrThrow({ where: { id: invitation.sessionId } });
      if (session.state !== 'AWAITING_PARTNER') throw stateConflict();
      const policy = await this.activePolicy(tx, patient.clinicId); this.assertPolicy(policy.id, session.consentPolicyVersionId);
      const row = await tx.coupleSession.findUniqueOrThrow({ where: { id: session.id }, select: coupleSessionSelect });
      await this.audit(tx, 'COUPLE_INVITATION_PREVIEWED', invitation.id, context);
      return { session: coupleSessionSummary(row, patient.id), policy, expiresAt: null };
    });
  }
  async accept(userId: string, body: CoupleInvitationAcceptDto, context: Context) {
    this.explicitConsent(body.consentAccepted);
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, userId); const initial = await this.invitation(tx, body.invitationToken, patient);
      await this.lockSession(tx, initial.sessionId, patient.clinicId);
      const invitation = await this.invitation(tx, body.invitationToken, patient);
      const session = await tx.coupleSession.findUniqueOrThrow({ where: { id: invitation.sessionId } });
      if (invitation.status === 'ACCEPTED' && session.state === 'LINKED') {
        this.assertPolicy(session.consentPolicyVersionId, body.consentPolicyVersionId);
        return this.summary(tx, session.id, patient.id, context);
      }
      if (invitation.status !== 'PENDING' || session.state !== 'AWAITING_PARTNER') throw stateConflict();
      await this.adult(tx, patient.id);
      const policy = await this.activePolicy(tx, patient.clinicId);
      this.assertPolicy(policy.id, session.consentPolicyVersionId); this.assertPolicy(session.consentPolicyVersionId, body.consentPolicyVersionId);
      await this.join(tx, session, patient.id, 'PARTNER', context);
      await tx.coupleInvitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', acceptedAt: await this.now(tx, invitation.createdAt) } });
      await tx.coupleSession.update({ where: { id: session.id }, data: { state: 'LINKED' } });
      await this.audit(tx, 'COUPLE_INVITATION_ACCEPTED', invitation.id, context);
      return this.summary(tx, session.id, patient.id, context);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async withdraw(userId: string, id: string, context: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, userId); await this.owned(tx, id, patient, true);
      const participant = await tx.coupleParticipant.findUniqueOrThrow({ where: { sessionId_patientId: { sessionId: id, patientId: patient.id } } });
      if (participant.revokedAt === null) {
        // A backwards wall-clock step must never prevent immediate privacy revocation.
        const at = await this.now(tx, participant.acceptedAt);
        await tx.coupleParticipant.update({ where: { id: participant.id }, data: { revokedAt: at } });
        await tx.coupleInvitation.updateMany({ where: { sessionId: id, status: 'PENDING' }, data: { status: 'REVOKED', revokedAt: at } });
        await tx.coupleSession.update({ where: { id }, data: { state: 'CONSENT_REVOKED' } });
        await this.audit(tx, 'COUPLE_LINK_CONSENT_WITHDRAWN', participant.id, context);
      }
      return this.summary(tx, id, patient.id, context);
    });
  }

  private async patient(tx: Prisma.TransactionClient, userId: string) {
    const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    if (!patient) throw missing();
    // Owner policy publication locks clinic before policy. Retain that order before any policy/session locks.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM clinics WHERE id = ${patient.clinicId}::uuid FOR KEY SHARE`);
    return patient;
  }
  private async adult(tx: Prisma.TransactionClient, patientId: string) {
    const [decision] = await tx.$queryRaw<{ eligible: boolean }[]>(Prisma.sql`SELECT couple_patient_is_adult(${patientId}::uuid) AS eligible`);
    if (!decision.eligible) throw new UnprocessableEntityException({ code: 'COUPLE_PARTICIPANT_INELIGIBLE', message: 'An adult self-reported birth date is required before joining.', details: {} });
  }
  private async activePolicy(tx: Prisma.TransactionClient, clinicId: string) {
    const policy = await tx.consentPolicyVersion.findFirst({ where: { clinicId, clinic: { status: 'ACTIVE' }, policyKey: 'COUPLES_ACCOUNT_LINKING', locale: 'fa-IR', status: 'ACTIVE' },
      select: { id: true, versionNumber: true, policyKey: true, locale: true, title: true, body: true, contentHash: true } });
    if (!policy) throw new ServiceUnavailableException({ code: 'COUPLE_POLICY_UNAVAILABLE', message: 'An approved account-link consent policy is required.', details: {} });
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id = ${policy.id}::uuid AND status = 'ACTIVE' FOR SHARE`);
    if (!locked.length) throw new ConflictException({ code: 'COUPLE_CONSENT_POLICY_CHANGED', message: 'Review the current account-link policy before accepting.', details: {} });
    return policy;
  }
  private explicitConsent(value: boolean) { if (value !== true) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Explicit consent is required.', details: {} }); }
  private assertPolicy(expected: string, provided: string) {
    if (expected !== provided.toLowerCase()) throw new ConflictException({ code: 'COUPLE_CONSENT_POLICY_CHANGED', message: 'Review the current account-link policy before accepting.', details: {} });
  }
  private async owned(tx: Prisma.TransactionClient, id: string, patient: { id: string; clinicId: string }, lock = false) {
    if (lock) await this.lockSession(tx, id, patient.clinicId);
    const row = await tx.coupleSession.findFirst({ where: { id, clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } } });
    if (!row) throw missing(); return row;
  }
  private async lockSession(tx: Prisma.TransactionClient, id: string, clinicId: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM couple_sessions WHERE id = ${id}::uuid AND clinic_id = ${clinicId}::uuid FOR UPDATE`);
    if (!rows.length) throw missing();
  }
  private async invitation(tx: Prisma.TransactionClient, token: string, patient: { id: string; clinicId: string }) {
    const row = await tx.coupleInvitation.findFirst({ where: { tokenHash: hash(token), recipientPatientId: patient.id, clinicId: patient.clinicId } });
    if (!row) throw missing(true); return row;
  }
  private async join(tx: Prisma.TransactionClient, session: CoupleSession, patientId: string, slot: 'INITIATOR' | 'PARTNER', context: Context) {
    return tx.coupleParticipant.create({ data: { sessionId: session.id, clinicId: session.clinicId, patientId, slot, consentPolicyVersionId: session.consentPolicyVersionId,
      consentContentHash: session.consentContentHash, acceptedByUserId: context.actorUserId, acceptedSessionId: context.actorSessionId } });
  }
  private async summary(tx: Prisma.TransactionClient, id: string, selfId: string, context: Context) {
    const row = await tx.coupleSession.findUniqueOrThrow({ where: { id }, select: coupleSessionSelect });
    await this.audit(tx, 'COUPLE_SESSION_READ', id, context); return coupleSessionSummary(row, selfId);
  }
  private invitationResponse(row: CoupleInvitation, token: string | null) { return { invitationId: row.id, sessionId: row.sessionId, status: row.status, expiresAt: null, invitationToken: token }; }
  private async now(tx: Prisma.TransactionClient, notBefore?: Date) {
    return (await tx.$queryRaw<{ at: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP, ${notBefore ?? null}::timestamptz) AS at`))[0].at;
  }
  private async lockCommand(tx: Prisma.TransactionClient, key: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`); }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, context: Context) {
    await tx.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'COUPLE_ACCOUNT_LINK', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: {} } });
  }
}
