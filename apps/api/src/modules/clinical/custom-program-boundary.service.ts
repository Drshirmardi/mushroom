import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { ClinicalAuditContext } from './clinical-access-audit.service';
type Tx = Prisma.TransactionClient;
const forbidden = () => new ForbiddenException({ code: 'CUSTOM_PROGRAM_CLINICAL_FORBIDDEN', message: 'Assigned current custom care or owned issued plan required.', details: {} });
@Injectable()
export class CustomProgramBoundaryService {
  async clinician(tx: Tx, planId: string, ctx: ClinicalAuditContext, contentMutation = false) {
    const v = await tx.customProgramPlanVersion.findUnique({ where: { treatmentPlanId: planId }, select: { requestId: true } });
    if (!v) return false;
    if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_lock_clinician(${v.requestId}::uuid,${ctx.actorUserId}::uuid,${ctx.actorSessionId}::uuid) AS ok`))[0]?.ok) throw forbidden();
    if (contentMutation) throw new ConflictException({ code: 'CUSTOM_PROGRAM_PLAN_IMMUTABLE', message: 'Bound custom advice requires a new exact reviewed version.', details: {} });
    return true;
  }
  async patient(tx: Tx, planId: string, ctx: ClinicalAuditContext) {
    const v = await tx.customProgramPlanVersion.findUnique({ where: { treatmentPlanId: planId }, select: { id: true } });
    if (!v) return false;
    if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_native_patient_allowed(${planId}::uuid,${ctx.actorUserId}::uuid,${ctx.actorSessionId}::uuid) AS ok`))[0]?.ok) throw forbidden();
    return true;
  }
  async time(tx: Tx) { return (await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now; }
  async clinicianFilter(tx: Tx, patientId: string, clinicId: string, ctx: ClinicalAuditContext): Promise<Prisma.TreatmentPlanWhereInput> {
    const rows = await tx.$queryRaw<{ id: string; ok: boolean }[]>(Prisma.sql`SELECT r.id,custom_program_lock_clinician(r.id,${ctx.actorUserId}::uuid,${ctx.actorSessionId}::uuid) AS ok FROM custom_program_requests r WHERE r.patient_id=${patientId}::uuid AND r.clinic_id=${clinicId}::uuid AND EXISTS(SELECT 1 FROM custom_program_plan_versions v WHERE v.request_id=r.id) ORDER BY r.id`);
    return { OR: [{ customProgramVersion: { is: null } }, { customProgramVersion: { is: { requestId: { in: rows.filter(r => r.ok).map(r => r.id) } } } }] };
  }
  async patientFilter(tx: Tx, patientId: string, clinicId: string, ctx: ClinicalAuditContext): Promise<Prisma.TreatmentPlanWhereInput> {
    const rows = await tx.$queryRaw<{ id: string; ok: boolean }[]>(Prisma.sql`SELECT v.treatment_plan_id AS id,custom_program_native_patient_allowed(v.treatment_plan_id,${ctx.actorUserId}::uuid,${ctx.actorSessionId}::uuid) AS ok FROM custom_program_requests r JOIN custom_program_plan_versions v ON v.request_id=r.id JOIN treatment_plans native ON native.id=v.treatment_plan_id WHERE r.patient_id=${patientId}::uuid AND r.clinic_id=${clinicId}::uuid AND v.status='ISSUED' AND v.revoked_at IS NULL AND native.state IN('ACTIVE','COMPLETED') ORDER BY v.request_id,v.version_number`);
    return { OR: [{ customProgramVersion: { is: null } }, { id: { in: rows.filter(r => r.ok).map(r => r.id) } }] };
  }
}
