import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type Appointment, type AppointmentStatus } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { ClinicalAccessAuditService } from '../../clinical/clinical-access-audit.service';
import { AdminAppointmentsService } from '../admin-appointments.service';
import type { AssignedAppointmentDto, AssignedAppointmentQueryDto, AssignedConsultationContextDto } from './assigned-appointment.dto';
type Tx = Prisma.TransactionClient;
type Actor = { clinicId: string; doctorId: string; canEdit: boolean };
const missing = () => new NotFoundException({ code: 'ASSIGNED_CONSULTATION_NOT_FOUND', message: 'Assigned consultation unavailable.', details: {} });
const forbidden = () => new ForbiddenException({ code: 'FORBIDDEN', message: 'Current assigned physician clinical capability required.', details: {} });
const select = { id: true, clinicId: true, doctorId: true, patientId: true, doctorServiceId: true, status: true, startsAt: true, endsAt: true, startedAt: true, completedAt: true,
  patient: { select: { user: { select: { userProfile: { select: { firstName: true, lastName: true } } } } } },
  doctorService: { select: { visitMode: true, service: { select: { name: true } } } }, encounter: { select: { id: true, state: true } }, chatConversation: { select: { id: true, patientId: true, doctorId: true, clinicId: true } },
} satisfies Prisma.AppointmentSelect;
type Row = Prisma.AppointmentGetPayload<{ select: typeof select }>;

