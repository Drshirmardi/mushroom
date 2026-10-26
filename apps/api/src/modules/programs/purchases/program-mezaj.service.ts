import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { resolveMezajRecommendationSource } from '../../assessments/domain/mezaj-recommendation-source';
import { ProgramPurchaseService } from './program-purchase.service';
import type { MezajProgramRecommendationsDto, ProgramMezajDto, SaveProgramMezajDto } from './program-mezaj.dto';
import type { ProgramPurchaseQueryDto } from './program-purchase.dto';

@Injectable()
export class ProgramMezajService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly purchases: ProgramPurchaseService) {}
  async owned(query: ProgramPurchaseQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.purchases.patient(tx, ctx);
      const where = { patientId: p.id, clinicId: p.clinicId, purchase: { customRequestId: null } };
      const [grants, total] = await Promise.all([tx.programAccessGrant.findMany({ where, include: { purchase: { include: { definition: { include: { mezajPresentation: true } } } } }, orderBy: [{ grantedAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.programAccessGrant.count({ where })]);
      const states = grants.length ? await tx.$queryRaw<{ id: string; ok: boolean }[]>(Prisma.sql`SELECT id,program_grant_readable(id,${p.id}::uuid) AS ok FROM program_access_grants WHERE id IN (${Prisma.join(grants.map(g => Prisma.sql`${g.id}::uuid`))})`) : [];
      await this.audit(tx, 'LIBRARY_READ', p.id, ctx);
      return { items: grants.map(g => ({ accessGrantId: g.id, purchaseId: g.purchaseId, title: g.purchase.definition.title, icon: g.purchase.definition.mezajPresentation?.icon ?? 'book', accessAvailable: states.find(s => s.id === g.id)?.ok === true, endsAt: g.endsAt })), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async settings(id: string, ctx: Context, body?: SaveProgramMezajDto): Promise<ProgramMezajDto> {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      const definition = await tx.programDefinitionVersion.findFirst({ where: { id, clinicId, kind: 'READY_EDUCATION' }, select: { id: true } });
      if (!definition) throw new NotFoundException({ code: 'PROGRAM_NOT_FOUND', message: 'Educational definition unavailable.', details: {} });
      if (body) await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`program-mezaj:${id}`},0))`);
      const old = await tx.programMezajPresentation.findUnique({ where: { programDefinitionId: id } });
      if (body) {
        if (body.enabled && !body.pairs.length) throw new UnprocessableEntityException({ code: 'PROGRAM_MEZAJ_INVALID', message: 'Choose at least one ordered pair.', details: {} });
        if ((old?.revision ?? 0) !== body.expectedRevision) throw new ConflictException({ code: 'PROGRAM_MEZAJ_CONFLICT', message: 'Configuration changed. Reload before saving.', details: {} });
        const data = { icon: body.icon, pairs: body.pairs, enabled: body.enabled, revision: (old?.revision ?? 0) + 1 };
        const saved = await tx.programMezajPresentation.upsert({ where: { programDefinitionId: id }, create: { programDefinitionId: id, clinicId, ...data }, update: data });
        await this.audit(tx, 'CONFIG_SAVED', id, ctx); return saved;
      }
      await this.audit(tx, 'CONFIG_READ', id, ctx);
      return old ?? { programDefinitionId: id, revision: 0, icon: 'book', enabled: false, pairs: [] };
    });
  }
  async recommendations(ctx: Context, submissionId?: string): Promise<MezajProgramRecommendationsDto> {
    return this.prisma.$transaction(async tx => {
      const patient = await this.purchases.patient(tx, ctx);
      const source = await resolveMezajRecommendationSource(tx, patient, submissionId);
      const response: MezajProgramRecommendationsDto = { ...source, items: [] };
      if (source.status === 'READY') {
        const rows = await tx.$queryRaw<{ id: string; definitionId: string; title: string; summary: string; icon: string; amount: bigint; grantId: string | null; purchaseId: string | null }[]>(Prisma.sql`
          SELECT pub.id,d.id AS "definitionId",d.title,d.summary,m.icon,pub.amount_rial AS amount,
            owned.id AS "grantId",COALESCE(owned.purchase_id,pending.id) AS "purchaseId"
          FROM program_mezaj_presentations m JOIN program_definition_versions d ON d.id=m.program_definition_id AND d.clinic_id=m.clinic_id
          JOIN program_offering_publications pub ON pub.program_definition_id=d.id AND pub.clinic_id=d.clinic_id
          LEFT JOIN LATERAL (SELECT g.id,g.purchase_id FROM program_access_grants g JOIN program_purchases p ON p.id=g.purchase_id WHERE p.program_definition_id=d.id AND g.patient_id=${patient.id}::uuid AND g.clinic_id=${patient.clinicId}::uuid AND program_grant_readable(g.id,${patient.id}::uuid) ORDER BY g.granted_at DESC,g.id DESC LIMIT 1) owned ON true
          LEFT JOIN LATERAL (SELECT p.id FROM program_purchases p JOIN billing_intents b ON b.program_purchase_id=p.id WHERE p.program_definition_id=d.id AND p.patient_id=${patient.id}::uuid AND p.clinic_id=${patient.clinicId}::uuid AND b.status='PENDING' AND b.expires_at>CURRENT_TIMESTAMP ORDER BY p.created_at DESC,p.id DESC LIMIT 1) pending ON true
          WHERE m.clinic_id=${patient.clinicId}::uuid AND m.enabled AND m.pairs @> ARRAY[${`${source.primary}/${source.secondary}`}]::text[] AND d.kind='READY_EDUCATION' AND pub.status='ACTIVE' AND program_publication_current(pub.id)
          ORDER BY pub.created_at DESC,pub.id DESC LIMIT 12`);
        response.items = rows.map(row => ({ programDefinitionId: row.definitionId, publicationId: row.id, title: row.title, summary: row.summary, icon: row.icon, amountRial: row.amount.toString(), currency: 'IRR', state: row.grantId ? 'OWNED' : row.purchaseId ? 'PENDING' : 'BUY', accessGrantId: row.grantId, purchaseId: row.purchaseId }));
      }
      await this.audit(tx, 'RECOMMENDATIONS_READ', source.submissionId ?? patient.id, ctx); return response;
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  private audit(tx: Prisma.TransactionClient, action: string, id: string, ctx: Context) { return tx.auditEvent.create({ data: { action: `PROGRAM_MEZAJ_${action}`, subjectType: 'PROGRAM_MEZAJ', subjectId: id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0,128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}
