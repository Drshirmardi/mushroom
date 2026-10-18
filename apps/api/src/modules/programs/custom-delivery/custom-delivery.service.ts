import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type CustomProgramPlanVersion } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { financialKey, fingerprint, lockFinancial, type Tx } from '../../billing/billing.policy';
import { ClinicalAccessAuditService } from '../../clinical/clinical-access-audit.service';
import { TreatmentPlanService } from '../../clinical/treatment-plan.service';
import type { CreateTreatmentPlanDto } from '../../clinical/treatment-plan.dto';
import { ReminderService } from '../../outbox/reminder.service';
import { ProgramPurchaseService } from '../purchases/program-purchase.service';
import type { CustomDeliveryQueryDto, CustomPlanCreateDto, CustomPlanIssueDto, CustomPlanRevokeDto } from './custom-delivery.dto';
const missing = () => new NotFoundException({ code: 'CUSTOM_PROGRAM_DELIVERY_NOT_FOUND', message: 'Owned delivery or assigned care unavailable.', details: {} });
const conflict = () => new ConflictException({ code: 'CUSTOM_PROGRAM_DELIVERY_CONFLICT', message: 'Exact paid care, intake or clinical version changed.', details: {} });
const include = { definition: true, patient: { select: { user: { select: { userProfile: { select: { firstName: true, lastName: true } } } } } } } satisfies Prisma.CustomProgramRequestInclude;
type Request = Prisma.CustomProgramRequestGetPayload<{ include: typeof include }>;

