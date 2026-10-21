import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { PatientAssessmentsService } from '../../assessments/patient/patient-assessments.service';
import type { EntryPolicyDto, EntryPolicyUpdateDto, EntryProfileDto, PatientEntryStatusDto } from './patient-entry.dto';

export type EntryActor = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
const unavailable = () => new ConflictException({ code: 'ENTRY_UNAVAILABLE', message: 'Entry assessment is unavailable.', details: {} });
const conflict = () => new ConflictException({ code: 'ENTRY_CONFLICT', message: 'Entry configuration or progress changed.', details: {} });

export function entryRequired(enabled: boolean, cutoff: Date | null, accountCreated: Date, hasEntry: boolean, completed: boolean) {
  return enabled && !completed && (hasEntry || cutoff !== null && accountCreated.getTime() >= cutoff.getTime());
}

@Injectable()
export class PatientEntryService {
  constructor(private readonly prisma: PrismaService, private readonly assessments: PatientAssessmentsService) {}

  private async patient(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    const p = await tx.patientProfile.findUnique({ where: { userId }, include: {
      user: { select: { createdAt: true, userProfile: { select: { firstName: true, lastName: true } } } },
      clinic: { select: { entryPolicy: true } },
      entry: { include: { submission: { select: { state: true, invalidatedAt: true } } } },
    } });
    if (!p) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile not found.', details: {} });
    return p;
  }

  async status(userId: string, tx: Prisma.TransactionClient = this.prisma): Promise<PatientEntryStatusDto> {
    const p = await this.patient(userId, tx); const policy = p.clinic.entryPolicy; const entry = p.entry;
    const required = entryRequired(policy?.enabled ?? false, policy?.enforcedFrom ?? null, p.user.createdAt, !!entry, !!entry?.completedAt);
    const sourceId = entry?.assessmentVersionId ?? policy?.assessmentVersionId ?? null;
    const source = sourceId ? await tx.assessmentVersion.findFirst({ where: { id: sourceId, clinicId: p.clinicId }, select: { id: true, title: true, status: true, locale: true, structure: true, offeringVersions: { where: { commercialPublications: { some: {} } }, select: { id: true }, take: 1 } } }) : null;
    const readableResult = entry?.submission?.state === 'COMPLETE' && !entry.submission.invalidatedAt;
    const available = !!source && (source.status === 'PUBLISHED' || source.status === 'RETIRED' && !!entry?.submissionId) && source.locale === 'fa-IR' && source.offeringVersions.length === 0;
    const profile = p.user.userProfile;
    return {
      required, phase: !required ? 'COMPLETE' : readableResult ? 'RESULT' : !available ? 'UNAVAILABLE' : !entry || !profile?.firstName?.trim() || !profile.lastName?.trim() ? 'PROFILE' : 'ASSESSMENT',
      assessmentVersionId: sourceId, assessmentTitle: source?.title ?? null, submissionId: entry?.submissionId ?? null,
      firstName: profile?.firstName ?? null, lastName: profile?.lastName ?? null, birthDate: entry?.birthDate.toISOString().slice(0, 10) ?? null,
    };
  }

  async saveProfile(userId: string, body: EntryProfileDto, ctx: EntryActor) {
    const firstName = body.firstName.trim().replace(/\s+/g, ' '); const lastName = body.lastName.trim().replace(/\s+/g, ' ');
    const date = new Date(`${body.birthDate}T00:00:00.000Z`); const now = new Date();
    if (!firstName || !lastName || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.birthDate || date > now || date.getUTCFullYear() < now.getUTCFullYear() - 130) throw new UnprocessableEntityException({ code: 'ENTRY_PROFILE_INVALID', message: 'Valid name and birth date required.', details: {} });
    await this.prisma.$transaction(async tx => {
      const p = await this.patient(userId, tx); await this.lock(tx, p.id);
      const state = await this.status(userId, tx); if (!state.required) return;
      if (state.phase === 'UNAVAILABLE') throw unavailable();
      if (state.submissionId) throw conflict();
      await tx.userProfile.upsert({ where: { userId }, create: { userId, firstName, lastName }, update: { firstName, lastName } });
      await tx.patientEntry.upsert({ where: { patientId: p.id }, create: { patientId: p.id, clinicId: p.clinicId, birthDate: date }, update: { birthDate: date } });
      await this.audit(tx, 'PATIENT_ENTRY_PROFILE_SAVED', p.id, ctx);
    });
    return this.status(userId);
  }