@Injectable()
export class AssignedAppointmentService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly audit: ClinicalAccessAuditService, private readonly operations: AdminAppointmentsService) {}
  async list(query: AssignedAppointmentQueryDto, ctx: Context) {
    const offset = (query.page - 1) * query.pageSize; if (!Number.isSafeInteger(offset) || offset > 2_147_483_647) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Pagination offset exceeds the supported range.', details: {} });
    return this.prisma.$transaction(async tx => {
      const actor = await this.actor(tx, ctx), range = await this.range(tx, query);
      const dates: Prisma.AppointmentWhereInput = query.from || query.to ? { startsAt: { gte: range.from, lt: range.to } } : { OR: [{ startsAt: { gte: range.from, lt: range.to } }, { status: { in: ['CHECKED_IN', 'QUEUED', 'IN_PROGRESS'] }, startsAt: { lt: range.to }, endsAt: { gte: new Date(range.now.getTime() - 4 * 3_600_000) } }] };
      const where: Prisma.AppointmentWhereInput = { clinicId: actor.clinicId, doctorId: actor.doctorId, patient: { user: { status: 'ACTIVE' } }, status: query.status ?? { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS'] }, ...dates };
      const [rows, total] = await Promise.all([tx.appointment.findMany({ where, select, orderBy: query.status === 'QUEUED' ? [{ queuedAt: 'asc' }, { id: 'asc' }] : [{ startsAt: 'asc' }, { id: 'asc' }], skip: offset, take: query.pageSize }), tx.appointment.count({ where })]);
      await this.audit.recordMany(rows.map(row => ({ clinicId: row.clinicId, patientId: row.patientId, action: 'READ' as const, resourceType: 'ASSIGNED_APPOINTMENT_WORKLIST', resourceId: row.id, metadata: {} })), ctx, tx);
      return { items: rows.map(row => this.view(row)), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => { const actor = await this.actor(tx, ctx), row = await this.owned(tx, id, actor); const response = await this.context(tx, row, actor); await this.audit.record({ clinicId: row.clinicId, patientId: row.patientId, action: 'READ', resourceType: 'ASSIGNED_CONSULTATION_CONTEXT', resourceId: id, metadata: {} }, ctx, tx); return response; }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async transition(id: string, operation: 'START' | 'COMPLETE', ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.actor(tx, ctx, true); await this.owned(tx, id, actor); let from: AppointmentStatus | undefined;
      const authorize = async (current: Tx, appointment: Appointment) => {
        if (appointment.clinicId !== actor.clinicId || appointment.doctorId !== actor.doctorId) throw missing();
        const live = await current.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id WHERE p.id=${appointment.patientId}::uuid AND p.clinic_id=${actor.clinicId}::uuid AND u.status='ACTIVE' FOR SHARE OF p,u`); if (!live.length) throw missing();
        from = appointment.status;
        if (!(operation === 'COMPLETE' && appointment.status === 'COMPLETED') && !await this.open(current, appointment)) throw new ConflictException({ code: 'APPOINTMENT_CHANGE_NOT_ALLOWED', message: 'The consultation window is unavailable.', details: {} });
      };
      if (operation === 'START') await this.operations.startInTransaction(tx, ctx.actorUserId, id, authorize); else await this.operations.completeInTransaction(tx, ctx.actorUserId, id, authorize);
      const row = await this.owned(tx, id, actor), response = await this.context(tx, row, actor);
      await this.audit.record({ clinicId: row.clinicId, patientId: row.patientId, action: from === row.status ? 'READ' : 'UPDATE', resourceType: `ASSIGNED_CONSULTATION_${operation}`, resourceId: id, metadata: { status: row.status } }, ctx, tx); return response;
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  private async actor(tx: Tx, ctx: Context, edit = false): Promise<Actor> {
    const clinicId = await this.authority.scope(tx, 'doctor', ctx), doctorId = await this.authority.doctor(tx, clinicId, ctx.actorUserId, true);
    const specialties = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT s.id FROM doctor_specialties ds JOIN specialties s ON s.id=ds.specialty_id AND s.clinic_id=ds.clinic_id WHERE ds.doctor_id=${doctorId}::uuid AND ds.clinic_id=${clinicId}::uuid AND s.is_active AND s.publication_status='PUBLISHED' AND s.published_at IS NOT NULL FOR SHARE OF ds,s`); if (!specialties.length) throw forbidden();
    const grants = await tx.$queryRaw<{ permission: string }[]>(Prisma.sql`SELECT permission.permission FROM user_roles ur JOIN roles role ON role.id=ur.role_id JOIN clinical_role_permissions permission ON permission.role_id=role.id WHERE ur.user_id=${ctx.actorUserId}::uuid AND role.code='DOCTOR' AND permission.permission IN('CLINICAL_RECORD_VIEW','CLINICAL_RECORD_EDIT') FOR SHARE OF ur,role,permission`);
    const values = new Set(grants.map(g => g.permission)); if (!values.has('CLINICAL_RECORD_VIEW') || edit && !values.has('CLINICAL_RECORD_EDIT')) throw forbidden(); return { clinicId, doctorId, canEdit: values.has('CLINICAL_RECORD_EDIT') };
  }
  private async owned(tx: Tx, id: string, actor: Actor) { const row = await tx.appointment.findFirst({ where: { id, clinicId: actor.clinicId, doctorId: actor.doctorId, patient: { user: { status: 'ACTIVE' } } }, select }); if (!row) throw missing(); return row; }
  private view(row: Row): AssignedAppointmentDto { const name = row.patient.user.userProfile; return { id: row.id, patientId: row.patientId, patientDisplayName: [name?.firstName, name?.lastName].filter(Boolean).join(' ') || null, doctorServiceId: row.doctorServiceId, serviceName: row.doctorService.service.name, visitMode: row.doctorService.visitMode, status: row.status, startsAt: row.startsAt, endsAt: row.endsAt, startedAt: row.startedAt, completedAt: row.completedAt }; }
  private async context(tx: Tx, row: Row, actor: Actor): Promise<AssignedConsultationContextDto> {
    const [window, busy, sharing] = await Promise.all([this.open(tx, row), tx.appointment.count({ where: { clinicId: actor.clinicId, doctorId: actor.doctorId, status: 'IN_PROGRESS', id: { not: row.id } } }), tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM assessment_care_shares WHERE appointment_id=${row.id}::uuid AND patient_id=${row.patientId}::uuid AND doctor_id=${actor.doctorId}::uuid AND clinic_id=${actor.clinicId}::uuid AND withdrawn_at IS NULL AND assessment_care_share_current(id,true)) AS allowed`)]);
    const conversation = row.chatConversation; const same = conversation && conversation.patientId === row.patientId && conversation.doctorId === actor.doctorId && conversation.clinicId === actor.clinicId;
    return { ...this.view(row), canStart: actor.canEdit && window && !busy && ['CHECKED_IN', 'QUEUED'].includes(row.status), canComplete: actor.canEdit && window && !busy && row.status === 'IN_PROGRESS' && row.encounter?.state === 'IN_PROGRESS', canOpenAssessmentContext: !!sharing[0]?.allowed, encounter: row.encounter, textConsultationSupported: row.doctorService.visitMode === 'ONLINE', conversationId: row.doctorService.visitMode === 'ONLINE' && same ? conversation.id : null, voiceSupported: false, videoSupported: false };
  }
  private async open(tx: Tx, appointment: { status: AppointmentStatus; startsAt: Date; endsAt: Date }) {
    if (!['CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS'].includes(appointment.status)) return false;
    // Clinical transitions retain their existing time bounds. Chat closure is
    // evaluated independently by ChatService through the explicit close action.
    const grace = appointment.status === 'CONFIRMED' ? 60 : 240;
    const [clock] = await tx.$queryRaw<{ open: boolean }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP>=${appointment.startsAt}::timestamptz-INTERVAL '15 minutes' AND CURRENT_TIMESTAMP<=${appointment.endsAt}::timestamptz+${grace}*INTERVAL '1 minute' AS open`); return !!clock?.open;
  }
  private async range(tx: Tx, query: AssignedAppointmentQueryDto) {
    const [clock] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`), day = 86_400_000;
    const from = query.from ? new Date(query.from) : new Date(query.to ? Date.parse(query.to) - 31 * day : clock!.now.getTime() - 4 * 3_600_000);
    const to = query.to ? new Date(query.to) : new Date(query.from ? from.getTime() + 31 * day : clock!.now.getTime() + 31 * day);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from || to.getTime() - from.getTime() > 93 * day) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'A valid UTC range of at most93 days is required.', details: {} }); return { from, to, now: clock!.now };
  }
}
