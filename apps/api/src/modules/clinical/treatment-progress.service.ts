import { ForbiddenException, Injectable } from '@nestjs/common';

import { PatientAccessAction, Prisma, TreatmentPlanState, TreatmentTaskState } from '../../generated/prisma/client';
import type { RoleCode } from '../../common/auth/authorization.policy';
import { ClinicalPermissionService } from '../../common/auth/clinical-permission.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from './clinical-access-audit.service';
import { ClinicalResourceAccessService } from './clinical-resource-access.service';
import { CustomProgramBoundaryService } from './custom-program-boundary.service';

type ClinicalActor = ClinicalAuditContext & { roles: RoleCode[] };
type Tx = Prisma.TransactionClient;
const forbidden = () => new ForbiddenException({ code: 'TREATMENT_PROGRESS_RESOURCE_FORBIDDEN', message: 'The treatment progress is not available to this actor.', details: {} });

@Injectable()
export class TreatmentProgressService {
  constructor(private readonly prisma: PrismaService, private readonly access: ClinicalResourceAccessService, private readonly permissions: ClinicalPermissionService, private readonly audit: ClinicalAccessAuditService, private readonly customPrograms: CustomProgramBoundaryService) {}

  async admin(patientId: string, planId: string, actor: ClinicalActor, cursor?: string, limit = 50) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    if (!await this.permissions.allows(actor.roles, ['clinical:record:view'])) throw forbidden();
    return this.read(planId, patient.id, patient.clinicId, cursor, limit, actor, 'TREATMENT_PROGRESS', 'ADMIN_READ', false);
  }

  async patient(userId: string, planId: string, context: ClinicalAuditContext, cursor?: string, limit = 50) {
    const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    if (!patient) throw forbidden();
    return this.read(planId, patient.id, patient.clinicId, cursor, limit, context, 'PATIENT_TREATMENT_PROGRESS', 'PATIENT_READ', true);
  }

  private async read(planId: string, patientId: string, clinicId: string, cursor: string | undefined, requestedLimit: number, context: ClinicalAuditContext, resourceType: string, view: string, patientVisible: boolean) {
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.treatmentPlan.findFirst({ where: { id: planId, patientId, clinicId, ...(patientVisible ? { state: { in: [TreatmentPlanState.ACTIVE, TreatmentPlanState.COMPLETED] } } : {}) }, select: { id: true } });
      if (!plan) throw forbidden();
      if (patientVisible) await this.customPrograms.patient(tx, plan.id, context); else await this.customPrograms.clinician(tx, plan.id, context);
      const where = { treatmentPlanId: plan.id };
      const [totalTasks, completedTasks, records] = await Promise.all([
        tx.treatmentTask.count({ where: { ...where, state: { not: TreatmentTaskState.CANCELLED } } }),
        tx.treatmentTask.count({ where: { ...where, state: TreatmentTaskState.COMPLETED } }),
        tx.treatmentProgressEvent.findMany({ where, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) }),
      ]);
      const hasNext = records.length > limit;
      const events = hasNext ? records.slice(0, limit) : records;
      await this.audit.record({ clinicId, patientId, action: PatientAccessAction.READ, resourceType, resourceId: plan.id, metadata: { view } }, context, tx);
      return { treatmentPlanId: plan.id, percentage: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100), completedTasks, totalTasks, timeline: events.map((event) => ({ id: event.id, treatmentPlanId: event.treatmentPlanId, treatmentTaskId: event.treatmentTaskId, eventType: event.eventType as 'TASK_COMPLETED' | 'MEDICATION_ADHERENCE_RECORDED', occurredAt: event.occurredAt })), nextCursor: hasNext ? events.at(-1)?.id ?? null : null };
    });
  }
}
