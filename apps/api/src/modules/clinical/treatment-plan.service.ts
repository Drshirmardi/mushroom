import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';

import { ClinicStatus, PatientAccessAction, Prisma, TreatmentPlanState } from '../../generated/prisma/client';
import { ClinicalPermissionService, type ClinicalPermission } from '../../common/auth/clinical-permission.service';
import type { RoleCode } from '../../common/auth/authorization.policy';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { CreateTreatmentPlanDto, ExercisePlanDto, NutritionPlanDto, TreatmentMedicationDto, TreatmentSessionPlanDto, UpdateExercisePlanDto, UpdateNutritionPlanDto, UpdateTreatmentMedicationDto, UpdateTreatmentPlanDto, UpdateTreatmentSessionPlanDto } from './treatment-plan.dto';
import type { TreatmentReportingQueryDto } from './treatment-plan-response.dto';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from './clinical-access-audit.service';
import { ClinicalResourceAccessService } from './clinical-resource-access.service';
import { CustomProgramBoundaryService } from './custom-program-boundary.service';

type ClinicalActor = ClinicalAuditContext & { roles: RoleCode[] };
type Tx = Prisma.TransactionClient;

const forbidden = () => new ForbiddenException({ code: 'TREATMENT_PLAN_RESOURCE_FORBIDDEN', message: 'The treatment plan is not available to this actor.', details: {} });
const planNotEditable = () => new UnprocessableEntityException({ code: 'TREATMENT_PLAN_NOT_EDITABLE', message: 'Only draft or active treatment plans may be edited.', details: {} });
const stateTransitionInvalid = () => new UnprocessableEntityException({ code: 'TREATMENT_PLAN_STATE_INVALID', message: 'The requested treatment-plan state transition is not allowed.', details: {} });
const positionConflict = () => new ConflictException({ code: 'TREATMENT_SESSION_POSITION_CONFLICT', message: 'A session plan already uses this position.', details: {} });

