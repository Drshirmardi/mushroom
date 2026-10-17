import { createHash } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type GuidanceContentVersion } from '../../../generated/prisma/client';
import type { GuidanceApprovalDto, GuidanceContentCreateDto, GuidanceContentQueryDto, GuidanceSafetyDto, GuidanceSourceDto } from './guidance-content.dto';

type Context = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
type Mode = 'admin' | 'doctor' | 'patient';
const missing = () => new NotFoundException({ code: 'GUIDANCE_NOT_FOUND', message: 'Guidance content is unavailable.', details: {} });
const forbidden = () => new ForbiddenException({ code: 'FORBIDDEN', message: 'Scoped content authority is required.', details: {} });
const conflict = () => new ConflictException({ code: 'GUIDANCE_CONFLICT', message: 'The content hash or lifecycle conflicts.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'GUIDANCE_INVALID', message: 'Guidance metadata is inconsistent.', details: {} });
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object'
  ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}` : JSON.stringify(value);
const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');

@Injectable()
export class GuidanceContentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: GuidanceContentCreateDto, rawKey: string | undefined, ctx: Context) {
    const key = rawKey?.trim();
    if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key)) throw invalid();
    const provenance = body.provenance.map(source => ({ label: source.label.trim(), url: source.url, accessedOn: source.accessedOn, ...(source.sourceVersion ? { sourceVersion: source.sourceVersion.trim() } : {}) }));
    if (provenance.some(s => {
      const date = new Date(`${s.accessedOn}T00:00:00Z`);
      return !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== s.accessedOn;
    })) throw invalid();
    const safety = { intendedAudience: body.safety.intendedAudience.trim(), limitations: body.safety.limitations.trim(), contraindications: body.safety.contraindications.map(s => s.trim()), seekProfessionalCare: body.safety.seekProfessionalCare.trim() };
    const definition = { articleId: body.articleId.toLowerCase(), locale: body.locale, kind: body.kind, provenance, safety };
    const payloadHash = hash(definition);
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.scope(tx, 'admin', ctx);
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'guidance-command:' + ctx.actorUserId + ':' + key},0))`);
      const previous = await tx.guidanceContentVersion.findUnique({ where: { clinicId_createdByUserId_idempotencyKey: { clinicId, createdByUserId: ctx.actorUserId, idempotencyKey: key } } });
      if (previous) {
        if (previous.payloadHash !== payloadHash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'The command key was already used for different metadata.', details: {} });
        await this.audit(tx, 'GUIDANCE_CONTENT_READ', previous.id, ctx);
        return this.response(previous);
      }
      await tx.$queryRaw(Prisma.sql`SELECT id FROM articles WHERE id=${definition.articleId}::uuid AND clinic_id=${clinicId}::uuid FOR SHARE`);
      const article = await tx.article.findFirst({ where: { id: definition.articleId, clinicId } });
      if (!article) throw missing();
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'guidance-version:' + article.id + ':' + body.locale},0))`);
      const latest = await tx.guidanceContentVersion.findFirst({ where: { clinicId, articleId: article.id, locale: body.locale }, orderBy: { versionNumber: 'desc' }, select: { versionNumber: true } });
      const snapshot = { ...definition, title: article.title, summary: article.summary, body: article.body };
      const row = await tx.guidanceContentVersion.create({ data: { ...snapshot, provenance: provenance as Prisma.InputJsonValue, safety, clinicId, versionNumber: (latest?.versionNumber ?? 0) + 1, contentHash: hash(snapshot), createdByUserId: ctx.actorUserId, idempotencyKey: key, payloadHash } });
      await this.audit(tx, 'GUIDANCE_CONTENT_CREATED', row.id, ctx);
      return this.response(row);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async list(query: GuidanceContentQueryDto, mode: 'admin' | 'doctor', ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.scope(tx, mode, ctx);
      const where = { clinicId, ...(query.articleId ? { articleId: query.articleId } : {}), ...(query.status ? { status: query.status } : {}) };
      const [rows, total] = await Promise.all([
        tx.guidanceContentVersion.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }),
        tx.guidanceContentVersion.count({ where }),
      ]);
      await this.audit(tx, 'GUIDANCE_CONTENT_LIST_READ', clinicId, ctx);
      return { items: rows.map(row => this.response(row)), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async get(id: string, mode: Mode, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.scope(tx, mode, ctx);
      const row = await tx.guidanceContentVersion.findFirst({ where: { id, clinicId } });
      if (!row) throw missing();
      if (mode === 'patient') {
        if (row.status !== 'APPROVED' || !row.approvedByUserId) throw missing();
        const [authority] = await tx.$queryRaw<{ id: string | null }[]>(Prisma.sql`SELECT guidance_doctor_id(${row.approvedByUserId}::uuid,${clinicId}::uuid) AS id`);
        if (!authority?.id || authority.id !== row.approvedDoctorId) throw missing();
      }
      await this.audit(tx, 'GUIDANCE_CONTENT_READ', row.id, ctx);
      return this.response(row);
    }, { isolationLevel: 'RepeatableRead' });
  }

  async approve(id: string, body: GuidanceApprovalDto, ctx: Context) {
    if (body.educationalOnly !== true || body.noDiagnosisOrTherapeuticDiet !== true) throw invalid();
    return this.change(id, 'doctor', ctx, async (tx, row, doctorId) => {
      if (row.status === 'REVOKED' || row.contentHash !== body.contentHash) throw conflict();
      if (row.status === 'APPROVED') return row;
      const [time] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${row.createdAt}::timestamptz) AS now`);
      const next = await tx.guidanceContentVersion.update({ where: { id }, data: { status: 'APPROVED', approvedByUserId: ctx.actorUserId, approvedDoctorId: doctorId!, approvedSessionId: ctx.actorSessionId, approvedAt: time!.now } });
      await this.audit(tx, 'GUIDANCE_CONTENT_APPROVED', id, ctx);
      return next;
    });
  }

  async revoke(id: string, mode: 'admin' | 'doctor', ctx: Context) {
    return this.change(id, mode, ctx, async (tx, row) => {
      if (mode === 'admin' && row.approvedAt !== null) throw forbidden();
      if (row.status === 'REVOKED') return row;
      const [time] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${row.approvedAt ?? row.createdAt}::timestamptz) AS now`);
      const next = await tx.guidanceContentVersion.update({ where: { id }, data: { status: 'REVOKED', revokedAt: time!.now, revokedByUserId: ctx.actorUserId, revokedSessionId: ctx.actorSessionId } });
      await this.audit(tx, 'GUIDANCE_CONTENT_REVOKED', id, ctx);
      return next;
    });
  }

  private async change(id: string, mode: 'admin' | 'doctor', ctx: Context, action: (tx: Prisma.TransactionClient, row: GuidanceContentVersion, doctorId: string | null) => Promise<GuidanceContentVersion>) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.scope(tx, mode, ctx);
      const doctorId = mode === 'doctor' ? await this.doctor(tx, clinicId, ctx.actorUserId, true) : null;
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM guidance_content_versions WHERE id=${id}::uuid AND clinic_id=${clinicId}::uuid FOR UPDATE`);
      if (!locked.length) throw missing();
      const row = await tx.guidanceContentVersion.findUniqueOrThrow({ where: { id } });
      const next = await action(tx, row, doctorId);
      if (row.status === next.status) await this.audit(tx, 'GUIDANCE_CONTENT_READ', id, ctx);
      return this.response(next);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  private async scope(tx: Prisma.TransactionClient, mode: Mode, ctx: Context) {
    // Keep current account/session and scope stable through sensitive writes/read projection.
    const session = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=${ctx.actorSessionId}::uuid AND s.user_id=${ctx.actorUserId}::uuid AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.status='ACTIVE' FOR SHARE OF s,u`);
    if (!session.length) throw forbidden();
    if (mode === 'patient') {
      const profile = await tx.patientProfile.findFirst({ where: { userId: ctx.actorUserId, clinic: { status: 'ACTIVE' } }, select: { clinicId: true } });
      if (!profile) throw missing();
      return profile.clinicId;
    }
    const clinics = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT c.id FROM clinics c JOIN clinical_clinic_accesses a ON a.clinic_id=c.id WHERE c.status='ACTIVE' AND a.user_id=${ctx.actorUserId}::uuid FOR SHARE OF c,a`);
    if (!clinics.length) throw forbidden();
    const clinicId = clinics[0]!.id;
    if (mode === 'doctor') await this.doctor(tx, clinicId, ctx.actorUserId);
    if (mode === 'admin') {
      const roles = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT r.id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=${ctx.actorUserId}::uuid AND r.code='ADMIN' FOR SHARE OF ur,r`);
      if (!roles.length) throw forbidden();
    }
    return clinicId;
  }

  private async doctor(tx: Prisma.TransactionClient, clinicId: string, userId: string, lock = false) {
    const [authority] = lock
      ? await tx.$queryRaw<{ id: string | null }[]>(Prisma.sql`SELECT guidance_lock_doctor(${userId}::uuid,${clinicId}::uuid) AS id`)
      : await tx.$queryRaw<{ id: string | null }[]>(Prisma.sql`SELECT guidance_doctor_id(${userId}::uuid,${clinicId}::uuid) AS id`);
    if (!authority?.id) throw forbidden();
    return authority.id;
  }

  private async audit(tx: Prisma.TransactionClient, action: string, id: string, ctx: Context) {
    await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'GUIDANCE_CONTENT', subjectId: id, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } });
  }

  private response(row: GuidanceContentVersion) {
    return { id: row.id, articleId: row.articleId, versionNumber: row.versionNumber, locale: row.locale, kind: row.kind, status: row.status, title: row.title, summary: row.summary, body: row.body,
      contentHash: row.contentHash, provenance: row.provenance as unknown as GuidanceSourceDto[], safety: row.safety as unknown as GuidanceSafetyDto,
      educationalOnly: true as const, createdAt: row.createdAt, approvedAt: row.approvedAt, revokedAt: row.revokedAt };
  }
}
