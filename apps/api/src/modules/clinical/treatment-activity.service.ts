import { ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';

import { PatientAccessAction, Prisma, TreatmentPlanState, TreatmentTaskState } from '../../generated/prisma/client';
import type { RoleCode } from '../../common/auth/authorization.policy';
import { ClinicalPermissionService, type ClinicalPermission } from '../../common/auth/clinical-permission.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { CreateTreatmentTaskDto, RecordMedicationAdherenceDto, RescheduleTreatmentTaskDto } from './treatment-activity.dto';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from './clinical-access-audit.service';
import { ClinicalResourceAccessService } from './clinical-resource-access.service';

type ClinicalActor = ClinicalAuditContext & { roles: RoleCode[] };
type Tx = Prisma.TransactionClient;
type TaskKind = 'MEDICATION' | 'EXERCISE';

const forbidden = () => new ForbiddenException({ code: 'TREATMENT_TASK_RESOURCE_FORBIDDEN', message: 'The treatment task is not available to this actor.', details: {} });
const inactivePlan = () => new UnprocessableEntityException({ code: 'TREATMENT_TASK_PLAN_INACTIVE', message: 'Treatment tasks may be scheduled only for an active treatment plan.', details: {} });
const scheduleInvalid = () => new UnprocessableEntityException({ code: 'TREATMENT_TASK_SCHEDULE_INVALID', message: 'A treatment task must be scheduled in the future.', details: {} });
const taskStateInvalid = () => new UnprocessableEntityException({ code: 'TREATMENT_TASK_STATE_INVALID', message: 'The requested treatment-task transition is not allowed.', details: {} });
const adherenceTaskInvalid = () => new UnprocessableEntityException({ code: 'TREATMENT_ADHERENCE_TASK_INVALID', message: 'The medication adherence task must be a matching medication task.', details: {} });
const idempotencyRequired = () => new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'An Idempotency-Key header is required for medication adherence.', details: {} });
const idempotencyReused = () => new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'The Idempotency-Key has already been used for a different treatment record.', details: {} });

