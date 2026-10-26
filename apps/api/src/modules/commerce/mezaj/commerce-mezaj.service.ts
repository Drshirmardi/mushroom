import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { ClinicalAccessAuditService } from '../../clinical/clinical-access-audit.service';
import { resolveMezajRecommendationSource } from '../../assessments/domain/mezaj-recommendation-source';
import { PatientCommerceCatalogService } from '../catalog/patient-commerce-catalog.service';
import { MEZAJ_CODES, type CommerceMezajPairDto, type PatientCommerceRecommendationsDto, type SaveCommerceMezajDto } from './commerce-mezaj.dto';

type Context = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const bands = (v: unknown) => { const source = object(v); const rows = source.schemaVersion === 3 || source.schemaVersion === 2 ? source.resultProfiles : source.resultBands; return Array.isArray(rows) ? rows.map(object).filter(b => typeof b.id === 'string' && typeof b.title === 'string') : []; };
const invalid = () => new UnprocessableEntityException({ code: 'COMMERCE_MEZAJ_INVALID', message: 'Use active products and exact published Mezaj result bands.', details: {} });
const conflict = () => new ConflictException({ code: 'COMMERCE_MEZAJ_CONFLICT', message: 'The collection changed or a source band belongs to another ordered pair.', details: {} });
const activeProducts = { status: 'ACTIVE', category: { isActive: true }, skus: { some: { isActive: true } } } as const;
const collectionInclude = { items: { orderBy: { position: 'asc' }, include: { product: { select: { id: true, title: true } } } }, sources: { orderBy: [{ assessmentVersionId: 'asc' }, { resultBandId: 'asc' }], include: { assessmentVersion: { select: { title: true, versionNumber: true, structure: true } } } } } satisfies Prisma.CommerceMezajCollectionInclude;

@Injectable()
export class CommerceMezajService {
  constructor(private readonly prisma: PrismaService, private readonly catalog: PatientCommerceCatalogService, private readonly clinicalAudit: ClinicalAccessAuditService) {}

