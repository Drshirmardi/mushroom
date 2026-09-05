import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { HealthObservationMetric, HealthObservationUnit, PatientAccessAction, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from '../../clinical/clinical-access-audit.service';
import { ClinicalResourceAccessService } from '../../clinical/clinical-resource-access.service';

type Context = ClinicalAuditContext;
const invalid = () => new UnprocessableEntityException({ code: 'HEALTH_OBSERVATION_INVALID', message: 'The health observation does not match its approved metric contract.', details: {} });
const forbidden = () => new ForbiddenException({ code: 'HEALTH_OBSERVATION_FORBIDDEN', message: 'The health observation is not available to this actor.', details: {} });

@Injectable()
export class HealthObservationsService {
  constructor(private readonly prisma: PrismaService, private readonly access: ClinicalResourceAccessService, private readonly audit: ClinicalAccessAuditService) {}

  async create(userId: string, input: { metric: string; value: number; observedAt: string }, context: Context) {
    const patient = await this.patient(userId); const metric = this.metric(input.metric); const value = this.value(metric, input.value); const observedAt = new Date(input.observedAt);
    if (Number.isNaN(observedAt.getTime())) throw invalid();
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.healthObservation.create({ data: { clinicId: patient.clinicId, patientId: patient.id, metric, unit: this.unit(metric), value, observedAt } });
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.CREATE, resourceType: 'HEALTH_OBSERVATION', resourceId: item.id, metadata: { metric } }, context, tx);
      return this.response(item);
    });
  }

  async own(userId: string, query: { metric?: string; from?: string; to?: string; cursor?: string; limit?: number }, context: Context) {
    const patient = await this.patient(userId); return this.list(patient.id, patient.clinicId, query, context, 'PATIENT_HEALTH_OBSERVATION');
  }
  async admin(patientId: string, userId: string, query: { metric?: string; from?: string; to?: string; cursor?: string; limit?: number }, context: Context) {
    const patient = await this.access.patient(userId, patientId); return this.list(patient.id, patient.clinicId, query, context, 'HEALTH_OBSERVATION');
  }

  private async list(patientId: string, clinicId: string, query: { metric?: string; from?: string; to?: string; cursor?: string; limit?: number }, context: Context, resourceType: string) {
    const limit = query.limit === undefined ? 50 : query.limit; if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid();
    const metric = query.metric === undefined ? undefined : this.metric(query.metric); const from = query.from ? new Date(query.from) : undefined; const to = query.to ? new Date(query.to) : undefined; if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) throw invalid(); const cursor = query.cursor ? await this.prisma.healthObservation.findFirst({ where: { id: query.cursor, patientId, clinicId }, select: { observedAt: true, id: true } }) : null;
    if (query.cursor && !cursor) throw invalid();
    const where: Prisma.HealthObservationWhereInput = { patientId, clinicId, ...(metric ? { metric } : {}), ...(from || to ? { observedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(cursor ? { OR: [{ observedAt: { gt: cursor.observedAt } }, { observedAt: cursor.observedAt, id: { gt: cursor.id } }] } : {}) };
    return this.prisma.$transaction(async (tx) => { const items = await tx.healthObservation.findMany({ where, orderBy: [{ observedAt: 'asc' }, { id: 'asc' }], take: limit + 1 }); const page = items.slice(0, limit); await this.audit.record({ clinicId, patientId, action: PatientAccessAction.READ, resourceType, metadata: { metric: metric ?? 'ALL' } }, context, tx); return { items: page.map((item) => this.response(item)), nextCursor: items.length > limit ? page.at(-1)?.id ?? null : null }; });
  }
  private async patient(userId: string) { const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } }); if (!patient) throw forbidden(); return patient; }
  private metric(value: string): HealthObservationMetric { if (!Object.values(HealthObservationMetric).includes(value as HealthObservationMetric)) throw invalid(); return value as HealthObservationMetric; }
  private unit(metric: HealthObservationMetric) { return metric === 'MOOD' ? HealthObservationUnit.SCORE_5 : metric === 'SLEEP_HOURS' ? HealthObservationUnit.HOURS : metric === 'WEIGHT' ? HealthObservationUnit.KILOGRAMS : HealthObservationUnit.SCORE_10; }
  private value(metric: HealthObservationMetric, value: number) { if (!Number.isFinite(value)) throw invalid(); const [min, max, integer] = metric === 'PAIN' ? [1, 10, true] : metric === 'MOOD' ? [1, 5, true] : metric === 'SLEEP_HOURS' ? [0, 12, false] : metric === 'WEIGHT' ? [2, 500, false] : [0, 10, true]; if (value < min || value > max || (integer && !Number.isInteger(value))) throw invalid(); return value; }
  private response(item: { id: string; metric: HealthObservationMetric; unit: HealthObservationUnit; value: { toString(): string }; observedAt: Date; createdAt: Date }) { return { id: item.id, metric: item.metric, unit: item.unit, value: Number(item.value.toString()), observedAt: item.observedAt, createdAt: item.createdAt }; }
}
