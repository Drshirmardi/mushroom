import { createHash } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { Prisma, type CoupleResultProtocolVersion } from '../../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../../content/guidance/guidance-authority.service';
import { GuidanceContentService } from '../../../content/guidance/guidance-content.service';
import { AssessmentProtocolService } from '../../protocol/assessment-protocol.service';
import { COUPLE_RESULT_ALGORITHM, coupleProtocolHash, normalizeCouplePairs, type CoupleResultPair } from './couple-result-protocol.definition';
import type { CoupleResultProtocolApprovalDto, CoupleResultProtocolCreateDto, CoupleResultProtocolQueryDto } from './couple-result-protocol.dto';

type Tx = Prisma.TransactionClient;
type Mode = 'admin' | 'doctor';
type Reference = { id: string; contentHash: string };
const missing = () => new NotFoundException({ code: 'COUPLE_PROTOCOL_NOT_FOUND', message: 'Joint educational protocol is unavailable.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'COUPLE_PROTOCOL_INVALID', message: 'Exact supported source, disclosure and approved education references required.', details: {} });
const conflict = () => new ConflictException({ code: 'COUPLE_PROTOCOL_CONFLICT', message: 'Exact protocol, approval or dependencies changed.', details: {} });

@Injectable()
export class CoupleResultProtocolService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly content: GuidanceContentService, private readonly protocols: AssessmentProtocolService) {}

  async create(body: CoupleResultProtocolCreateDto, rawKey: string | undefined, ctx: Context) {
    const key = rawKey?.trim(); if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key)) throw invalid();
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      const source = await tx.assessmentVersion.findFirst({ where: { id: body.assessmentVersionId, clinicId, status: { in: ['PUBLISHED', 'RETIRED'] } } }); if (!source) throw missing();
      let normalized: ReturnType<typeof normalizeCouplePairs>; try { normalized = normalizeCouplePairs(source.structure, body.pairs); } catch { throw invalid(); }
      const [size] = await tx.$queryRaw<{ bounded: boolean }[]>(Prisma.sql`SELECT octet_length(${JSON.stringify(normalized.pairs)}::jsonb::text)<=131072 AS bounded`); if (!size!.bounded) throw invalid();
      const definition = { assessmentVersionId: source.id, protocolReviewId: body.protocolReviewId.toLowerCase(), disclosurePolicyVersionId: body.disclosurePolicyVersionId.toLowerCase(), pairs: normalized.pairs };
      const payloadHash = coupleProtocolHash(definition); await this.lock(tx, `couple-protocol-command:${ctx.actorUserId}:${key}`);
      const prior = await tx.coupleResultProtocolVersion.findUnique({ where: { clinicId_createdByUserId_idempotencyKey: { clinicId, createdByUserId: ctx.actorUserId, idempotencyKey: key } } });
      if (prior) { if (prior.payloadHash !== payloadHash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Command key is already used.', details: {} }); await this.audit(tx, 'COUPLE_PROTOCOL_READ', prior.id, ctx); return this.project(prior, await this.blockers(tx, prior)); }
      await this.sourceLock(tx, source.id); await this.lock(tx, `couple-protocol:${source.id}`);
      const review = await this.protocols.usableApproval(tx, clinicId, source.id); if (!review || review.id !== definition.protocolReviewId) throw conflict(); await this.protocols.lockApprovalAuthority(tx, review);
      await this.disclosureLock(tx, definition.disclosurePolicyVersionId);
      const disclosure = await tx.consentPolicyVersion.findFirst({ where: { id: definition.disclosurePolicyVersionId, clinicId, locale: source.locale, policyKey: 'COUPLES_RESULT_SHARING' } }); if (!disclosure) throw missing();
      if (disclosure.status !== 'ACTIVE' || !disclosure.activatedAt || coupleDisclosureHash(disclosure.body) !== disclosure.contentHash) throw conflict();
      await this.contentLock(tx, normalized.ids);
      const contents = await this.content.approvedVersions(tx, clinicId, normalized.ids);
      if (contents.length !== normalized.ids.length || contents.some(c => c.locale !== source.locale)) throw invalid();
      for (const c of contents) await this.authority.doctor(tx, clinicId, c.approvedByUserId!, true);
      const contentReferences = contents.map(c => ({ id: c.id, contentHash: c.contentHash }));
      const snapshot = { ...definition, questionnaireContentHash: source.contentHash, disclosureContentHash: disclosure.contentHash, ...COUPLE_RESULT_ALGORITHM, contentReferences };
      const latest = await tx.coupleResultProtocolVersion.findFirst({ where: { assessmentVersionId: source.id }, orderBy: { versionNumber: 'desc' } });
      const row = await tx.coupleResultProtocolVersion.create({ data: { ...snapshot, clinicId, versionNumber: (latest?.versionNumber ?? 0) + 1, createdByUserId: ctx.actorUserId, createdSessionId: ctx.actorSessionId, idempotencyKey: key, payloadHash, contentHash: coupleProtocolHash(snapshot) } });
      await this.audit(tx, 'COUPLE_PROTOCOL_CREATED', row.id, ctx); return this.project(row, await this.blockers(tx, row));
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async list(query: CoupleResultProtocolQueryDto, mode: Mode, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, mode, ctx); const where = { clinicId, ...(query.assessmentVersionId ? { assessmentVersionId: query.assessmentVersionId } : {}), ...(query.status ? { status: query.status } : {}) };
      const rows = await tx.coupleResultProtocolVersion.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize });
      const total = await tx.coupleResultProtocolVersion.count({ where });
      // History lists retained configuration; only detail/readiness performs dependency evaluation.
      await this.audit(tx, 'COUPLE_PROTOCOL_LIST_READ', clinicId, ctx);
      return { items: rows.map(row => this.project(row, ['DETAIL_READINESS_REQUIRED'])), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async get(id: string, mode: Mode, ctx: Context) { return this.prisma.$transaction(async tx => { const clinicId = await this.authority.scope(tx, mode, ctx); const row = await tx.coupleResultProtocolVersion.findFirst({ where: { id, clinicId } }); if (!row) throw missing(); await this.audit(tx, 'COUPLE_PROTOCOL_READ', id, ctx); return this.project(row, await this.blockers(tx, row)); }, { isolationLevel: 'RepeatableRead' }); }

  async approve(id: string, body: CoupleResultProtocolApprovalDto, ctx: Context) {
    if (body.educationalOnly !== true || body.noDiagnosisOrTherapeuticDiet !== true || body.reviewedJointDisclosure !== true) throw invalid();
    return this.change(id, 'doctor', ctx, async (tx, row, doctorId) => {
      if (row.status === 'REVOKED' || row.contentHash !== body.contentHash) throw conflict();
      if ((await this.blockers(tx, row, true)).some(b => b !== 'APPROVAL_REQUIRED')) throw conflict();
      if (row.status === 'APPROVED') return row;
      const next = await tx.coupleResultProtocolVersion.update({ where: { id }, data: { status: 'APPROVED', approvedByUserId: ctx.actorUserId, approvedDoctorId: doctorId!, approvedSessionId: ctx.actorSessionId, approvedAt: await this.time(tx, row.createdAt) } });
      await this.audit(tx, 'COUPLE_PROTOCOL_APPROVED', id, ctx); return next;
    });
  }
  async revoke(id: string, mode: Mode, ctx: Context) {
    return this.change(id, mode, ctx, async (tx, row) => {
      if (mode === 'admin' && row.approvedAt) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Qualified physician required.', details: {} });
      if (row.status === 'REVOKED') return row;
      const next = await tx.coupleResultProtocolVersion.update({ where: { id }, data: { status: 'REVOKED', revokedByUserId: ctx.actorUserId, revokedSessionId: ctx.actorSessionId, revokedAt: await this.time(tx, row.approvedAt ?? row.createdAt) } });
      await this.audit(tx, 'COUPLE_PROTOCOL_REVOKED', id, ctx); return next;
    });
  }

  // Configuration prerequisite only: never confers participant consent/payment or patient-record access.
  async usable(tx: Tx, clinicId: string, assessmentVersionId: string, exactId?: string, lock = false) {
    if (lock) { await this.sourceLock(tx, assessmentVersionId); await this.lock(tx, `couple-protocol:${assessmentVersionId}`); }
    const row = await tx.coupleResultProtocolVersion.findFirst({ where: { clinicId, assessmentVersionId, ...(exactId ? { id: exactId } : { approvedAt: { not: null } }) }, orderBy: { versionNumber: 'desc' } });
    return row && (await this.blockers(tx, row, lock)).length === 0 ? row : null;
  }

  private async blockers(tx: Tx, row: CoupleResultProtocolVersion, lock = false) {
    const codes: string[] = []; if (row.status !== 'APPROVED') codes.push(row.status === 'REVOKED' ? 'PROTOCOL_REVOKED' : 'APPROVAL_REQUIRED');
    const source = await tx.assessmentVersion.findUniqueOrThrow({ where: { id: row.assessmentVersionId } });
    let normalized: ReturnType<typeof normalizeCouplePairs> | null = null; try { normalized = normalizeCouplePairs(source.structure, row.pairs as unknown as CoupleResultPair[]); } catch { codes.push('PAIR_DEFINITION_UNSUPPORTED'); }
    if (!normalized?.complete) codes.push('PAIR_COVERAGE_INCOMPLETE');
    const review = await this.protocols.usableApproval(tx, row.clinicId, row.assessmentVersionId);
    if (!review || review.id !== row.protocolReviewId || source.contentHash !== row.questionnaireContentHash) codes.push('CURRENT_PROTOCOL_UNAVAILABLE'); else if (lock) await this.protocols.lockApprovalAuthority(tx, review);
    if (lock) await this.disclosureLock(tx, row.disclosurePolicyVersionId);
    const disclosure = await tx.consentPolicyVersion.findFirst({ where: { id: row.disclosurePolicyVersionId, clinicId: row.clinicId, policyKey: 'COUPLES_RESULT_SHARING', locale: source.locale, status: 'ACTIVE', contentHash: row.disclosureContentHash } });
    if (!disclosure?.activatedAt || coupleDisclosureHash(disclosure.body) !== row.disclosureContentHash) codes.push('JOINT_DISCLOSURE_UNAVAILABLE');
    const refs = row.contentReferences as Reference[]; if (lock) await this.contentLock(tx, refs.map(r => r.id));
    const contents = await this.content.approvedVersions(tx, row.clinicId, refs.map(r => r.id));
    if (contents.length !== refs.length || contents.some((c, index) => c.contentHash !== refs[index]!.contentHash || c.locale !== source.locale)) codes.push('APPROVED_CONTENT_UNAVAILABLE');
    else if (lock) for (const c of contents) await this.authority.doctor(tx, row.clinicId, c.approvedByUserId!, true);
    if (row.approvedAt) { const [doctor] = await tx.$queryRaw<{ id: string | null }[]>(Prisma.sql`SELECT guidance_doctor_id(${row.approvedByUserId}::uuid,${row.clinicId}::uuid) AS id`); if (doctor?.id !== row.approvedDoctorId) codes.push('PHYSICIAN_UNAVAILABLE'); else if (lock) await this.authority.doctor(tx, row.clinicId, row.approvedByUserId!, true); }
    const snapshot = { assessmentVersionId: row.assessmentVersionId, protocolReviewId: row.protocolReviewId, disclosurePolicyVersionId: row.disclosurePolicyVersionId, pairs: row.pairs, questionnaireContentHash: row.questionnaireContentHash, disclosureContentHash: row.disclosureContentHash, algorithmId: row.algorithmId, algorithmVersion: row.algorithmVersion, contentReferences: row.contentReferences };
    if (coupleProtocolHash(snapshot) !== row.contentHash || row.algorithmId !== COUPLE_RESULT_ALGORITHM.algorithmId || row.algorithmVersion !== COUPLE_RESULT_ALGORITHM.algorithmVersion) codes.push('PROVENANCE_UNSUPPORTED');
    return codes;
  }
  private async change(id: string, mode: Mode, ctx: Context, action: (tx: Tx, row: CoupleResultProtocolVersion, doctorId: string | null) => Promise<CoupleResultProtocolVersion>) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, mode, ctx); const pointer = await tx.coupleResultProtocolVersion.findFirst({ where: { id, clinicId }, select: { assessmentVersionId: true } }); if (!pointer) throw missing();
      await this.sourceLock(tx, pointer.assessmentVersionId); await this.lock(tx, `couple-protocol:${pointer.assessmentVersionId}`);
      const doctorId = mode === 'doctor' ? await this.authority.doctor(tx, clinicId, ctx.actorUserId, true) : null;
      await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_result_protocol_versions WHERE id=${id}::uuid FOR UPDATE`);
      const row = await tx.coupleResultProtocolVersion.findUniqueOrThrow({ where: { id } }); const next = await action(tx, row, doctorId);
      if (next.status === row.status) await this.audit(tx, 'COUPLE_PROTOCOL_READ', id, ctx); return this.project(next, await this.blockers(tx, next));
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  private async sourceLock(tx: Tx, id: string) { await this.lock(tx, `assessment-protocol:${id.toLowerCase()}`); await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${id}::uuid FOR SHARE`); }
  private async disclosureLock(tx: Tx, id: string) { await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${id}::uuid FOR SHARE`); }
  private async contentLock(tx: Tx, ids: string[]) { if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM guidance_content_versions WHERE id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR SHARE`); }
  private async lock(tx: Tx, key: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`); }
  private async time(tx: Tx, since: Date) { const [row] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${since}::timestamptz) AS now`); return row!.now; }
  private async audit(tx: Tx, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'COUPLE_RESULT_PROTOCOL', subjectId: id, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
  private project(row: CoupleResultProtocolVersion, blockers: string[]) { return { id: row.id, assessmentVersionId: row.assessmentVersionId, protocolReviewId: row.protocolReviewId, disclosurePolicyVersionId: row.disclosurePolicyVersionId, disclosureContentHash: row.disclosureContentHash, questionnaireContentHash: row.questionnaireContentHash, versionNumber: row.versionNumber, algorithmId: row.algorithmId, algorithmVersion: row.algorithmVersion, pairs: row.pairs, contentReferences: row.contentReferences, contentHash: row.contentHash, status: row.status, createdAt: row.createdAt, approvedAt: row.approvedAt, revokedAt: row.revokedAt, usable: blockers.length === 0, blockers }; }
}

const coupleDisclosureHash = (body: string) => createHash('sha256').update(body, 'utf8').digest('hex');