  private async clinic(tx: Prisma.TransactionClient = this.prisma) {
    const clinic = await tx.clinic.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, select: { id: true } });
    if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'Active clinic not found.', details: {} });
    return clinic.id;
  }
  async collections() {
    const clinicId = await this.clinic();
    const rows = await this.prisma.commerceMezajCollection.findMany({ where: { clinicId }, include: collectionInclude });
    return MEZAJ_CODES.flatMap(primary => MEZAJ_CODES.map(secondary => {
      const row = rows.find(r => r.primary === primary && r.secondary === secondary);
      return { primary, secondary, revision: row?.revision ?? 0, enabled: row?.enabled ?? false, products: row?.items.map(i => i.product) ?? [], sources: row?.sources.map(s => ({ assessmentVersionId: s.assessmentVersionId, resultBandId: s.resultBandId, versionTitle: s.assessmentVersion.title, versionNumber: s.assessmentVersion.versionNumber, bandTitle: String(bands(s.assessmentVersion.structure).find(b => b.id === s.resultBandId)?.title ?? s.resultBandId) })) ?? [] };
    }));
  }
  async versions(page: number) {
    const clinicId = await this.clinic();
    const where = { clinicId, assessmentKey: { in: ['MEZAJ','MIZAJ'] }, status: { in: ['PUBLISHED', 'RETIRED'] } } satisfies Prisma.AssessmentVersionWhereInput;
    const [total, rows] = await this.prisma.$transaction([this.prisma.assessmentVersion.count({ where }), this.prisma.assessmentVersion.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20, select: { id: true, title: true, versionNumber: true, locale: true, status: true, structure: true } })]);
    return { items: rows.map(({ structure, ...row }) => ({ ...row, resultBands: bands(structure).map(b => ({ id: String(b.id), title: String(b.title) })) })), total, page, pageSize: 20 };
  }
  async save(pair: CommerceMezajPairDto, body: SaveCommerceMezajDto, ctx: Context) {
    const productIds = body.productIds.map(id => id.toLowerCase());
    const sources = body.sources.map(s => ({ assessmentVersionId: s.assessmentVersionId.toLowerCase(), resultBandId: s.resultBandId }));
    if (new Set(productIds).size !== productIds.length || new Set(sources.map(s => `${s.assessmentVersionId}:${s.resultBandId}`)).size !== sources.length) throw invalid();
    if (body.enabled && (!productIds.length || !sources.length)) throw invalid();
    try {
      await this.prisma.$transaction(async tx => {
        const clinicId = await this.clinic(tx);
        // One clinic-wide config writer also serializes reassignment of exact source bands.
        await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'commerce-mezaj:' + clinicId},0))`);
        const row = await tx.commerceMezajCollection.findUnique({ where: { clinicId_primary_secondary: { clinicId, ...pair } } });
        if ((row?.revision ?? 0) !== body.expectedRevision) throw conflict();
        const products = await tx.commerceProduct.count({ where: { clinicId, id: { in: productIds }, ...activeProducts } });
        if (products !== productIds.length) throw invalid();
        const versions = sources.length ? await tx.assessmentVersion.findMany({ where: { id: { in: [...new Set(sources.map(s => s.assessmentVersionId))] }, clinicId, assessmentKey: { in: ['MEZAJ','MIZAJ'] }, status: { in: ['PUBLISHED', 'RETIRED'] } }, select: { id: true, contentHash: true, structure: true } }) : [];
        const previousSources = sources.length ? await tx.commerceMezajCollectionSource.findMany({ where: { OR: sources }, select: { assessmentVersionId: true, resultBandId: true, collectionId: true } }) : [];
        const sourceRows = [];
        for (const source of sources) {
          const version = versions.find(v => v.id === source.assessmentVersionId);
          if (!version || !/^[a-f0-9]{64}$/.test(version.contentHash) || !bands(version.structure).some(b => b.id === source.resultBandId)) throw invalid();
          const previous = previousSources.find(s => s.assessmentVersionId === source.assessmentVersionId && s.resultBandId === source.resultBandId);
          if (previous && previous.collectionId !== row?.id) throw conflict();
          sourceRows.push({ ...source, sourceContentHash: version.contentHash });
        }
        const next = row ? await tx.commerceMezajCollection.update({ where: { id: row.id }, data: { revision: { increment: 1 }, enabled: body.enabled } }) : await tx.commerceMezajCollection.create({ data: { clinicId, ...pair, enabled: body.enabled } });
        await tx.commerceMezajCollectionItem.deleteMany({ where: { collectionId: next.id } });
        await tx.commerceMezajCollectionSource.deleteMany({ where: { collectionId: next.id } });
        if (productIds.length) await tx.commerceMezajCollectionItem.createMany({ data: productIds.map((productId, position) => ({ collectionId: next.id, clinicId, productId, position })) });
        if (sourceRows.length) await tx.commerceMezajCollectionSource.createMany({ data: sourceRows.map(s => ({ collectionId: next.id, clinicId, ...s })) });
        await tx.auditEvent.create({ data: { action: 'COMMERCE_MEZAJ_COLLECTION_UPDATED', subjectType: 'COMMERCE_CATALOG', subjectId: next.id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: { revision: next.revision, enabled: next.enabled, productCount: productIds.length, sourceCount: sources.length } } });
      });
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw conflict(); throw error; }
    return (await this.collections()).find(r => r.primary === pair.primary && r.secondary === pair.secondary)!;
  }

  async patient(ctx: Context, submissionId?: string): Promise<PatientCommerceRecommendationsDto> {
    return this.prisma.$transaction(async tx => {
      const patient = await tx.patientProfile.findFirst({ where: { userId: ctx.actorUserId, clinic: { status: 'ACTIVE' } }, select: { id: true, clinicId: true } });
      if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile not found.', details: {} });
      const source = await resolveMezajRecommendationSource(tx, patient, submissionId);
      const response: PatientCommerceRecommendationsDto = { status: source.status === 'READY' ? 'NOT_CONFIGURED' : source.status, primary: source.primary, secondary: source.secondary, items: [] };
      if (source.status === 'READY') {
        const collection = await tx.commerceMezajCollection.findUnique({ where: { clinicId_primary_secondary: { clinicId: patient.clinicId, primary: source.primary, secondary: source.secondary } } });
        if (collection?.enabled) {
          const items = await tx.commerceMezajCollectionItem.findMany({ where: { collectionId: collection.id, clinicId: patient.clinicId, product: { clinicId: patient.clinicId, ...activeProducts } }, take: 20, orderBy: { position: 'asc' }, include: { product: { include: this.catalog.include } } });
          response.items = items.map(i => this.catalog.product(i.product)); response.status = response.items.length ? 'READY' : 'NO_PRODUCTS';
        }
      }
      await this.clinicalAudit.record({ clinicId: patient.clinicId, patientId: patient.id, action: 'READ', resourceType: 'STORE_MEZAJ_RECOMMENDATIONS', resourceId: source.submissionId ?? patient.id, metadata: { status: response.status } }, ctx, tx);
      return response;
    }, { isolationLevel: 'RepeatableRead' });
  }
}
