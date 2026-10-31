import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type AssessmentOfferingVersion, type ConsentPolicyVersion } from '../../../generated/prisma/client';
import type { AssessmentOfferingListQueryDto, CreateAssessmentOfferingVersionDto, OfferingPolicyDraftDto } from './assessment-offerings.dto';

import { AssessmentStructureError } from '../domain/assessment-structure-validation';
import type { CreateInlineAssessmentOfferingDto } from './assessment-offerings.dto';
import { assessmentAlgorithm, validatePublishableAssessment } from '../domain/assessment-engine-definition';

type Context = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
const missing = () => new NotFoundException({ code: 'ASSESSMENT_OFFERING_NOT_FOUND', message: 'Assessment offering was not found.', details: {} });
const invalidField = (field: string, reason: string) => new UnprocessableEntityException({ code: 'ASSESSMENT_OFFERING_INVALID', message: 'An offering field is invalid.', details: { field, reason } });
const invalid = () => new UnprocessableEntityException({ code: 'ASSESSMENT_OFFERING_INVALID', message: 'Offering configuration is inconsistent.', details: {} });
const conflict = () => new ConflictException({ code: 'ASSESSMENT_OFFERING_CONFLICT', message: 'Offering identity conflicts with the existing versions.', details: {} });
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object'
  ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}` : JSON.stringify(value);

@Injectable()
export class AssessmentOfferingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: CreateAssessmentOfferingVersionDto, rawKey: string | undefined, context: Context) {
    const key = rawKey?.trim();
    if (!key || key.length > 200 || !/^[\x21-\x7e]+$/u.test(key)) throw new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A valid Idempotency-Key is required.', details: {} });
    const amountRial = body.amountRial == null ? null : BigInt(body.amountRial);
    if (amountRial !== null && (amountRial > 9_000_000_000_000_000_000n || amountRial < 0n)) throw invalid();
    if (body.priceMode === 'FREE' && (amountRial !== null && amountRial !== 0n || body.paymentPoint != null)) throw invalid();
    if (body.priceMode === 'PAID' && amountRial === 0n) throw invalid();
    if ((body.algorithmId == null) !== (body.algorithmVersion == null)) throw invalid();
    const policyDraft = Object.fromEntries(Object.entries(body.policyDraft ?? {}).filter(([, value]) => value != null)
      .map(([field, value]) => [field, typeof value === 'string' ? value.trim() : value])) as OfferingPolicyDraftDto;
    const definition = { offeringKey: body.offeringKey, kind: body.kind, title: body.title.trim(), assessmentVersionId: body.assessmentVersionId,
      priceMode: body.priceMode, currency: body.currency, paymentPoint: body.paymentPoint ?? null,
      amountRial: body.priceMode === 'FREE' ? '0' : amountRial?.toString() ?? null,
      algorithmId: body.algorithmId ?? null, algorithmVersion: body.algorithmVersion ?? null, policyDraft };
    const payloadHash = createHash('sha256').update(canonical(definition)).digest('hex');
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, context.actorUserId);
      await this.lock(tx, `offering-command:${context.actorUserId}:${key}`);
      const previous = await tx.assessmentOfferingVersion.findUnique({ where: { createdByUserId_idempotencyKey: { createdByUserId: context.actorUserId, idempotencyKey: key } } });
      if (previous) {
        if (previous.payloadHash !== payloadHash || previous.clinicId !== clinic.id) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key was used for another definition.', details: {} });
        await this.audit(tx, 'ASSESSMENT_OFFERING_READ', previous.id, context);
        return this.response(previous, await this.questionnaireStatus(tx, previous.assessmentVersionId));
      }
      await this.lock(tx, `offering-version:${clinic.id}:${body.offeringKey}`);
      const source = await tx.assessmentVersion.findFirst({ where: { id: body.assessmentVersionId, clinicId: clinic.id, status: { in: ['PUBLISHED', 'RETIRED'] } }, select: { id: true, locale: true, assessmentKey: true, status: true } });
      if (!source) throw missing();
      const latest = await tx.assessmentOfferingVersion.findFirst({ where: { clinicId: clinic.id, offeringKey: body.offeringKey }, orderBy: { versionNumber: 'desc' }, include: { assessmentVersion: { select: { assessmentKey: true } } } });
      if (latest && (latest.kind !== body.kind || latest.locale !== source.locale || latest.assessmentVersion.assessmentKey !== source.assessmentKey)) throw conflict();
      if (policyDraft.consentPolicyVersionId && !await tx.consentPolicyVersion.findFirst({ where: { id: policyDraft.consentPolicyVersionId, clinicId: clinic.id }, select: { id: true } })) throw invalid();
      const created = await tx.assessmentOfferingVersion.create({ data: { ...definition, amountRial: definition.amountRial === null ? null : BigInt(definition.amountRial),
        policyDraft: policyDraft as Prisma.InputJsonObject, clinicId: clinic.id, locale: source.locale, versionNumber: (latest?.versionNumber ?? 0) + 1,
        createdByUserId: context.actorUserId, idempotencyKey: key, payloadHash } });
      await this.audit(tx, 'ASSESSMENT_OFFERING_VERSION_CREATED', created.id, context);
      return this.response(created, source.status);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async createInline(body: CreateInlineAssessmentOfferingDto, rawKey: string | undefined, ctx: Context) {
    const key = rawKey?.trim();
    if (!key || !/^[\x21-\x7e]{1,200}$/u.test(key)) throw invalid();
    if (body.priceMode === 'PAID' && (!body.amountRial || BigInt(body.amountRial) <= 0n || BigInt(body.amountRial) > 9_000_000_000_000_000_000n)) throw invalidField('amountRial', 'مبلغ عرضهٔ پرداختی باید یک عدد صحیح مثبت و در محدودهٔ مجاز باشد.');
    if (body.priceMode === 'PAID' && !body.texts.terms?.trim()) throw invalidField('texts.terms', 'متن شرایط خرید برای عرضهٔ پرداختی لازم است.');
    if (body.priceMode === 'FREE' && body.amountRial !== undefined) throw invalidField('amountRial', 'عرضهٔ رایگان نباید مبلغ پرداخت داشته باشد.');
    if (body.kind === 'COUPLES' && !body.texts.disclosure?.trim()) throw invalidField('texts.disclosure', 'متن رضایت اشتراک نتیجه برای عرضهٔ زوجین لازم است.');
    const payloadHash = createHash('sha256').update(canonical(body)).digest('hex');
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, ctx.actorUserId);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM clinics WHERE id=${clinic.id}::uuid FOR UPDATE`);
      await this.lock(tx, `offering-command:${ctx.actorUserId}:${key}`);
      const prior = await tx.assessmentOfferingVersion.findUnique({ where: { createdByUserId_idempotencyKey: { createdByUserId: ctx.actorUserId, idempotencyKey: key } }, include: { adminPublication: true, consentPolicies: true } });
      if (prior) {
        if (prior.payloadHash !== payloadHash || prior.clinicId !== clinic.id) throw conflict();
        return this.response(prior, await this.questionnaireStatus(tx, prior.assessmentVersionId), await this.current(tx, prior.id));
      }
      await this.lock(tx, `assessment-protocol:${body.assessmentVersionId.toLowerCase()}`);
      await this.lock(tx, `assessment-commercial-start:${body.assessmentVersionId.toLowerCase()}`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${body.assessmentVersionId}::uuid AND clinic_id=${clinic.id}::uuid FOR UPDATE`);
      const source = await tx.assessmentVersion.findFirst({ where: { id: body.assessmentVersionId, clinicId: clinic.id, status: { in: ['DRAFT', 'PUBLISHED'] } } });
      if (!source) throw missing();
      try { validatePublishableAssessment(source.structure); } catch (error) { if (error instanceof AssessmentStructureError) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: error.message, details: {} }); throw error; }
      if (Buffer.byteLength(JSON.stringify(body.texts), 'utf8') > 240_000) throw invalidField('texts', 'مجموع متن‌های عرضه بیش از ظرفیت مجاز است؛ متن‌های مشترک طولانی را کوتاه‌تر کنید.');
      const profiles = new Set(((source.structure as { resultProfiles?: { id: string }[] }).resultProfiles ?? []).map(profile => profile.id));
      const pairs = new Set<string>();
      for (const [index, pair] of (body.texts.pairTexts ?? []).entries()) {
        const identity = JSON.stringify([pair.firstProfileId, pair.secondProfileId].sort());
        if (body.kind !== 'COUPLES' || !profiles.has(pair.firstProfileId) || !profiles.has(pair.secondProfileId) || pairs.has(identity)) throw invalidField(`texts.pairTexts.${index}`, `ترکیب ${index + 1}: دو نتیجهٔ موجود در همین پرسشنامه را انتخاب کنید؛ هر ترکیب فقط یک متن مشترک دارد.`);
        pairs.add(identity);
      }
      if (body.expectedQuestionnaireHash && source.contentHash !== body.expectedQuestionnaireHash) throw conflict();
      if (source.status === 'DRAFT') {
        if (!body.expectedQuestionnaireHash) throw conflict();
        await this.lock(tx, `assessment-version:${clinic.id}:${source.assessmentKey}:${source.locale}`);
        if (await tx.assessmentVersion.findFirst({ where: { clinicId: clinic.id, assessmentKey: source.assessmentKey, locale: source.locale, status: 'PUBLISHED', id: { not: source.id } } })) throw new ConflictException({ code: 'ASSESSMENT_VERSION_ALREADY_PUBLISHED', message: 'Another questionnaire version is published.', details: {} });
        await tx.assessmentVersion.update({ where: { id: source.id }, data: { status: 'PUBLISHED', publishedAt: new Date(), publishedByUserId: ctx.actorUserId } });
        await tx.auditEvent.create({ data: { action: 'ASSESSMENT_VERSION_PUBLISHED', subjectType: 'ASSESSMENT_VERSION', subjectId: source.id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId, ipAddress: ctx.ipAddress, metadata: {} } });
      }
      const offeringKey = `AUTO_${source.id.replaceAll('-', '').toUpperCase()}_${body.kind}`;
      await this.lock(tx, `offering-version:${clinic.id}:${offeringKey}`);
      const latest = await tx.assessmentOfferingVersion.aggregate({ where: { clinicId: clinic.id, offeringKey }, _max: { versionNumber: true } });
      const processingId = randomUUID(), termsId = body.priceMode === 'PAID' ? randomUUID() : null, disclosureId = body.kind === 'COUPLES' ? randomUUID() : null;
      const policyDraft = { minimumAgeYears: 18, quoteTtlSeconds: 900, consentPolicyVersionId: processingId, termsPolicyVersionId: termsId, disclosurePolicyVersionId: disclosureId, retentionPolicyRef: 'INLINE', resultVisibilityPolicyRef: 'INLINE', refundPolicyRef: 'NO_REFUNDS' };
      const algorithm = assessmentAlgorithm(source.structure);
      const row = await tx.assessmentOfferingVersion.create({ data: { clinicId: clinic.id, offeringKey, versionNumber: (latest._max.versionNumber ?? 0) + 1, assessmentVersionId: source.id, locale: source.locale, title: body.title.trim(), kind: body.kind, priceMode: body.priceMode, currency: 'IRR', amountRial: body.priceMode === 'PAID' ? BigInt(body.amountRial!) : 0n, paymentPoint: body.priceMode === 'PAID' ? 'PRE_START' : null, ...algorithm, policyDraft, authoringTexts: body.texts as unknown as Prisma.InputJsonObject, createdByUserId: ctx.actorUserId, idempotencyKey: key, payloadHash } });
      const documents = [{ id: processingId, purpose: 'ASSESSMENT_PROCESSING', text: `${body.texts.processing}\n\nنگهداری اطلاعات\n${body.texts.retention}\n\nنمایش نتیجه\n${body.texts.visibility}` }, ...(termsId ? [{ id: termsId, purpose: 'ASSESSMENT_PURCHASE_TERMS', text: body.texts.terms! }] : []), ...(disclosureId ? [{ id: disclosureId, purpose: 'COUPLES_RESULT_SHARING', text: body.texts.disclosure! }] : [])];
      for (const document of documents.sort((a, b) => a.purpose.localeCompare(b.purpose))) {
        // Version numbers retain the legacy clinic-wide uniqueness constraint.
        await this.lock(tx, `assessment-policy-version:${clinic.id}:${document.purpose}:${source.locale}`);
        const previous = await tx.consentPolicyVersion.aggregate({ where: { clinicId: clinic.id, policyKey: document.purpose, locale: source.locale }, _max: { versionNumber: true } });
        await tx.consentPolicyVersion.create({ data: { id: document.id, clinicId: clinic.id, assessmentOfferingVersionId: row.id, policyKey: document.purpose, versionNumber: (previous._max.versionNumber ?? 0) + 1, locale: source.locale, title: body.title.trim(), body: document.text, contentHash: createHash('sha256').update(document.text, 'utf8').digest('hex'), status: 'ACTIVE', activatedAt: new Date(), publishedByUserId: ctx.actorUserId } });
        await tx.auditEvent.create({ data: { action: 'CONSENT_POLICY_PUBLISHED', subjectType: 'CONSENT_POLICY_VERSION', subjectId: document.id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId, ipAddress: ctx.ipAddress, metadata: { offeringVersionId: row.id } } });
      }
      if (body.kind === 'COUPLES') await this.ensureAccountLinkPolicy(tx, clinic.id, ctx);
      const adminPublication = await tx.assessmentAdminPublication.create({ data: { offeringVersionId: row.id, questionnaireContentHash: source.contentHash, documentHashes: Object.fromEntries(documents.map(document => [document.purpose, createHash('sha256').update(document.text, 'utf8').digest('hex')])), publishedByUserId: ctx.actorUserId, publishedSessionId: ctx.actorSessionId } });
      await this.audit(tx, 'ASSESSMENT_COMMERCIAL_PUBLISHED', row.id, ctx);
      await this.audit(tx, 'ASSESSMENT_OFFERING_VERSION_CREATED', row.id, ctx);
      const consentPolicies = await tx.consentPolicyVersion.findMany({ where: { assessmentOfferingVersionId: row.id } });
      return this.response({ ...row, adminPublication, consentPolicies }, 'PUBLISHED');
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async list(query: AssessmentOfferingListQueryDto, context: Context) {
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, context.actorUserId);
      const where = { clinicId: clinic.id, ...(query.offeringKey ? { offeringKey: query.offeringKey } : {}), ...(query.kind ? { kind: query.kind } : {}) };
      const [rows, total] = await Promise.all([
        tx.assessmentOfferingVersion.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize, include: { adminPublication: true, consentPolicies: true, assessmentVersion: { select: { status: true } } } }),
        tx.assessmentOfferingVersion.count({ where }),
      ]);
      const currentRows = rows.length ? await tx.$queryRaw<{ id: string; current: boolean }[]>(Prisma.sql`SELECT id,assessment_admin_offering_current(id) AS current FROM assessment_offering_versions WHERE id IN (${Prisma.join(rows.map(row => Prisma.sql`${row.id}::uuid`))})`) : [];
      const current = new Set(currentRows.filter(row => row.current).map(row => row.id));
      await this.audit(tx, 'ASSESSMENT_OFFERING_LIST_READ', clinic.id, context);
      return { items: rows.map(row => this.response(row, row.assessmentVersion.status, current.has(row.id))), page: query.page, pageSize: query.pageSize, total };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async get(id: string, context: Context) {
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, context.actorUserId);
      const row = await tx.assessmentOfferingVersion.findFirst({ where: { id, clinicId: clinic.id }, include: { adminPublication: true, consentPolicies: true, assessmentVersion: { select: { status: true } } } });
      if (!row) throw missing();
      await this.audit(tx, 'ASSESSMENT_OFFERING_READ', row.id, context);
      return this.response(row, row.assessmentVersion.status, await this.current(tx, row.id));
    });
  }

  async retire(id: string, context: Context) {
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, context.actorUserId);
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_offering_versions WHERE id = ${id}::uuid AND clinic_id = ${clinic.id}::uuid FOR UPDATE`);
      if (!locked.length) throw missing();
      const row = await tx.assessmentOfferingVersion.findUniqueOrThrow({ where: { id }, include: { adminPublication: true, consentPolicies: true } });
      const retired = row.status === 'RETIRED' ? row : await tx.assessmentOfferingVersion.update({ where: { id }, data: { status: 'RETIRED', retiredAt: new Date() } });
      await this.audit(tx, row.status === 'RETIRED' ? 'ASSESSMENT_OFFERING_READ' : 'ASSESSMENT_OFFERING_RETIRED', id, context);
      return this.response({ ...retired, adminPublication: row.adminPublication, consentPolicies: row.consentPolicies }, await this.questionnaireStatus(tx, row.assessmentVersionId));
    });
  }

  private async clinic(tx: Prisma.TransactionClient, actorUserId: string) {
    const clinic = await tx.clinic.findFirst({ where: { status: 'ACTIVE', clinicalClinicAccesses: { some: { userId: actorUserId } } }, select: { id: true } });
    if (!clinic) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Active clinic membership is required.', details: {} });
    return clinic;
  }
  private async ensureAccountLinkPolicy(tx: Prisma.TransactionClient, clinicId: string, ctx: Context) {
    const where = { clinicId, assessmentOfferingVersionId: null, policyKey: 'COUPLES_ACCOUNT_LINKING', locale: 'fa-IR' };
    if (await tx.consentPolicyVersion.count({ where: { ...where, status: 'ACTIVE' } })) return;
    const latest = await tx.consentPolicyVersion.aggregate({ where, _max: { versionNumber: true } });
    const body = 'ارتباط دو حساب فقط با دعوت و پذیرش مستقل هر دو نفر برقرار می‌شود. هر نفر پاسخ‌های خودش را ثبت می‌کند و می‌تواند اجازهٔ ارتباط را پس بگیرد. برقراری ارتباط به‌تنهایی اجازهٔ نمایش پاسخ‌ها یا نتیجهٔ خصوصی شما را نمی‌دهد؛ نمایش نتیجهٔ مشترک برای هر ارزیابی به رضایت مستقل همان نسخه نیاز دارد.';
    const policy = await tx.consentPolicyVersion.create({ data: { ...where, versionNumber: (latest._max.versionNumber ?? 0) + 1, title: 'ارتباط دو حساب برای ارزیابی زوجین', body, contentHash: createHash('sha256').update(body, 'utf8').digest('hex'), status: 'ACTIVE', activatedAt: new Date(), publishedByUserId: ctx.actorUserId } });
    await tx.auditEvent.create({ data: { action: 'CONSENT_POLICY_PUBLISHED', subjectType: 'CONSENT_POLICY_VERSION', subjectId: policy.id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId, ipAddress: ctx.ipAddress, metadata: { source: 'ADMIN_COUPLE_OFFERING_DEFAULT' } } });
  }
  private async questionnaireStatus(tx: Prisma.TransactionClient, id: string) {
    return (await tx.assessmentVersion.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;
  }
  private async lock(tx: Prisma.TransactionClient, key: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`); }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, context: Context) {
    await tx.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'ASSESSMENT_OFFERING', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: {} } });
  }
  private async current(tx: Prisma.TransactionClient, id: string) { return !!(await tx.$queryRaw<{ current: boolean }[]>(Prisma.sql`SELECT assessment_admin_offering_current(${id}::uuid) AS current`))[0]?.current; }
  private response(row: AssessmentOfferingVersion & { adminPublication?: { id: string; status: string } | null; consentPolicies?: ConsentPolicyVersion[] }, questionnaireStatus: string, current = true) {
    const policyDraft = row.policyDraft as OfferingPolicyDraftDto;
    const blockers = row.adminPublication?.status === 'ACTIVE' ? [] : ['OWNER_POLICY_APPROVAL_REQUIRED', 'CLINICAL_RELEASE_APPROVAL_REQUIRED', 'DIGITAL_ACCESS_INTEGRATION_REQUIRED'];
    if (row.adminPublication) {
      const purposes = ['ASSESSMENT_PROCESSING', ...(row.priceMode === 'PAID' ? ['ASSESSMENT_PURCHASE_TERMS'] : []), ...(row.kind === 'COUPLES' ? ['COUPLES_RESULT_SHARING'] : [])];
      if (purposes.some(purpose => !row.consentPolicies?.some(policy => policy.policyKey === purpose && policy.status === 'ACTIVE' && createHash('sha256').update(policy.body, 'utf8').digest('hex') === policy.contentHash))) blockers.push('SCOPED_POLICY_UNAVAILABLE');
    }
    if (row.adminPublication && !current && row.status !== 'RETIRED') blockers.push('CURRENT_OFFERING_UNAVAILABLE');
    if (row.status === 'RETIRED') blockers.push('OFFERING_RETIRED');
    if (questionnaireStatus !== 'PUBLISHED') blockers.push('QUESTIONNAIRE_NOT_PUBLISHED');
    if (row.priceMode === 'PAID' && (row.amountRial === null || row.paymentPoint === null)) blockers.push('PRICE_CONFIGURATION_INCOMPLETE');
    if (row.algorithmId === null || row.algorithmVersion === null) blockers.push('ALGORITHM_REFERENCE_MISSING');
    if (policyDraft.minimumAgeYears === undefined || !policyDraft.consentPolicyVersionId || !policyDraft.retentionPolicyRef || !policyDraft.resultVisibilityPolicyRef) blockers.push('DRAFT_POLICY_INCOMPLETE');
    if (row.kind === 'COUPLES' && !row.adminPublication) blockers.push('COUPLES_SESSION_AND_ALGORITHM_APPROVAL_REQUIRED');
    return { adminPublicationId: row.adminPublication?.id ?? null, publicationAuthority: row.adminPublication ? 'ADMIN_PUBLISHED' as const : null, authoringTexts: row.authoringTexts, id: row.id, offeringKey: row.offeringKey, versionNumber: row.versionNumber, kind: row.kind, title: row.title, locale: row.locale,
      status: row.status, assessmentVersionId: row.assessmentVersionId, priceMode: row.priceMode, paymentPoint: row.paymentPoint, amountRial: row.amountRial?.toString() ?? null,
      currency: row.currency, algorithmId: row.algorithmId, algorithmVersion: row.algorithmVersion, policyDraft, createdAt: row.createdAt, retiredAt: row.retiredAt,
      releaseReadiness: { ready: blockers.length === 0, blockers } };
  }
}