  async start(userId: string, ctx: EntryActor) {
    await this.prisma.$transaction(async tx => {
      const p = await this.patient(userId, tx); await this.lock(tx, p.id);
      const state = await this.status(userId, tx);
      if (!state.required || state.submissionId) return;
      if (state.phase !== 'ASSESSMENT' || !state.assessmentVersionId) throw unavailable();
      // Existing engine owns revision/idempotency and source locks; retries recover its saved attempt.
      const submission = await this.assessments.start(state.assessmentVersionId, userId, ctx);
      await tx.patientEntry.update({ where: { patientId: p.id }, data: { assessmentVersionId: state.assessmentVersionId, submissionId: submission.id } });
      await this.audit(tx, 'PATIENT_ENTRY_STARTED', p.id, ctx);
    }, { timeout: 30_000 });
    return this.status(userId);
  }

  async complete(userId: string, ctx: EntryActor) {
    await this.prisma.$transaction(async tx => {
      const p = await this.patient(userId, tx); await this.lock(tx, p.id);
      const state = await this.status(userId, tx);
      if (!state.required) return;
      if (state.phase !== 'RESULT' || !state.submissionId) throw conflict();
      const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM patient_assessment_submissions WHERE id=${state.submissionId}::uuid AND patient_id=${p.id}::uuid AND state='COMPLETE' AND invalidated_at IS NULL FOR SHARE`);
      if (!rows.length) throw conflict();
      await tx.patientEntry.update({ where: { patientId: p.id }, data: { completedAt: new Date() } });
      await this.audit(tx, 'PATIENT_ENTRY_COMPLETED', p.id, ctx);
    });
    return this.status(userId);
  }

  private async clinic(tx: Prisma.TransactionClient = this.prisma) {
    const clinic = await tx.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); if (!clinic) throw unavailable(); return clinic;
  }
  async policy(): Promise<EntryPolicyDto> {
    const clinic = await this.clinic(); const policy = await this.prisma.patientEntryPolicy.findUnique({ where: { clinicId: clinic.id }, include: { assessmentVersion: { select: { title: true } } } });
    return { enabled: policy?.enabled ?? false, assessmentVersionId: policy?.assessmentVersionId ?? null, assessmentTitle: policy?.assessmentVersion?.title ?? null, revision: policy?.revision ?? 0, enforcedFrom: policy?.enforcedFrom ?? null };
  }
  async updatePolicy(body: EntryPolicyUpdateDto, ctx: EntryActor) {
    await this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx);
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'entry-policy:' + clinic.id},0))`);
      const previous = await tx.patientEntryPolicy.findUnique({ where: { clinicId: clinic.id } });
      if ((previous?.revision ?? 0) !== body.expectedRevision) throw conflict();
      if (body.enabled && !body.assessmentVersionId) throw unavailable();
      if (body.assessmentVersionId && (body.enabled || body.assessmentVersionId !== previous?.assessmentVersionId)) {
        const source = await tx.assessmentVersion.findFirst({ where: { id: body.assessmentVersionId, clinicId: clinic.id, status: 'PUBLISHED', locale: 'fa-IR', offeringVersions: { none: { commercialPublications: { some: {} } } } }, select: { structure: true } });
        if (!source || (source.structure as { schemaVersion?: number }).schemaVersion === 2) throw unavailable();
      }
      const data = { enabled: body.enabled, assessmentVersionId: body.assessmentVersionId ?? null, enforcedFrom: previous?.enforcedFrom ?? (body.enabled ? new Date() : null), revision: (previous?.revision ?? 0) + 1 };
      if (previous) await tx.patientEntryPolicy.update({ where: { clinicId: clinic.id }, data });
      else await tx.patientEntryPolicy.create({ data: { clinicId: clinic.id, ...data } });
      await this.audit(tx, 'PATIENT_ENTRY_POLICY_UPDATED', clinic.id, ctx, { enabled: data.enabled, assessmentVersionId: data.assessmentVersionId, revision: data.revision, enforcedFrom: data.enforcedFrom?.toISOString() ?? null });
    });
    return this.policy();
  }
  private async lock(tx: Prisma.TransactionClient, patientId: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'patient-entry:' + patientId},0))`); }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, ctx: EntryActor, metadata: Prisma.InputJsonValue = {}) {
    await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'PATIENT_ENTRY', subjectId, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata } });
  }
}
