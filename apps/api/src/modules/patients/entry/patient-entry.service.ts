import { BillingService } from '../../billing/billing.service';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { PatientAssessmentsService } from '../../assessments/patient/patient-assessments.service';
import type { EntryPolicyDto, EntryPolicyUpdateDto, EntryProfileDto, PatientEntryStatusDto } from './patient-entry.dto';

export type EntryActor = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
const defaultIntroduction = 'پاسخی را انتخاب کنید که به شما نزدیک‌تر است. با زدن «ادامه»، پاسخ همان سؤال ذخیره می‌شود.';
const unavailable = () => new ConflictException({ code: 'ENTRY_UNAVAILABLE', message: 'Entry assessment is unavailable.', details: {} });
const conflict = () => new ConflictException({ code: 'ENTRY_CONFLICT', message: 'Entry configuration or progress changed.', details: {} });

export function entryRequired(enabled: boolean, cutoff: Date | null, accountCreated: Date, hasEntry: boolean, completed: boolean) {
  return enabled && !completed && (hasEntry || cutoff !== null && accountCreated.getTime() >= cutoff.getTime());
}

@Injectable()
export class PatientEntryService {
  constructor(private readonly prisma: PrismaService, private readonly assessments: PatientAssessmentsService, private readonly billing: BillingService) {}

  private async patient(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    const p = await tx.patientProfile.findUnique({ where: { userId }, include: {
      user: { select: { createdAt: true, userProfile: { select: { firstName: true, lastName: true, gender: true } } } },
      clinic: { select: { entryPolicy: true } },
      entry: { include: { submission: { select: { state: true, invalidatedAt: true } } } },
    } });
    if (!p) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile not found.', details: {} });
    return p;
  }

  async status(userId: string, tx: Prisma.TransactionClient = this.prisma): Promise<PatientEntryStatusDto> {
    const p = await this.patient(userId, tx); const policy = p.clinic.entryPolicy; const entry = p.entry;
    const completed = !!entry?.completedAt;
    const assessmentRequired = entryRequired(policy?.enabled ?? false, policy?.enforcedFrom ?? null, p.user.createdAt, !!entry, completed);
    const sourceId = entry?.assessmentVersionId ?? (assessmentRequired ? policy?.assessmentVersionId : null) ?? null;
    const source = sourceId ? await tx.assessmentVersion.findFirst({ where: { id: sourceId, clinicId: p.clinicId }, select: { id: true, title: true, status: true, locale: true } }) : null;
    const readableResult = entry?.submission?.state === 'COMPLETE' && !entry.submission.invalidatedAt;
    const available = !!source && (source.status === 'PUBLISHED' || source.status === 'RETIRED' && !!entry?.submissionId) && source.locale === 'fa-IR' ;
    const profile = p.user.userProfile;
    const birthDate = entry?.birthDate.toISOString().slice(0, 10) ?? null;
    const profileComplete = !!profile?.firstName?.trim() && !!profile.lastName?.trim() && (profile.gender === 'FEMALE' || profile.gender === 'MALE') && !!birthDate;
    const needsProfile = !profileComplete;
    const required = needsProfile || assessmentRequired && !entry?.deferredAt;
    const amount=entry?.amountRial??(entry?.submissionId?0n:policy?.amountRial??0n);
    const pendingRows=assessmentRequired&&entry?await tx.$queryRaw<{id:string}[]>(Prisma.sql`SELECT i.id FROM billing_intents i WHERE i.patient_id=${p.id}::uuid AND i.clinic_id=${p.clinicId}::uuid AND i.purpose='ENTRY_ASSESSMENT' AND i.status='PENDING' AND (i.expires_at>CURRENT_TIMESTAMP OR EXISTS(SELECT 1 FROM billing_gateway_attempts a WHERE a.intent_id=i.id AND a.status IN('CREATED','REDIRECT_READY','VERIFYING','REQUIRES_RECONCILIATION'))) ORDER BY i.created_at DESC LIMIT 1`):[];
    const pending=pendingRows[0];
    return {
      amountRial:amount.toString(),allowDeferral:!!policy?.allowDeferral&&amount>0n,reminder:assessmentRequired&&!!entry?.deferredAt,intentId:pending?.id??entry?.paidIntentId??null,
      introduction: (!entry?.assessmentVersionId || entry.assessmentVersionId === policy?.assessmentVersionId ? policy?.introduction?.trim() : null) || defaultIntroduction,
      required, assessmentRequired, phase: !required ? 'COMPLETE' : needsProfile ? 'PROFILE' : readableResult ? 'RESULT' : !available ? 'UNAVAILABLE' : amount>0n&&!entry?.paidIntentId ? 'PAYMENT' : 'ASSESSMENT',
      assessmentVersionId: sourceId, assessmentTitle: source?.title ?? null, submissionId: entry?.submissionId ?? null,
      firstName: profile?.firstName ?? null, lastName: profile?.lastName ?? null, gender: profile?.gender === 'FEMALE' || profile?.gender === 'MALE' ? profile.gender : null, birthDate,
    };
  }