const planInclude = {
  medications: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
  sessionPlans: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
  exercisePlans: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
  nutritionPlans: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.TreatmentPlanInclude;

@Injectable()
export class TreatmentPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClinicalResourceAccessService,
    private readonly permissions: ClinicalPermissionService,
    private readonly audit: ClinicalAccessAuditService,
    private readonly customPrograms: CustomProgramBoundaryService,
  ) {}

  async list(patientId: string, actor: ClinicalActor) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:view');
    return this.transaction(async (tx) => {
      const items = await tx.treatmentPlan.findMany({ where: { patientId: patient.id, clinicId: patient.clinicId, AND: await this.customPrograms.clinicianFilter(tx, patient.id, patient.clinicId, actor) }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], include: planInclude });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.READ, resourceType: 'TREATMENT_PLAN', resourceId: patient.id, metadata: { view: 'LIST' } }, actor, tx);
      return { items: items.map((plan) => this.response(plan)), nextCursor: null };
    });
  }
  async reportingContext(query: TreatmentReportingQueryDto) { const clinic = await this.prisma.clinic.findFirst({ where: { status: ClinicStatus.ACTIVE, ...(query.clinicId ? { id: query.clinicId } : {}) }, select: { id: true, timeZone: true } }); if (!clinic) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Clinic is unavailable.', details: {} }); const range = this.reportingRange(query.from, query.to, clinic.timeZone); const asOf = new Date(); const activePlans = await this.prisma.treatmentPlan.count({ where: { clinicId: clinic.id, state: TreatmentPlanState.ACTIVE } }); return { clinicId: clinic.id, timeZone: clinic.timeZone, from: range.from, to: range.to, asOf, sourceStatus: 'current' as const, activePlans, start: range.start, end: range.end }; }

  async get(patientId: string, planId: string, actor: ClinicalActor) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:view');
    return this.transaction(async (tx) => {
      const plan = await this.plan(tx, planId, patient.id, patient.clinicId);
      await this.customPrograms.clinician(tx, plan.id, actor);
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.READ, resourceType: 'TREATMENT_PLAN', resourceId: plan.id, metadata: { view: 'DETAIL' } }, actor, tx);
      return this.response(plan);
    });
  }

  async create(patientId: string, input: CreateTreatmentPlanDto, actor: ClinicalActor) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:edit');
    return this.transaction(tx => this.createDraftInTransaction(tx, patient, input, actor));
  }

  async createDraftInTransaction(tx: Tx, patient: { id: string; clinicId: string }, input: CreateTreatmentPlanDto, actor: ClinicalActor, at?: Date) {
    this.uniquePositions(input.sessionPlans ?? []);
    const stamp = at ? { createdAt: at, updatedAt: at } : {};
      const plan = await tx.treatmentPlan.create({
        data: {
          clinicId: patient.clinicId,
          patientId: patient.id,
          title: this.optional(input.title),
          ...stamp,
          medications: input.medications?.length ? { create: input.medications.map((item) => ({ ...this.medication(item), ...stamp })) } : undefined,
          sessionPlans: input.sessionPlans?.length ? { create: input.sessionPlans.map((item) => ({ ...this.session(item), ...stamp })) } : undefined,
          exercisePlans: input.exercisePlans?.length ? { create: input.exercisePlans.map((item) => ({ ...this.exercise(item), ...stamp })) } : undefined,
          nutritionPlans: input.nutritionPlans?.length ? { create: input.nutritionPlans.map((item) => ({ ...this.nutrition(item), ...stamp })) } : undefined,
        },
        include: planInclude,
      });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.CREATE, resourceType: 'TREATMENT_PLAN', resourceId: plan.id, metadata: { sessionPlanCount: plan.sessionPlans.length, medicationCount: plan.medications.length, exercisePlanCount: plan.exercisePlans.length, nutritionPlanCount: plan.nutritionPlans.length } }, actor, tx);
      return this.response(plan);
  }

  /** Caller must establish exact custom request authority and audit within this same transaction. */
  async readExactInTransaction(tx: Tx, planId: string, patientId: string, clinicId: string) { return this.response(await this.plan(tx, planId, patientId, clinicId)); }

  async update(patientId: string, planId: string, input: UpdateTreatmentPlanDto, actor: ClinicalActor) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:edit');
    return this.transaction(async (tx) => {
      let plan = await this.plan(tx, planId, patient.id, patient.clinicId);
      const bound = await this.customPrograms.clinician(tx, plan.id, actor, input.title !== undefined || input.state !== 'COMPLETED');
      if (bound) plan = await this.plan(tx, planId, patient.id, patient.clinicId);
      this.editable(plan.state);
      const state = input.state ? this.transition(plan.state, input.state) : undefined;
      const updated = await tx.treatmentPlan.update({ where: { id: plan.id }, data: { ...(input.title === undefined ? {} : { title: this.text(input.title) }), ...(state ? { state } : {}), ...(bound ? { updatedAt: await this.customPrograms.time(tx) } : {}) }, include: planInclude });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.UPDATE, resourceType: 'TREATMENT_PLAN', resourceId: plan.id, metadata: { changedState: state ?? null, changedTitle: input.title !== undefined } }, actor, tx);
      return this.response(updated);
    });
  }

  async createMedication(patientId: string, planId: string, input: TreatmentMedicationDto, actor: ClinicalActor) {
    return this.medicationResponse(await this.createChild(patientId, planId, input, actor, 'TREATMENT_MEDICATION', (tx, plan) => tx.treatmentMedication.create({ data: { treatmentPlanId: plan.id, ...this.medication(input) } })));
  }

  async updateMedication(patientId: string, planId: string, medicationId: string, input: UpdateTreatmentMedicationDto, actor: ClinicalActor) {
    return this.medicationResponse(await this.updateChild(patientId, planId, medicationId, input, actor, 'TREATMENT_MEDICATION', async (tx, plan) => {
      const item = await tx.treatmentMedication.findFirst({ where: { id: medicationId, treatmentPlanId: plan.id } });
      if (!item) throw forbidden();
      return tx.treatmentMedication.update({ where: { id: item.id }, data: { ...(input.name === undefined ? {} : { name: this.text(input.name) }), ...(input.dosage === undefined ? {} : { dosage: this.optional(input.dosage) }), ...(input.instructions === undefined ? {} : { instructions: this.optional(input.instructions) }) } });
    }));
  }

  async createSessionPlan(patientId: string, planId: string, input: TreatmentSessionPlanDto, actor: ClinicalActor) {
    return this.sessionPlanResponse(await this.createChild(patientId, planId, input, actor, 'TREATMENT_SESSION_PLAN', async (tx, plan) => {
      await this.availablePosition(tx, plan.id, input.position);
      return tx.treatmentSessionPlan.create({ data: { treatmentPlanId: plan.id, ...this.session(input) } });
    }));
  }

  async updateSessionPlan(patientId: string, planId: string, sessionId: string, input: UpdateTreatmentSessionPlanDto, actor: ClinicalActor) {
    return this.sessionPlanResponse(await this.updateChild(patientId, planId, sessionId, input, actor, 'TREATMENT_SESSION_PLAN', async (tx, plan) => {
      const item = await tx.treatmentSessionPlan.findFirst({ where: { id: sessionId, treatmentPlanId: plan.id } });
      if (!item) throw forbidden();
      if (input.position !== undefined) await this.availablePosition(tx, plan.id, input.position, item.id);
      return tx.treatmentSessionPlan.update({ where: { id: item.id }, data: { ...(input.position === undefined ? {} : { position: input.position }), ...(input.title === undefined ? {} : { title: this.text(input.title) }), ...(input.goals === undefined ? {} : { goals: this.goals(input.goals) }), ...(input.instructions === undefined ? {} : { instructions: this.optional(input.instructions) }), ...(input.patientInstructions === undefined ? {} : { patientInstructions: this.optional(input.patientInstructions) }) } });
    }));
  }

  async createExercisePlan(patientId: string, planId: string, input: ExercisePlanDto, actor: ClinicalActor) {
    return this.exercisePlanResponse(await this.createChild(patientId, planId, input, actor, 'EXERCISE_PLAN', (tx, plan) => tx.exercisePlan.create({ data: { treatmentPlanId: plan.id, ...this.exercise(input) } })));
  }

  async updateExercisePlan(patientId: string, planId: string, exerciseId: string, input: UpdateExercisePlanDto, actor: ClinicalActor) {
    return this.exercisePlanResponse(await this.updateChild(patientId, planId, exerciseId, input, actor, 'EXERCISE_PLAN', async (tx, plan) => {
      const item = await tx.exercisePlan.findFirst({ where: { id: exerciseId, treatmentPlanId: plan.id } });
      if (!item) throw forbidden();
      return tx.exercisePlan.update({ where: { id: item.id }, data: { ...(input.title === undefined ? {} : { title: this.text(input.title) }), ...(input.instructions === undefined ? {} : { instructions: this.optional(input.instructions) }) } });
    }));
  }

  async createNutritionPlan(patientId: string, planId: string, input: NutritionPlanDto, actor: ClinicalActor) {
    return this.nutritionPlanResponse(await this.createChild(patientId, planId, input, actor, 'NUTRITION_PLAN', (tx, plan) => tx.nutritionPlan.create({ data: { treatmentPlanId: plan.id, ...this.nutrition(input) } })));
  }

  async updateNutritionPlan(patientId: string, planId: string, nutritionId: string, input: UpdateNutritionPlanDto, actor: ClinicalActor) {
    return this.nutritionPlanResponse(await this.updateChild(patientId, planId, nutritionId, input, actor, 'NUTRITION_PLAN', async (tx, plan) => {
      const item = await tx.nutritionPlan.findFirst({ where: { id: nutritionId, treatmentPlanId: plan.id } });
      if (!item) throw forbidden();
      return tx.nutritionPlan.update({ where: { id: item.id }, data: { ...(input.title === undefined ? {} : { title: this.text(input.title) }), ...(input.instructions === undefined ? {} : { instructions: this.optional(input.instructions) }) } });
    }));
  }

  async listPatient(userId: string, context: ClinicalAuditContext) {
    return this.patientRead(userId, context);
  }

  async getPatient(userId: string, planId: string, context: ClinicalAuditContext) {
    const result = await this.patientRead(userId, context, planId);
    if ('items' in result) return result.items.find((item) => item.id === planId) ?? forbidden();
    return result;
  }

  private async patientRead(userId: string, context: ClinicalAuditContext, planId?: string) {
    return this.transaction(async (tx) => {
      const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
      if (!patient) throw forbidden();
      if (planId) await this.customPrograms.patient(tx, planId, context);
      const where = { patientId: patient.id, clinicId: patient.clinicId, state: { in: [TreatmentPlanState.ACTIVE, TreatmentPlanState.COMPLETED] }, ...(planId ? { id: planId } : {}), AND: await this.customPrograms.patientFilter(tx, patient.id, patient.clinicId, context) };
      const plans = await tx.treatmentPlan.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], include: planInclude });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.READ, resourceType: 'PATIENT_TREATMENT_PLAN', resourceId: planId, metadata: { view: planId ? 'DETAIL' : 'LIST' } }, context, tx);
      const items = plans.map((plan) => this.response(plan));
      return planId ? (items[0] ?? forbidden()) : { items, nextCursor: null };
    });
  }

  private async createChild<T>(patientId: string, planId: string, input: unknown, actor: ClinicalActor, resourceType: string, create: (tx: Tx, plan: Awaited<ReturnType<TreatmentPlanService['plan']>>) => Promise<T>) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:edit');
    return this.transaction(async (tx) => {
      const plan = await this.plan(tx, planId, patient.id, patient.clinicId);
      await this.customPrograms.clinician(tx, plan.id, actor, true);
      this.editable(plan.state);
      const item = await create(tx, plan);
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.CREATE, resourceType, resourceId: this.id(item), metadata: { treatmentPlanId: plan.id } }, actor, tx);
      return item;
    });
  }

  private async updateChild<T>(patientId: string, planId: string, itemId: string, input: unknown, actor: ClinicalActor, resourceType: string, update: (tx: Tx, plan: Awaited<ReturnType<TreatmentPlanService['plan']>>) => Promise<T>) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:edit');
    return this.transaction(async (tx) => {
      const plan = await this.plan(tx, planId, patient.id, patient.clinicId);
      await this.customPrograms.clinician(tx, plan.id, actor, true);
      this.editable(plan.state);
      const item = await update(tx, plan);
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.UPDATE, resourceType, resourceId: this.id(item), metadata: { treatmentPlanId: plan.id } }, actor, tx);
      return item;
    });
  }

  private async authorize(patientId: string, actor: ClinicalActor, permission: ClinicalPermission) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    if (!await this.permissions.allows(actor.roles, [permission])) throw forbidden();
    return patient;
  }

  private async plan(tx: Tx, planId: string, patientId: string, clinicId: string) {
    const plan = await tx.treatmentPlan.findFirst({ where: { id: planId, patientId, clinicId }, include: planInclude });
    if (!plan) throw forbidden();
    return plan;
  }

  private async availablePosition(tx: Tx, treatmentPlanId: string, position: number, exceptId?: string) {
    const conflict = await tx.treatmentSessionPlan.findFirst({ where: { treatmentPlanId, position, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (conflict) throw positionConflict();
  }

  private transaction<T>(action: (tx: Tx) => Promise<T>) {
    return this.prisma.$transaction(action).catch((cause: unknown) => {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') throw positionConflict();
      throw cause;
    });
  }

  private transition(from: TreatmentPlanState, to: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'VOIDED') {
    if (from === to) return to;
    if (from === TreatmentPlanState.DRAFT && (to === TreatmentPlanState.ACTIVE || to === TreatmentPlanState.VOIDED)) return to;
    if (from === TreatmentPlanState.ACTIVE && (to === TreatmentPlanState.COMPLETED || to === TreatmentPlanState.VOIDED)) return to;
    throw stateTransitionInvalid();
  }

  private editable(state: TreatmentPlanState) { if (state !== TreatmentPlanState.DRAFT && state !== TreatmentPlanState.ACTIVE) throw planNotEditable(); }
  private medication(input: TreatmentMedicationDto) { return { name: this.text(input.name), dosage: this.optional(input.dosage), instructions: this.optional(input.instructions) }; }
  private session(input: TreatmentSessionPlanDto) { return { position: input.position, title: this.text(input.title), goals: this.goals(input.goals), instructions: this.optional(input.instructions), patientInstructions: this.optional(input.patientInstructions) }; }
  private exercise(input: ExercisePlanDto) { return { title: this.text(input.title), instructions: this.optional(input.instructions) }; }
  private nutrition(input: NutritionPlanDto) { return { title: this.text(input.title), instructions: this.optional(input.instructions) }; }
  private goals(values: string[]) { return values.map((value) => this.text(value)); }
  private text(value: string) { const text = value.trim(); if (!text) throw new UnprocessableEntityException({ code: 'TREATMENT_PLAN_TEXT_REQUIRED', message: 'Treatment-plan text must not be blank.', details: {} }); return text; }
  private optional(value: string | undefined) { if (value === undefined) return null; const text = value.trim(); return text || null; }
  private uniquePositions(sessions: TreatmentSessionPlanDto[]) { if (new Set(sessions.map(({ position }) => position)).size !== sessions.length) throw positionConflict(); }
  private id(value: unknown) { if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string') throw new Error('Treatment-plan resource identifier is unavailable.'); return value.id; }
  private medicationResponse(item: { id: string; name: string; dosage: string | null; instructions: string | null; createdAt: Date; updatedAt: Date }) { return { id: item.id, name: item.name, dosage: item.dosage, instructions: item.instructions, createdAt: item.createdAt, updatedAt: item.updatedAt }; }
  private sessionPlanResponse(item: { id: string; position: number; title: string; goals: string[]; instructions: string | null; patientInstructions: string | null; createdAt: Date; updatedAt: Date }) { return { id: item.id, position: item.position, title: item.title, goals: item.goals, instructions: item.instructions, patientInstructions: item.patientInstructions, createdAt: item.createdAt, updatedAt: item.updatedAt }; }
  private exercisePlanResponse(item: { id: string; title: string; instructions: string | null; createdAt: Date; updatedAt: Date }) { return { id: item.id, title: item.title, instructions: item.instructions, createdAt: item.createdAt, updatedAt: item.updatedAt }; }
  private nutritionPlanResponse(item: { id: string; title: string; instructions: string | null; createdAt: Date; updatedAt: Date }) { return { id: item.id, title: item.title, instructions: item.instructions, createdAt: item.createdAt, updatedAt: item.updatedAt }; }
  private response(plan: Prisma.TreatmentPlanGetPayload<{ include: typeof planInclude }>) { return { id: plan.id, patientId: plan.patientId, state: plan.state, title: plan.title, medications: plan.medications.map(({ id, name, dosage, instructions, createdAt, updatedAt }) => ({ id, name, dosage, instructions, createdAt, updatedAt })), sessionPlans: plan.sessionPlans.map(({ id, position, title, goals, instructions, patientInstructions, createdAt, updatedAt }) => ({ id, position, title, goals, instructions, patientInstructions, createdAt, updatedAt })), exercisePlans: plan.exercisePlans.map(({ id, title, instructions, createdAt, updatedAt }) => ({ id, title, instructions, createdAt, updatedAt })), nutritionPlans: plan.nutritionPlans.map(({ id, title, instructions, createdAt, updatedAt }) => ({ id, title, instructions, createdAt, updatedAt })), createdAt: plan.createdAt, updatedAt: plan.updatedAt }; }
  private reportingRange(fromValue: string | undefined, toValue: string | undefined, timeZone: string) { const today = this.localDay(new Date(), timeZone); const initial = new Date(`${today}T00:00:00.000Z`); initial.setUTCDate(initial.getUTCDate() - 29); const from = fromValue ?? initial.toISOString().slice(0, 10); const to = toValue ?? today; this.validDate(from); this.validDate(to); if (from > to) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Date range is invalid.', details: {} }); const days = Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000) + 1; if (days > 366) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Date range exceeds 366 days.', details: {} }); const [year, month, day] = from.split('-').map(Number); const end = new Date(`${to}T00:00:00.000Z`); end.setUTCDate(end.getUTCDate() + 1); return { from, to, start: this.zonedMidnight(year, month, day, timeZone), end: this.zonedMidnight(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), timeZone) }; }
  private validDate(value: string) { const date = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Date is invalid.', details: {} }); }
  private localDay(value: Date, timeZone: string) { const parts = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value); const part = (kind: string) => parts.find((item) => item.type === kind)?.value; return `${part('year')}-${part('month')}-${part('day')}`; }
  private zonedMidnight(year: number, month: number, day: number, timeZone: string) { let value = Date.UTC(year, month - 1, day); for (let attempt = 0; attempt < 3; attempt += 1) { const parts = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)); const part = (kind: string) => Number(parts.find((item) => item.type === kind)?.value); value += Date.UTC(year, month - 1, day) - Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second')); } return new Date(value); }
}