@Injectable()
export class CustomDeliveryService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly purchases: ProgramPurchaseService, private readonly plans: TreatmentPlanService, private readonly audit: ClinicalAccessAuditService, private readonly reminders: ReminderService) {}
  async own(requestId: string, q: CustomDeliveryQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.purchases.patient(tx, ctx), request = await tx.customProgramRequest.findFirst({ where: { id: requestId, patientId: p.id, clinicId: p.clinicId }, include }); if (!request) throw missing();
      const [state] = await tx.$queryRaw<{ entitled: boolean; care: boolean; source: boolean; professional: boolean }[]>(Prisma.sql`SELECT custom_program_request_paid(${requestId}::uuid) AS entitled,EXISTS(SELECT 1 FROM custom_program_care_authorizations a WHERE a.request_id=${requestId}::uuid AND custom_program_care_current(a.id)) AS care,custom_program_request_source_current(${requestId}::uuid) AS source,custom_program_doctor_ready(${request.doctorId}::uuid) AS professional`);
      const intake = await this.intake(tx, requestId), where = { requestId, issuedAt: { not: null } }, [rows, total, latest] = await Promise.all([tx.customProgramPlanVersion.findMany({ where, orderBy: { versionNumber: 'desc' }, take: q.pageSize, skip: (q.page - 1)*q.pageSize }), tx.customProgramPlanVersion.count({ where }), tx.customProgramPlanVersion.findFirst({ where, orderBy: { versionNumber: 'desc' } })]);
      const blockers = [...(!state!.care ? ['CUSTOM_PROGRAM_CARE_REQUIRED'] : []), ...(!state!.source ? ['CUSTOM_PROGRAM_SOURCE_UNAVAILABLE'] : []), ...(!state!.professional ? ['CUSTOM_PROGRAM_PROFESSIONAL_UNAVAILABLE'] : []), ...(!intake ? ['CURRENT_COMPLETED_INTAKE_REQUIRED'] : [])];
      const deliveryState = !state!.entitled ? 'UNPAID' : latest?.status === 'REVOKED' ? 'CLINICALLY_REVOKED' : latest?.status === 'ISSUED' ? 'DELIVERED' : !state!.care ? 'AWAITING_CARE' : !state!.source || !state!.professional ? 'PROFESSIONAL_UNAVAILABLE' : !intake ? 'AWAITING_INTAKE' : 'IN_PREPARATION';
      await this.record(tx, request, 'READ', 'CUSTOM_PROGRAM_DELIVERY', requestId, ctx);
      return { requestId, entitled: state!.entitled, deliveryState, blockers, currentVersion: latest ? this.version(latest, latest.id) : null, items: rows.map(v => this.version(v, latest?.id)), total, page: q.page, pageSize: q.pageSize };
    }, { timeout: 15_000 });
  }
  async ownVersion(requestId: string, id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.purchases.patient(tx, ctx), request = await tx.customProgramRequest.findFirst({ where: { id: requestId, patientId: p.id, clinicId: p.clinicId }, include }); if (!request) throw missing();
      const row = await tx.customProgramPlanVersion.findFirst({ where: { id, requestId, patientId: p.id, clinicId: p.clinicId, issuedAt: { not: null } } }); if (!row) throw missing();
      const latest = await this.latestIssued(tx, requestId); await this.record(tx, request, 'READ', 'CUSTOM_PROGRAM_PATIENT_PLAN', id, ctx);
      return { ...this.version(row, latest?.id), plan: row.status === 'ISSUED' ? await this.plans.readExactInTransaction(tx, row.treatmentPlanId, p.id, p.clinicId) : null };
    }, { timeout: 15_000 });
  }
  async worklist(q: CustomDeliveryQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.actor(tx, ctx);
      const candidates = Prisma.sql`FROM custom_program_requests r WHERE r.clinic_id=${actor.clinicId}::uuid AND r.doctor_id=${actor.doctorId}::uuid AND custom_program_clinician_current(r.id,${ctx.actorUserId}::uuid,${ctx.actorSessionId}::uuid)`;
      const ids = await tx.$queryRaw<{ id: string; total: bigint }[]>(Prisma.sql`SELECT r.id,count(*) OVER() AS total ${candidates} ORDER BY r.created_at DESC,r.id DESC LIMIT ${q.pageSize} OFFSET ${(q.page-1)*q.pageSize}`);
      const total = ids[0]?.total ?? (await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT count(*) AS total ${candidates}`))[0]!.total;
      const rows: Request[] = [];
      for (const id of ids.map(r => r.id).sort()) { const row = await this.clinical(tx, id, ctx); rows.push(row); }
      for (const row of rows) await this.record(tx, row, 'READ', 'CUSTOM_PROGRAM_ASSIGNED_WORKLIST', row.id, ctx);
      // Empty worklists still have a minimal actor audit without a patient identifier.
      if (!rows.length) await tx.auditEvent.create({ data: { action: 'CUSTOM_PROGRAM_WORKLIST_READ', subjectType: 'DOCTOR', subjectId: actor.doctorId, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0,128), ipAddress: ctx.ipAddress, metadata: {} } });
      return { items: ids.map(i => this.requestView(rows.find(r => r.id === i.id)!)), total: Number(total), page: q.page, pageSize: q.pageSize };
    }, { timeout: 15_000 });
  }
  async context(requestId: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const r = await this.clinical(tx, requestId, ctx), intake = await this.intake(tx, requestId, true), care = await this.currentCare(tx, requestId), latest = await tx.customProgramPlanVersion.findFirst({ where: { requestId }, orderBy: { versionNumber: 'desc' } });
      await this.record(tx, r, 'READ', 'CUSTOM_PROGRAM_ASSIGNED_CONTEXT', requestId, ctx);
      return { ...this.requestView(r), careAuthorizationId: care!.id, intake: intake ? this.intakeView(intake) : null, latestVersionNumber: latest?.versionNumber ?? 0, preparationAvailable: !!intake, blockers: intake ? [] : ['CURRENT_COMPLETED_INTAKE_REQUIRED'] };
    }, { timeout: 15_000 });
  }
  async clinicalVersion(requestId: string, id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => { const r = await this.clinical(tx, requestId, ctx), v = await this.ownedVersion(tx, requestId, id), latest = await this.latestIssued(tx, requestId); await this.record(tx, r, 'READ', 'CUSTOM_PROGRAM_CLINICAL_PLAN', id, ctx); return { ...this.version(v, latest?.id), bodyAvailable: true, plan: await this.plans.readExactInTransaction(tx, v.treatmentPlanId, r.patientId, r.clinicId) }; }, { timeout: 15_000 });
  }
  async clinicalHistory(requestId: string, q: CustomDeliveryQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => { const r = await this.clinical(tx, requestId, ctx), [rows,total,latest] = await Promise.all([tx.customProgramPlanVersion.findMany({ where: { requestId }, orderBy: { versionNumber: 'desc' }, take: q.pageSize, skip: (q.page-1)*q.pageSize }), tx.customProgramPlanVersion.count({ where: { requestId } }), this.latestIssued(tx, requestId)]); await this.record(tx, r, 'READ', 'CUSTOM_PROGRAM_CLINICAL_HISTORY', requestId, ctx); return { items: rows.map(v => ({ ...this.version(v, latest?.id), bodyAvailable: true })), total, page: q.page, pageSize: q.pageSize }; }, { timeout: 15_000 });
  }
  async create(requestId: string, body: CustomPlanCreateDto, rawKey: string | undefined, ctx: Context) {
    const key = financialKey(rawKey), careId = body.careAuthorizationId.toLowerCase(), intakeId = body.sourceIntakeRevisionId.toLowerCase(), plan = this.planPayload(body.plan), hash = fingerprint({ requestId: requestId.toLowerCase(), careId, intakeId, expectedVersionNumber: body.expectedVersionNumber, plan });
    return this.prisma.$transaction(async tx => {
      const r = await this.clinical(tx, requestId, ctx), old = await tx.customProgramPlanVersion.findUnique({ where: { requestId_idempotencyKey: { requestId, idempotencyKey: key } } });
      if (old) { if (old.payloadHash !== hash) throw conflict(); await this.record(tx, r, 'READ', 'CUSTOM_PROGRAM_CLINICAL_PLAN', old.id, ctx); return { ...this.version(old, (await this.latestIssued(tx, requestId))?.id), bodyAvailable: true, plan: await this.plans.readExactInTransaction(tx, old.treatmentPlanId, r.patientId, r.clinicId) }; }
      const latest = await tx.customProgramPlanVersion.findFirst({ where: { requestId }, orderBy: { versionNumber: 'desc' } }), care = await this.currentCare(tx, requestId), intake = await this.intake(tx, requestId, true);
      if ((latest?.versionNumber ?? 0) !== body.expectedVersionNumber || care?.id !== careId || intake?.id !== intakeId) throw conflict();
      if (!body.plan.title?.trim() && !['medications','sessionPlans','exercisePlans','nutritionPlans'].some(k => (body.plan[k as keyof CreateTreatmentPlanDto] as unknown[] | undefined)?.length)) throw conflict();
      const now = await this.time(tx, new Date(Math.max(r.createdAt.getTime(),latest?.createdAt.getTime() ?? 0))), native = await this.plans.createDraftInTransaction(tx, { id: r.patientId, clinicId: r.clinicId }, body.plan, { ...ctx, roles: ['DOCTOR'] }, now), [proof] = await tx.$queryRaw<{ hash: string }[]>(Prisma.sql`SELECT custom_program_native_hash(${native.id}::uuid) AS hash`);
      const version = await tx.customProgramPlanVersion.create({ data: { requestId, patientId: r.patientId, clinicId: r.clinicId, versionNumber: (latest?.versionNumber ?? 0)+1, treatmentPlanId: native.id, careAuthorizationId: careId, sourceIntakeRevisionId: intakeId, contentHash: proof!.hash, createdByUserId: ctx.actorUserId, createdSessionId: ctx.actorSessionId, idempotencyKey: key, payloadHash: hash, createdAt: now } });
      await this.record(tx, r, 'CREATE', 'CUSTOM_PROGRAM_PLAN_CREATE', version.id, ctx); return { ...this.version(version, (await this.latestIssued(tx, requestId))?.id), bodyAvailable: true, plan: native };
    }, { timeout: 15_000 });
  }
  async issue(requestId: string, id: string, body: CustomPlanIssueDto, key: string | undefined, ctx: Context) {
    if (body.reviewedPatientIntakeAndPlan !== true || body.noAutomatedTherapy !== true) throw conflict();
    return this.mutate(requestId, id, 'ISSUE', body, key, ctx, async (tx, r, v) => {
      const latest = await tx.customProgramPlanVersion.findFirst({ where: { requestId }, orderBy: { versionNumber: 'desc' } }), care = await this.currentCare(tx, requestId), intake = await this.intake(tx, requestId, true);
      if (v.status !== 'DRAFT' || latest?.id !== v.id || v.contentHash !== body.contentHash || care?.id !== v.careAuthorizationId || intake?.id !== v.sourceIntakeRevisionId) throw conflict();
      const now = await this.time(tx, v.createdAt), issued = await tx.customProgramPlanVersion.update({ where: { id }, data: { status: 'ISSUED', issuedAt: now, issuedByUserId: ctx.actorUserId, issuedSessionId: ctx.actorSessionId } });
      await tx.treatmentPlan.update({ where: { id: v.treatmentPlanId }, data: { state: 'ACTIVE', updatedAt: now } });
      const previous = await tx.customProgramPlanVersion.findMany({ where: { requestId, id: { not: id }, issuedAt: { not: null }, nativePlan: { state: { in: ['ACTIVE','COMPLETED'] } } }, orderBy: { versionNumber: 'asc' } });
      for (const old of previous) await this.voidNative(tx, old, now);
      await this.record(tx, r, 'UPDATE', 'CUSTOM_PROGRAM_PLAN_ISSUE', id, ctx); return issued;
    });
  }
  async revoke(requestId: string, id: string, body: CustomPlanRevokeDto, key: string | undefined, ctx: Context) {
    return this.mutate(requestId, id, 'REVOKE', body, key, ctx, async (tx, r, v) => {
      if (v.status === 'REVOKED') return v;
      const now = await this.time(tx, v.issuedAt ?? v.createdAt), revoked = await tx.customProgramPlanVersion.update({ where: { id }, data: { status: 'REVOKED', revokedAt: now, revokedByUserId: ctx.actorUserId, revokedSessionId: ctx.actorSessionId, revocationReason: body.reason } });
      await this.voidNative(tx, revoked, now); await this.record(tx, r, 'UPDATE', 'CUSTOM_PROGRAM_PLAN_REVOKE', id, ctx); return revoked;
    });
  }
  private async mutate(requestId: string, id: string, action: string, body: object, rawKey: string | undefined, ctx: Context, change: (tx: Tx, r: Request, v: CustomProgramPlanVersion) => Promise<CustomProgramPlanVersion>) {
    const input = action === 'ISSUE' ? { contentHash: (body as CustomPlanIssueDto).contentHash, reviewedPatientIntakeAndPlan: (body as CustomPlanIssueDto).reviewedPatientIntakeAndPlan, noAutomatedTherapy: (body as CustomPlanIssueDto).noAutomatedTherapy } : { reason: (body as CustomPlanRevokeDto).reason };
    const command = `custom-plan-${action.toLowerCase()}:`+fingerprint(financialKey(rawKey)), hash = fingerprint({ requestId: requestId.toLowerCase(), id: id.toLowerCase(), body: input });
    return this.prisma.$transaction(async tx => {
      await lockFinancial(tx, `custom-plan-command:${ctx.actorUserId}:${command}`);
      const r = await this.clinical(tx, requestId, ctx), v = await this.ownedVersion(tx, requestId, id), old = await tx.walletCommand.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: ctx.actorUserId, idempotencyKey: command } } });
      if (old && (old.fingerprint !== hash || (old.response as { versionId?: string }).versionId !== id)) throw conflict();
      const row = old ? v : await change(tx, r, v);
      if (!old) await tx.walletCommand.create({ data: { actorUserId: ctx.actorUserId, idempotencyKey: command, fingerprint: hash, response: { versionId: id } } });
      await this.record(tx, r, 'READ', 'CUSTOM_PROGRAM_CLINICAL_PLAN', id, ctx);
      return { ...this.version(row, (await this.latestIssued(tx, requestId))?.id), bodyAvailable: true, plan: await this.plans.readExactInTransaction(tx, row.treatmentPlanId, r.patientId, r.clinicId) };
    }, { timeout: 15_000 });
  }
  private async actor(tx: Tx, ctx: Context) {
    const clinicId = await this.authority.scope(tx, 'doctor', ctx), doctorId = await this.authority.doctor(tx, clinicId, ctx.actorUserId, true);
    if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_lock_professional(${doctorId}::uuid) AS ok`))[0]?.ok) throw new ForbiddenException({ code: 'CUSTOM_PROGRAM_CLINICAL_FORBIDDEN', message: 'Current qualified physician with explicit clinical capabilities required.', details: {} });
    return { clinicId, doctorId };
  }
  private async clinical(tx: Tx, requestId: string, ctx: Context) {
    if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_lock_clinician(${requestId}::uuid,${ctx.actorUserId}::uuid,${ctx.actorSessionId}::uuid) AS ok`))[0]?.ok) throw missing();
    const row = await tx.customProgramRequest.findUnique({ where: { id: requestId }, include }); if (!row) throw missing(); return row;
  }
  private async currentCare(tx: Tx, requestId: string) { const [r] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM custom_program_care_authorizations WHERE request_id=${requestId}::uuid AND custom_program_care_current(id) ORDER BY version_number DESC LIMIT 1`); return r; }
  private async ownedVersion(tx: Tx, requestId: string, id: string) { const v = await tx.customProgramPlanVersion.findFirst({ where: { id, requestId } }); if (!v) throw missing(); return v; }
  private latestIssued(tx: Tx, requestId: string) { return tx.customProgramPlanVersion.findFirst({ where: { requestId, issuedAt: { not: null } }, orderBy: { versionNumber: 'desc' } }); }
  private async intake(tx: Tx, requestId: string, lock = false) {
    const request = await tx.customProgramRequest.findUniqueOrThrow({ where: { id: requestId }, select: { patientId: true, clinicId: true } });
    if (lock) {
      // Existing intake writes acquire the active medical policy before consent and parent rows.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE clinic_id=${request.clinicId}::uuid AND policy_key='MEDICAL_INTAKE_PROCESSING' AND status='ACTIVE' ORDER BY id FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_medical_intakes WHERE patient_id=${request.patientId}::uuid AND clinic_id=${request.clinicId}::uuid FOR SHARE`);
    }
    const i = await tx.patientMedicalIntake.findUnique({ where: { patientId: request.patientId }, include: { revisions: { where: { revisionState: 'COMPLETE' }, orderBy: { revisionNumber: 'desc' }, take: 1 } } }), v = i?.revisions[0];
    if (!v) return null;
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT r.id FROM patient_medical_intake_revisions r JOIN patient_consent_records c ON c.id=r.completed_consent_record_id WHERE r.id=${v.id}::uuid FOR SHARE OF r,c`);
    if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_intake_current(${requestId}::uuid,${v.id}::uuid) AS ok`))[0]?.ok) return null;
    return v;
  }
  private intakeView(v: NonNullable<Awaited<ReturnType<CustomDeliveryService['intake']>>>) { return { id: v.id, revisionNumber: v.revisionNumber, dataOrigin: v.dataOrigin, completedAt: v.completedAt!, snapshot: { birthDate: v.birthDate?.toISOString().slice(0,10) ?? null, sexAtBirth: v.sexAtBirth, heightCm: v.heightCm, weightKg: v.weightKg ? Number(v.weightKg) : null, bloodType: v.bloodType, allergyReport: v.allergyReport, chronicConditionReport: v.chronicConditionReport, currentMedicationReport: v.currentMedicationReport, sleepDurationBand: v.sleepDurationBand, exerciseFrequency: v.exerciseFrequency, stressLevel: v.stressLevel, tobaccoUse: v.tobaccoUse } }; }
  private requestView(r: Request) { const profile = r.patient.user.userProfile; return { id: r.id, patientId: r.patientId, patientDisplayName: [profile?.firstName,profile?.lastName].filter(Boolean).join(' ') || null, title: r.definition.title, createdAt: r.createdAt }; }
  private version(v: CustomProgramPlanVersion, currentId?: string) { return { id: v.id, requestId: v.requestId, versionNumber: v.versionNumber, treatmentPlanId: v.treatmentPlanId, contentHash: v.contentHash, status: v.status, createdAt: v.createdAt, issuedAt: v.issuedAt, revokedAt: v.revokedAt, current: v.id === currentId && v.status === 'ISSUED', bodyAvailable: v.status === 'ISSUED' }; }
  private planPayload(p: CreateTreatmentPlanDto) { return { title: p.title ?? null, medications: p.medications?.map(m => ({ name: m.name, dosage: m.dosage ?? null, instructions: m.instructions ?? null })) ?? [], sessionPlans: p.sessionPlans?.map(s => ({ position: s.position, title: s.title, goals: s.goals, instructions: s.instructions ?? null, patientInstructions: s.patientInstructions ?? null })) ?? [], exercisePlans: p.exercisePlans?.map(e => ({ title: e.title, instructions: e.instructions ?? null })) ?? [], nutritionPlans: p.nutritionPlans?.map(n => ({ title: n.title, instructions: n.instructions ?? null })) ?? [] }; }
  private async voidNative(tx: Tx, v: CustomProgramPlanVersion, at: Date) {
    const native = await tx.treatmentPlan.findUniqueOrThrow({ where: { id: v.treatmentPlanId }, select: { state: true } });
    if (native.state !== 'VOIDED') await tx.treatmentPlan.update({ where: { id: v.treatmentPlanId }, data: { state: 'VOIDED', updatedAt: at } });
    const tasks = await tx.treatmentTask.findMany({ where: { treatmentPlanId: v.treatmentPlanId, state: 'SCHEDULED' }, select: { id: true } });
    if (tasks.length) await tx.treatmentTask.updateMany({ where: { id: { in: tasks.map(t => t.id) } }, data: { state: 'CANCELLED', updatedAt: at } });
    for (const task of tasks) await this.reminders.cancelTreatmentTask(tx, task.id, 'Custom clinical version superseded or revoked');
  }
  private async time(tx: Tx, floor?: Date | null) { return (await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${floor ?? null}::timestamptz) AS now`))[0]!.now; }
  private async record(tx: Tx, r: Request, action: 'READ'|'CREATE'|'UPDATE', resourceType: string, id: string, ctx: Context) { await this.audit.record({ clinicId: r.clinicId, patientId: r.patientId, action, resourceType, resourceId: id, metadata: {} }, ctx, tx); await tx.auditEvent.create({ data: { action: resourceType, subjectType: 'CUSTOM_PROGRAM_DELIVERY', subjectId: id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0,128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}