  async saveProfile(userId: string, body: EntryProfileDto, ctx: EntryActor) {
    const firstName = body.firstName.trim().replace(/\s+/g, ' '); const lastName = body.lastName.trim().replace(/\s+/g, ' ');
    const date = new Date(`${body.birthDate}T00:00:00.000Z`); const now = new Date();
    if (!firstName || !lastName || !['FEMALE', 'MALE'].includes(body.gender) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.birthDate || date > now || date.getUTCFullYear() < now.getUTCFullYear() - 130) throw new UnprocessableEntityException({ code: 'ENTRY_PROFILE_INVALID', message: 'Valid name, gender, and birth date required.', details: {} });
    await this.prisma.$transaction(async tx => {
      const pointer = await this.patient(userId, tx); await this.lock(tx, pointer.id);
      await this.lockPolicy(tx, pointer.clinicId);
      const p = await this.patient(userId, tx);
      const state = await this.status(userId, tx); if (!state.required) return;
      if (state.submissionId && state.phase !== 'PROFILE') throw conflict();
      if (state.phase !== 'PROFILE' && state.phase !== 'ASSESSMENT' && state.phase !== 'PAYMENT') throw unavailable();
      await tx.userProfile.upsert({ where: { userId }, create: { userId, firstName, lastName, gender: body.gender }, update: { firstName, lastName, gender: body.gender } });
      const completedAt = p.entry?.completedAt ?? (!state.assessmentRequired && !state.submissionId ? new Date() : null);
      if (p.entry) await tx.patientEntry.update({ where: { patientId: p.id }, data: { birthDate: date, completedAt } });
      else await tx.patientEntry.create({ data: { patientId: p.id, clinicId: p.clinicId, birthDate: date, completedAt } });
      await this.audit(tx, 'PATIENT_ENTRY_PROFILE_SAVED', p.id, ctx);
    });
    return this.status(userId);
  }

  async start(userId: string, ctx: EntryActor) {
    await this.prisma.$transaction(async tx => {
      const pointer = await this.patient(userId, tx); await this.lock(tx, pointer.id);
      await this.lockPolicy(tx, pointer.clinicId);
      const p=await this.patient(userId,tx);
      const state = await this.status(userId, tx);
      if (!state.required || state.submissionId) return;
      if (state.phase !== 'ASSESSMENT' || !state.assessmentVersionId) throw unavailable();
      // Existing engine owns revision/idempotency and source locks; retries recover its saved attempt.
      await tx.patientEntry.update({where:{patientId:p.id},data:{assessmentVersionId:state.assessmentVersionId,amountRial:p.entry?.amountRial??p.clinic.entryPolicy?.amountRial??0n}});
      const submission = await this.assessments.start(state.assessmentVersionId, userId, ctx, p.id, tx);
      await tx.patientEntry.update({ where: { patientId: p.id }, data: { assessmentVersionId: state.assessmentVersionId, submissionId: submission.id } });
      await this.audit(tx, 'PATIENT_ENTRY_STARTED', p.id, ctx);
    }, { timeout: 30_000 });
    return this.status(userId);
  }