@Injectable()
export class TreatmentActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClinicalResourceAccessService,
    private readonly permissions: ClinicalPermissionService,
    private readonly audit: ClinicalAccessAuditService,
  ) {}

  async listAdmin(patientId: string, planId: string, actor: ClinicalActor) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:view');
    return this.transaction(async (tx) => {
      await this.plan(tx, planId, patient.id, patient.clinicId);
      const items = await tx.treatmentTask.findMany({ where: { treatmentPlanId: planId }, orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }] });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.READ, resourceType: 'TREATMENT_TASK', resourceId: planId, metadata: { view: 'ADMIN_LIST' } }, actor, tx);
      return { items: items.map((item) => this.taskResponse(item)), nextCursor: null };
    });
  }

  async createTask(patientId: string, planId: string, input: CreateTreatmentTaskDto, actor: ClinicalActor) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:edit');
    const scheduledFor = this.future(input.scheduledFor);
    return this.transaction(async (tx) => {
      const plan = await this.plan(tx, planId, patient.id, patient.clinicId);
      if (plan.state !== TreatmentPlanState.ACTIVE) throw inactivePlan();
      const task = await tx.treatmentTask.create({ data: { treatmentPlanId: plan.id, kind: input.kind, scheduledFor } });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.CREATE, resourceType: 'TREATMENT_TASK', resourceId: task.id, metadata: { treatmentPlanId: plan.id, kind: task.kind } }, actor, tx);
      return this.taskResponse(task);
    });
  }

  async rescheduleTask(patientId: string, planId: string, taskId: string, input: RescheduleTreatmentTaskDto, actor: ClinicalActor) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:edit');
    const scheduledFor = this.future(input.scheduledFor);
    return this.transaction(async (tx) => {
      const plan = await this.plan(tx, planId, patient.id, patient.clinicId);
      if (plan.state !== TreatmentPlanState.ACTIVE) throw inactivePlan();
      const task = await this.task(tx, taskId, plan.id);
      if (task.state !== TreatmentTaskState.SCHEDULED) throw taskStateInvalid();
      const updated = await tx.treatmentTask.update({ where: { id: task.id }, data: { scheduledFor } });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.UPDATE, resourceType: 'TREATMENT_TASK', resourceId: task.id, metadata: { treatmentPlanId: plan.id, action: 'RESCHEDULE' } }, actor, tx);
      return this.taskResponse(updated);
    });
  }

  async cancelTask(patientId: string, planId: string, taskId: string, actor: ClinicalActor) {
    const patient = await this.authorize(patientId, actor, 'clinical:record:edit');
    return this.transaction(async (tx) => {
      const plan = await this.plan(tx, planId, patient.id, patient.clinicId);
      const task = await this.task(tx, taskId, plan.id);
      if (task.state !== TreatmentTaskState.SCHEDULED) throw taskStateInvalid();
      const updated = await tx.treatmentTask.update({ where: { id: task.id }, data: { state: TreatmentTaskState.CANCELLED } });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.UPDATE, resourceType: 'TREATMENT_TASK', resourceId: task.id, metadata: { treatmentPlanId: plan.id, action: 'CANCEL' } }, actor, tx);
      return this.taskResponse(updated);
    });
  }

  async listPatient(userId: string, context: ClinicalAuditContext) {
    return this.transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      const items = await tx.treatmentTask.findMany({ where: { treatmentPlan: { patientId: patient.id, clinicId: patient.clinicId, state: { in: [TreatmentPlanState.ACTIVE, TreatmentPlanState.COMPLETED] } }, state: { not: TreatmentTaskState.CANCELLED } }, orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }] });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.READ, resourceType: 'PATIENT_TREATMENT_TASK', metadata: { view: 'LIST' } }, context, tx);
      return { items: items.map((item) => this.taskResponse(item)), nextCursor: null };
    });
  }

  async completeTask(userId: string, taskId: string, context: ClinicalAuditContext) {
    return this.transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      const task = await tx.treatmentTask.findFirst({ where: { id: taskId, treatmentPlan: { patientId: patient.id, clinicId: patient.clinicId, state: { in: [TreatmentPlanState.ACTIVE, TreatmentPlanState.COMPLETED] } } } });
      if (!task) throw forbidden();
      if (task.state === TreatmentTaskState.COMPLETED) return this.taskResponse(task);
      if (task.state !== TreatmentTaskState.SCHEDULED) throw taskStateInvalid();
      const completedAt = new Date();
      const result = await tx.treatmentTask.updateMany({ where: { id: task.id, state: TreatmentTaskState.SCHEDULED }, data: { state: TreatmentTaskState.COMPLETED, completedAt } });
      const current = await tx.treatmentTask.findUniqueOrThrow({ where: { id: task.id } });
      if (result.count === 0) {
        if (current.state === TreatmentTaskState.COMPLETED) return this.taskResponse(current);
        throw taskStateInvalid();
      }
      await tx.treatmentProgressEvent.create({ data: { treatmentPlanId: current.treatmentPlanId, treatmentTaskId: current.id, eventType: 'TASK_COMPLETED', occurredAt: current.completedAt ?? completedAt, metadata: { source: 'TREATMENT_TASK' } } });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.UPDATE, resourceType: 'PATIENT_TREATMENT_TASK', resourceId: current.id, metadata: { action: 'COMPLETE', treatmentPlanId: current.treatmentPlanId } }, context, tx);
      return this.taskResponse(current);
    });
  }

  async recordMedicationAdherence(userId: string, medicationId: string, input: RecordMedicationAdherenceDto, idempotencyKey: string | string[] | undefined, context: ClinicalAuditContext) {
    const key = this.key(idempotencyKey);
    return this.transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      const medication = await tx.treatmentMedication.findFirst({ where: { id: medicationId, treatmentPlan: { patientId: patient.id, clinicId: patient.clinicId, state: TreatmentPlanState.ACTIVE } } });
      if (!medication) throw forbidden();
      const taskId = input.treatmentTaskId ?? null;
      if (taskId) {
        const task = await tx.treatmentTask.findFirst({ where: { id: taskId, treatmentPlanId: medication.treatmentPlanId, kind: 'MEDICATION', state: { not: TreatmentTaskState.CANCELLED } }, select: { id: true } });
        if (!task) throw adherenceTaskInvalid();
      }
      const existing = await tx.medicationAdherenceLog.findUnique({ where: { idempotencyKey: key } });
      if (existing) return this.idempotentAdherence(existing, medication.id, taskId);
      try {
        const adherence = await tx.medicationAdherenceLog.create({ data: { treatmentMedicationId: medication.id, treatmentTaskId: taskId, idempotencyKey: key } });
        await tx.treatmentProgressEvent.create({ data: { treatmentPlanId: medication.treatmentPlanId, treatmentTaskId: taskId, eventType: 'MEDICATION_ADHERENCE_RECORDED', occurredAt: adherence.recordedAt, metadata: { source: 'MEDICATION_ADHERENCE' } } });
        await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.CREATE, resourceType: 'MEDICATION_ADHERENCE', resourceId: adherence.id, metadata: { treatmentPlanId: medication.treatmentPlanId, treatmentTaskId: taskId } }, context, tx);
        return this.adherenceResponse(adherence);
      } catch (cause) {
        if (!(cause instanceof Prisma.PrismaClientKnownRequestError) || cause.code !== 'P2002') throw cause;
        const replay = await tx.medicationAdherenceLog.findUnique({ where: { idempotencyKey: key } });
        if (!replay) throw cause;
        return this.idempotentAdherence(replay, medication.id, taskId);
      }
    });
  }

  private async authorize(patientId: string, actor: ClinicalActor, permission: ClinicalPermission) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    if (!await this.permissions.allows(actor.roles, [permission])) throw forbidden();
    return patient;
  }

  private async patient(tx: Tx, userId: string) {
    const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    if (!patient) throw forbidden();
    return patient;
  }

  private async plan(tx: Tx, planId: string, patientId: string, clinicId: string) {
    const plan = await tx.treatmentPlan.findFirst({ where: { id: planId, patientId, clinicId } });
    if (!plan) throw forbidden();
    return plan;
  }

  private async task(tx: Tx, taskId: string, treatmentPlanId: string) {
    const task = await tx.treatmentTask.findFirst({ where: { id: taskId, treatmentPlanId } });
    if (!task) throw forbidden();
    return task;
  }

  private future(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime()) || date <= new Date()) throw scheduleInvalid(); return date; }
  private key(value: string | string[] | undefined) { const key = Array.isArray(value) ? value[0] : value; if (!key || !key.trim() || key.trim().length > 255) throw idempotencyRequired(); return key.trim(); }
  private idempotentAdherence(existing: { treatmentMedicationId: string; treatmentTaskId: string | null; id: string; recordedAt: Date; createdAt: Date }, medicationId: string, taskId: string | null) { if (existing.treatmentMedicationId !== medicationId || existing.treatmentTaskId !== taskId) throw idempotencyReused(); return this.adherenceResponse(existing); }
  private taskResponse(task: { id: string; treatmentPlanId: string; kind: string; scheduledFor: Date; state: TreatmentTaskState; completedAt: Date | null; createdAt: Date; updatedAt: Date }) { return { id: task.id, treatmentPlanId: task.treatmentPlanId, kind: task.kind as TaskKind, scheduledFor: task.scheduledFor, state: task.state, completedAt: task.completedAt, createdAt: task.createdAt, updatedAt: task.updatedAt }; }
  private adherenceResponse(log: { id: string; treatmentMedicationId: string; treatmentTaskId: string | null; recordedAt: Date; createdAt: Date }) { return { id: log.id, treatmentMedicationId: log.treatmentMedicationId, treatmentTaskId: log.treatmentTaskId, recordedAt: log.recordedAt, createdAt: log.createdAt }; }
  private transaction<T>(action: (tx: Tx) => Promise<T>) { return this.prisma.$transaction(action); }
}