  async payment(userId:string,key:string|undefined,ctx:EntryActor){
    const state=await this.status(userId);
    if(!state.assessmentRequired||!['PAYMENT','COMPLETE'].includes(state.phase)||state.amountRial==='0')throw conflict();
    if(state.intentId)return this.billing.get(userId,state.intentId);
    return this.billing.create(userId,'ENTRY_ASSESSMENT',{},key,ctx);
  }
  async defer(userId:string,ctx:EntryActor){
    await this.prisma.$transaction(async tx=>{const p=await this.patient(userId,tx);await this.lock(tx,p.id);await this.lockPolicy(tx,p.clinicId);const state=await this.status(userId,tx);
      if(!state.assessmentRequired||!state.allowDeferral||state.phase==='PROFILE'||!p.entry)throw conflict();
      await tx.patientEntry.update({where:{patientId:p.id},data:{deferredAt:p.entry.deferredAt??new Date()}});await this.audit(tx,'PATIENT_ENTRY_DEFERRED',p.id,ctx);
    });return this.status(userId);
  }
  async resume(userId:string,ctx:EntryActor){await this.prisma.$transaction(async tx=>{const p=await this.patient(userId,tx);await this.lock(tx,p.id);if(p.entry&&!p.entry.completedAt){await tx.patientEntry.update({where:{patientId:p.id},data:{deferredAt:null}});await this.audit(tx,'PATIENT_ENTRY_RESUMED',p.id,ctx);}});return this.status(userId);}

  async complete(userId: string, ctx: EntryActor) {
    await this.prisma.$transaction(async tx => {
      const p = await this.patient(userId, tx); await this.lock(tx, p.id);
      await this.lockPolicy(tx, p.clinicId);
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
    return { amountRial:(policy?.amountRial??0n).toString(),allowDeferral:policy?.allowDeferral??false,introduction: policy?.introduction ?? null, enabled: policy?.enabled ?? false, assessmentVersionId: policy?.assessmentVersionId ?? null, assessmentTitle: policy?.assessmentVersion?.title ?? null, revision: policy?.revision ?? 0, enforcedFrom: policy?.enforcedFrom ?? null };
  }
  async updatePolicy(body: EntryPolicyUpdateDto, ctx: EntryActor) {
    await this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM clinics WHERE id=${clinic.id}::uuid FOR SHARE`);
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'entry-policy:' + clinic.id},0))`);
      const previous = await tx.patientEntryPolicy.findUnique({ where: { clinicId: clinic.id } });
      if ((previous?.revision ?? 0) !== body.expectedRevision) throw conflict();
      if (body.enabled && !body.assessmentVersionId) throw unavailable();
      if (body.assessmentVersionId && (body.enabled || body.assessmentVersionId !== previous?.assessmentVersionId)) {
        const source = await tx.assessmentVersion.findFirst({ where: { id: body.assessmentVersionId, clinicId: clinic.id, status: 'PUBLISHED', locale: 'fa-IR' }, select: { structure: true } });
        if (!source || (source.structure as { schemaVersion?: number }).schemaVersion === 2) throw new ConflictException({ code: 'ENTRY_UNAVAILABLE', message: 'یک آزمون منتشرشدهٔ فارسی انتخاب کنید.', details: {} });
      }
      if(body.amountRial!==undefined&&BigInt(body.amountRial)>9_000_000_000_000_000_000n)throw conflict();
      const data = { amountRial:body.amountRial===undefined?previous?.amountRial??0n:BigInt(body.amountRial),allowDeferral:body.allowDeferral??previous?.allowDeferral??false,introduction: body.introduction === undefined ? previous?.introduction ?? null : body.introduction?.trim() || null, enabled: body.enabled, assessmentVersionId: body.assessmentVersionId ?? null, enforcedFrom: previous?.enforcedFrom ?? (body.enabled ? new Date() : null), revision: (previous?.revision ?? 0) + 1 };
      if (previous) await tx.patientEntryPolicy.update({ where: { clinicId: clinic.id }, data });
      else await tx.patientEntryPolicy.create({ data: { clinicId: clinic.id, ...data } });
      await this.audit(tx, 'PATIENT_ENTRY_POLICY_UPDATED', clinic.id, ctx, { enabled: data.enabled, assessmentVersionId: data.assessmentVersionId, revision: data.revision, amountRial:data.amountRial.toString(),allowDeferral:data.allowDeferral,enforcedFrom: data.enforcedFrom?.toISOString() ?? null });
    });
    return this.policy();
  }
  private async lock(tx: Prisma.TransactionClient, patientId: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'patient-entry:' + patientId},0))`); }
  private async lockPolicy(tx: Prisma.TransactionClient, clinicId: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'entry-policy:' + clinicId},0))`); }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, ctx: EntryActor, metadata: Prisma.InputJsonValue = {}) {
    await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'PATIENT_ENTRY', subjectId, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata } });
  }
}
