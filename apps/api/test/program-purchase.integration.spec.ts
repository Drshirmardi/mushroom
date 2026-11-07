import { createCompleteTestPatient } from './patient-entry-test-support';
import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { BillingService } from '../src/modules/billing/billing.service';
import { BillingGatewayService } from '../src/modules/billing/billing-gateway.service';
import { WalletService } from '../src/modules/billing/wallet.service';
import { ProgramPurchaseService } from '../src/modules/programs/purchases/program-purchase.service';
import { PaymentProviderRegistry } from '../src/modules/commerce/payments/payment-provider.registry';
import { PaymentCredentialCryptoService } from '../src/modules/commerce/payments/payment-credential-crypto.service';
import { SadadRuntimeConfigService } from '../src/modules/commerce/payments/sadad-runtime-config.service';
import type { PaymentProviderPort } from '../src/modules/commerce/payments/payment-provider.port';
import { assertPatientJourneyTestDatabase, createTestAccessToken } from './auth-test-support';
import { ProgramMezajService } from '../src/modules/programs/purchases/program-mezaj.service';
import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { previewTieBreakDraft, TIEBREAK_ALGORITHM } from '../src/modules/assessments/domain/assessment-tiebreak-draft';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('ready program purchase/access (disposable PostgreSQL, synthetic PSP)', () => {
  let app: NestFastifyApplication, db: PrismaService, billing: BillingService, gateway: BillingGatewayService, wallet: WalletService, clinicId: string, doctorRole: string, originalSign: boolean;
  let admin: Awaited<ReturnType<typeof actor>>, doctor: Awaited<ReturnType<typeof actor>>;
  let providerConfig: { id: string; enabled: boolean; isDefault: boolean; goLiveReady: boolean; activeRevisionId: string | null } | null = null;
  const requests = new Map<string, { amount: bigint; orderId: bigint }>(); let providerMode: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'WRONG_AMOUNT' = 'SUCCESS';
  const provider: PaymentProviderPort = {
    descriptor: { code: 'sadad', displayName: 'Synthetic program PSP', capabilities: { createPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', parseCallback: 'SUPPORTED_WHEN_GO_LIVE_READY', verifyPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', sandbox: 'UNSUPPORTED', inquiry: 'UNSUPPORTED', webhook: 'UNSUPPORTED', refund: 'UNSUPPORTED', partialRefund: 'UNSUPPORTED' } },
    async createPayment(input) { const token = `synthetic-program-${input.providerOrderId}`; requests.set(token, { amount: input.providerAmount, orderId: input.providerOrderId }); return { providerResultCode: '0', token, redirectUrl: `https://sadad.shaparak.ir/Purchase?Token=${token}` }; },
    parseCallback(input) { const v = input as Record<string, string>; return { providerOrderId: BigInt(v.OrderId), token: v.Token, resultCode: v.ResCode }; },
    async verifyPayment({ token }) { if (providerMode === 'TIMEOUT') throw new Error('Synthetic timeout'); const p = requests.get(token)!; return { resultCode: providerMode === 'FAILED' ? '101' : '100', providerOrderId: p.orderId, amount: p.amount + (providerMode === 'WRONG_AMOUNT' ? 1n : 0n), referenceId: `program-${p.orderId}`, traceNumber: `trace-${p.orderId}` }; },
  };
  beforeAll(async () => {
    assertPatientJourneyTestDatabase();
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService); billing = app.get(BillingService); gateway = app.get(BillingGatewayService); wallet = app.get(WalletService); clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    doctorRole = (await db.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } })).id; originalSign = !!await db.clinicalRolePermission.count({ where: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' } }); await db.clinicalRolePermission.upsert({ where: { roleId_permission: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' } }, create: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' }, update: {} });
    app.get(PaymentProviderRegistry).register(provider); const runtime = app.get(SadadRuntimeConfigService); vi.spyOn(runtime, 'settings').mockReturnValue({ returnUrl: 'https://api.example.test/v1/payments/providers/sadad/callback', resultUrl: 'https://app.example.test/profile/wallet/payment-result', redirectProfile: 'PHP_VPG_PURCHASE', timeoutMs: 1000 }); vi.spyOn(runtime, 'live', 'get').mockReturnValue(true);
    const encrypted = app.get(PaymentCredentialCryptoService).encrypt({ merchantId: 'synthetic', terminalId: '123', terminalKey: Buffer.alloc(24, 7).toString('base64') });
    providerConfig = await db.paymentProviderConfig.findUnique({ where: { clinicId_providerCode: { clinicId, providerCode: 'sadad' } }, select: { id: true, enabled: true, isDefault: true, goLiveReady: true, activeRevisionId: true } });
    const config = await db.paymentProviderConfig.upsert({ where: { clinicId_providerCode: { clinicId, providerCode: 'sadad' } }, create: { clinicId, providerCode: 'sadad', providerUnit: 'RIAL' }, update: { enabled: false, isDefault: false } });
    const version = (await db.paymentProviderCredentialVersion.count({ where: { configId: config.id } })) + 1, credential = await db.paymentProviderCredentialVersion.create({ data: { configId: config.id, versionNumber: version, encryptedPayload: new Uint8Array(encrypted.ciphertext), encryptionNonce: new Uint8Array(encrypted.nonce), authenticationTag: new Uint8Array(encrypted.tag), encryptionKeyVersion: encrypted.keyVersion } });
    const revision = await db.paymentProviderConfigRevision.create({ data: { configId: config.id, revisionNumber: version, providerUnit: 'RIAL', goLiveReady: true, credentialVersionId: credential.id } }); await db.paymentProviderConfig.update({ where: { id: config.id }, data: { activeRevisionId: revision.id, enabled: true, isDefault: true, goLiveReady: true } });
  }, 30_000);
  beforeEach(async () => { admin = await actor('ADMIN'); doctor = await actor('DOCTOR'); providerMode = 'SUCCESS'; });
  afterAll(async () => { try { if (db) { if (!originalSign) await db.clinicalRolePermission.deleteMany({ where: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' } }); await db.paymentProviderConfig.updateMany({ where: { clinicId, providerCode: 'sadad' }, data: providerConfig ? { enabled: providerConfig.enabled, isDefault: providerConfig.isDefault, goLiveReady: providerConfig.goLiveReady, activeRevisionId: providerConfig.activeRevisionId } : { enabled: false, isDefault: false, goLiveReady: false, activeRevisionId: null } }); } } finally { vi.restoreAllMocks(); await app?.close(); } });
  async function actor(role: 'ADMIN' | 'DOCTOR' | 'PATIENT', liveRole = true) {
    const a = await createTestAccessToken(db, app.get(AccessTokenService), [role]); if (liveRole) await db.userRole.create({ data: { userId: a.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } });
    if (role !== 'PATIENT') await db.clinicalClinicAccess.create({ data: { userId: a.userId, clinicId } });
    let doctorId: string | undefined;
    if (role === 'DOCTOR') { const name = randomUUID(), specialty = await db.specialty.create({ data: { clinicId, name, canonicalName: name, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }), d = await db.doctorProfile.create({ data: { clinicId, userId: a.userId, displayName: 'Synthetic program reviewer' } }); doctorId = d.id; await db.doctorSpecialty.create({ data: { clinicId, doctorId, specialtyId: specialty.id } }); await db.doctorProfile.update({ where: { id: doctorId }, data: { isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }); }
    return { ...a, doctorId };
  }
  async function patient(live = true) { const a = await actor('PATIENT', live), profile = await createCompleteTestPatient(db, { data: { clinicId, userId: a.userId } }); return { ...a, profile }; }
  const ctx = (who = admin) => ({ actorUserId: who.userId, actorSessionId: who.sessionId, requestId: randomUUID(), ipAddress: '127.0.0.1' });
  const req = (method: 'GET' | 'POST', path: string, who = admin, payload?: object, key: string | null = randomUUID()) => app.inject({ method, url: `/v1/${path}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}), ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  const safety = { intendedAudience: 'Synthetic education audience', limitations: 'Test only; no diagnosis or individualized treatment.', contraindications: [], seekProfessionalCare: 'Synthetic professional review instruction.' };
  async function setup(amount = '50000', mode = 'DAYS', sourceFree = false) {
    const category = await db.articleCategory.create({ data: { clinicId, slug: randomUUID(), name: 'Synthetic source' } }), article = await db.article.create({ data: { clinicId, categoryId: category.id, slug: randomUUID(), title: 'Synthetic source', body: 'Synthetic education.' } });
    const contentResponse = await req('POST', 'admin/guidance-content/versions', admin, { articleId: article.id, locale: 'fa-IR', kind: 'GENERAL_EDUCATION', provenance: [{ label: 'Synthetic fixture', url: 'https://example.org/synthetic', accessedOn: '2026-10-18' }], safety }); expect(contentResponse.statusCode, contentResponse.body).toBe(201); const content = contentResponse.json();
    const approveContent = await req('POST', `clinical/guidance-content/${content.id}/approve`, doctor, { contentHash: content.contentHash, educationalOnly: true, noDiagnosisOrTherapeuticDiet: true }); expect(approveContent.statusCode, approveContent.body).toBe(201);
    const input = { programKey: `PROGRAM_${randomUUID().replaceAll('-', '').toUpperCase()}`, locale: 'fa-IR', kind: 'READY_EDUCATION', title: 'Synthetic private curriculum', summary: 'Synthetic definition', category: 'Education', body: 'Private synthetic curriculum; no health claim.', eligibilityDescription: 'General education; no medical intake prerequisite.', safety, contentReferences: sourceFree ? undefined : [{ id: content.id, contentHash: content.contentHash }] };
    const definitionResponse = await req('POST', 'admin/program-definitions/versions', admin, input); expect(definitionResponse.statusCode, definitionResponse.body).toBe(201); const definition = definitionResponse.json();
    const approved = await req('POST', `clinical/program-definitions/${definition.id}/approve`, doctor, { contentHash: definition.contentHash, reviewedProgramAndSafety: true, noAutomaticTherapyActivation: true }); expect(approved.statusCode, approved.body).toBe(201);
    await db.consentPolicyVersion.updateMany({ where: { clinicId, policyKey: 'PROGRAM_PURCHASE_TERMS', locale: 'fa-IR', status: 'ACTIVE' }, data: { status: 'RETIRED', retiredAt: new Date() } });
    const previous = await db.consentPolicyVersion.findFirst({ where: { clinicId, policyKey: 'PROGRAM_PURCHASE_TERMS', locale: 'fa-IR' }, orderBy: { versionNumber: 'desc' } }), body = 'Synthetic legal fixture only, no approved legal text.', terms = await db.consentPolicyVersion.create({ data: { clinicId, policyKey: 'PROGRAM_PURCHASE_TERMS', locale: 'fa-IR', versionNumber: (previous?.versionNumber ?? 0) + 1, title: 'Synthetic terms', body, contentHash: createHash('sha256').update(body).digest('hex'), status: 'ACTIVE', activatedAt: new Date() } });
    const config = { programDefinitionId: definition.id, termsPolicyVersionId: sourceFree ? undefined : terms.id, amountRial: amount, currency: 'IRR', accessMode: mode, accessDurationDays: mode === 'DAYS' ? 30 : null, quoteTtlSeconds: 600, retentionPolicyRef: sourceFree ? undefined : 'SYNTHETIC_TEST_ONLY' }, pub = await publish(config);
    await db.programService.update({ where: { clinicId_programKey_locale: { clinicId, programKey: definition.programKey, locale: definition.locale } }, data: { audience: 'SHARED' } });
    return { definition, input, content, terms: sourceFree ? await db.consentPolicyVersion.findUniqueOrThrow({ where: { id: pub.termsPolicyVersionId } }) : terms, config, pub };
  }
  async function publish(config: object) { const preview = await req('POST', 'admin/program-offerings/preview', admin, config); expect(preview.statusCode, preview.body).toBe(200); const response = await req('POST', 'admin/program-offerings', admin, { ...config, publicationHash: preview.json().publicationHash, expectedPublicationNumber: preview.json().expectedPublicationNumber, reviewedTermsAndRetention: true }); expect(response.statusCode, response.body).toBe(201); return response.json(); }
  async function accept(f: Awaited<ReturnType<typeof setup>>, p: Awaited<ReturnType<typeof patient>>, key = randomUUID()) { const r = await req('POST', 'patients/me/program-consents', p, { policyVersionId: f.terms.id, contentHash: f.terms.contentHash, accepted: true }, key); expect(r.statusCode, r.body).toBe(201); return r.json(); }
  async function purchase(f: Awaited<ReturnType<typeof setup>>, p: Awaited<ReturnType<typeof patient>>, key = randomUUID()) { const consent = await accept(f, p), input = { publicationId: f.pub.id, publicationHash: f.pub.publicationHash, termsConsentRecordId: consent.id }, r = await req('POST', 'patients/me/billing/program-intents', p, input, key); expect(r.statusCode, r.body).toBe(201); return { intent: r.json(), input, key }; }
  async function grant(p: Awaited<ReturnType<typeof patient>>, id: string) { const r = await req('GET', `patients/me/program-purchases/${id}`, p); expect(r.statusCode, r.body).toBe(200); return r.json().grant; }
  async function fund(p: Awaited<ReturnType<typeof patient>>) { const s = await wallet.summary(p.profile); await wallet.adjust(ctx(), p.profile.id, { type: 'CREDIT', amountToman: '100000', expectedVersion: s.version, reason: 'Synthetic program funding' }, randomUUID()); }
  async function paid(f: Awaited<ReturnType<typeof setup>>, p: Awaited<ReturnType<typeof patient>>) { const i = await purchase(f, p); await fund(p); const r = await req('POST', `patients/me/billing/intents/${i.intent.id}/wallet-payment`, p); expect(r.statusCode, r.body).toBe(201); expect(r.json().status).toBe('PAID'); return { ...i, access: await grant(p, i.intent.programPurchaseId) }; }

  async function dimensionalResult(p: Awaited<ReturnType<typeof patient>>, reverse = false) {
    const base = structuredClone(MIZAJ_DRAFT_PRESET.structure);
    for (const section of base.sections) for (const q of section.questions) q.options.forEach((option, i) => { option.scores = { [base.scoring.dimensions[i]!.id]: 1 }; });
    const structure = { ...base, schemaVersion: 3 as const, scoring: { ...base.scoring, ...TIEBREAK_ALGORITHM, minInformativeAnswers: 1 }, followUps: [] };
    const questions = structure.sections.flatMap(s => s.questions);
    const answers = Object.fromEntries(questions.map((q,i) => [q.id,q.options[i < 8 ? reverse ? 1 : 0 : reverse ? 0 : 1]!.id]));
    const evaluation = previewTieBreakDraft(structure,answers);
    const key='MIZAJ'; await db.assessmentVersion.updateMany({where:{clinicId,assessmentKey:key,status:'PUBLISHED'},data:{status:'RETIRED',retiredAt:new Date()}});
    const last=await db.assessmentVersion.aggregate({where:{clinicId,assessmentKey:key,locale:'fa-IR'},_max:{versionNumber:true}});
    const v=await db.assessmentVersion.create({data:{clinicId,assessmentKey:key,locale:'fa-IR',versionNumber:(last._max.versionNumber??0)+1,title:'Synthetic11+1',contentHash:'c'.repeat(64),structure:structure as unknown as Prisma.InputJsonValue,status:'PUBLISHED',publishedAt:new Date()}});
    const payloadHash='a'.repeat(64);
    const snapshot={...evaluation,reviewState:'ADMIN_PUBLISHED',questionnaireContentHash:v.contentHash,answerPayloadHash:payloadHash,resultBand:{id:evaluation.profile!.id,title:evaluation.profile!.title,riskLevel:'NONE',requiresReview:false},answers};
    return db.patientAssessmentSubmission.create({data:{patientId:p.profile.id,assessmentVersionId:v.id,attemptNumber:1,state:'COMPLETE',completedAt:new Date(),completionPayloadHash:payloadHash,completionIdempotencyKey:randomUUID(),resultSnapshot:snapshot as unknown as Prisma.InputJsonValue}});
  }
  it('Mezaj exact result recommendations support11+1 canonical IDs, private bodies, reverse pairs and source tamper without older fallback', async()=>{
    const f=await setup(),p=await patient(),q=await patient(),service=app.get(ProgramMezajService);
    await service.settings(f.definition.id,ctx(),{expectedRevision:0,enabled:true,icon:'compass',pairs:['damavi/safravi']});
    const s=await dimensionalResult(p);
    const r=await req('GET',`patients/me/program-recommendations?submissionId=${s.id}`,p);expect(r.statusCode,r.body).toBe(200);expect(r.json()).toMatchObject({status:'READY',primary:'damavi',secondary:'safravi',items:[{programDefinitionId:f.definition.id,state:'BUY',icon:'compass'}]});expect(r.body).not.toContain(f.input.body);
    expect((await req('GET',`patients/me/program-recommendations?submissionId=${s.id}`,q)).statusCode).toBe(404);
    const reversed=await dimensionalResult(p,true);const fresh=await req('GET','patients/me/program-recommendations',p);expect(fresh.json()).toMatchObject({primary:'safravi',secondary:'damavi',items:[]});
    expect((await req('GET',`patients/me/program-recommendations?submissionId=${s.id}`,p)).json().items).toHaveLength(1);
    const snapshot=reversed.resultSnapshot as Record<string,unknown>;await db.patientAssessmentSubmission.create({data:{patientId:p.profile.id,assessmentVersionId:reversed.assessmentVersionId,attemptNumber:2,state:'COMPLETE',completedAt:new Date(),completionPayloadHash:'a'.repeat(64),completionIdempotencyKey:randomUUID(),resultSnapshot:{...snapshot,answerPayloadHash:'b'.repeat(64)} as Prisma.InputJsonValue}});
    expect((await req('GET','patients/me/program-recommendations',p)).json()).toMatchObject({status:'RESULT_UNSUPPORTED',items:[]});
    expect((await req('GET','patients/me/commerce/recommendations?submissionId='+s.id,p)).json()).toMatchObject({primary:'damavi',secondary:'safravi'});
    await purchase(f,q);await dimensionalResult(q);expect((await req('GET','patients/me/program-recommendations',q)).json().items[0].state).toBe('PENDING');
  },20000);
  it('Mezaj config serializes edits, enforces clinic/auth/shape, and owned library survives placement removal and tariff retirement',async()=>{
    const f=await setup('0','PERPETUAL'),p=await patient(),q=await patient(),service=app.get(ProgramMezajService);
    const config={expectedRevision:0,enabled:true,icon:'leaf' as const,pairs:['damavi/safravi']};
    const results=await Promise.allSettled([service.settings(f.definition.id,ctx(),config),service.settings(f.definition.id,ctx(),config)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const outsider=await req('GET',`admin/program-definitions/${f.definition.id}/mezaj`,p);expect(outsider.statusCode).toBe(403);
    await dimensionalResult(p);const pending=await purchase(f,p);expect(pending.intent.status).toBe('PAID');
    const recommendations=await req('GET','patients/me/program-recommendations',p);expect(recommendations.json().items[0].state).toBe('OWNED');
    const library=await req('GET','patients/me/program-library',p);expect(library.statusCode,library.body).toBe(200);expect(library.json().items).toHaveLength(1);expect(library.json().items[0].accessAvailable).toBe(true);expect(library.body).not.toContain(f.input.body);expect((await req('GET','patients/me/program-library',q)).json().items).toEqual([]);
    await service.settings(f.definition.id,ctx(),{...config,expectedRevision:1,enabled:false,pairs:[]});await req('POST',`admin/program-offerings/${f.pub.id}/retire`);
    expect((await req('GET','patients/me/program-library',p)).json().items[0].accessAvailable).toBe(true);
    expect((await req('GET','patients/me/program-recommendations',p)).json().items).toEqual([]);
    const bad=await app.inject({method:'PUT',url:`/v1/admin/program-definitions/${f.definition.id}/mezaj`,headers:{authorization:`Bearer ${admin.token}`},payload:{...config,expectedRevision:2,pairs:['wrong/pair']}});expect(bad.statusCode).toBe(400);
    await expect(db.programMezajPresentation.update({where:{programDefinitionId:f.definition.id},data:{pairs:['wrong/pair']}})).rejects.toThrow();
  },20000);
  it('catalog has exact terms/safety/current price, no curriculum or medical intake/age gate', async () => {
    const f = await setup(), p = await patient(), r = await req('GET', `patients/me/program-offerings/${f.pub.id}`, p); expect(r.statusCode, r.body).toBe(200); expect(r.json()).toMatchObject({ amountRial: '50000', educationalOnly: true, ordinaryRefunds: false, terms: { id: f.terms.id }, termsConsent: null }); expect(r.body).not.toContain(f.input.body); expect(await db.patientMedicalIntake.count({ where: { patientId: p.profile.id } })).toBe(0);
    const list = await req('GET', 'patients/me/program-offerings?pageSize=1', p); expect(list.statusCode, list.body).toBe(200); expect(list.json().items).toHaveLength(1); const empty = await req('GET', 'patients/me/program-offerings?page=10000&pageSize=50', p); expect(empty.json().total).toBe(list.json().total); expect(empty.json().items).toEqual([]);
  }, 15_000);
  it('free program atomically grants exactly one owned perpetual curriculum without ledger/provider/clinical record', async () => {
    const f = await setup('0', 'PERPETUAL'), p = await patient(), before = await Promise.all([db.walletJournal.count(), db.billingGatewayAttempt.count(), db.treatmentPlan.count()]), i = await purchase(f, p); expect(i.intent).toMatchObject({ status: 'PAID', method: 'FREE', amountRial: '0', purpose: 'PROGRAM' }); const g = await grant(p, i.intent.programPurchaseId); expect(g).toMatchObject({ accessAvailable: true, endsAt: null });
    const r = await req('GET', `patients/me/program-access-grants/${g.id}/content`, p); expect(r.statusCode, r.body).toBe(200); expect(r.json()).toMatchObject({ body: f.input.body, educationalOnly: true, contentHash: f.definition.contentHash }); expect(await Promise.all([db.walletJournal.count(), db.billingGatewayAttempt.count(), db.treatmentPlan.count()])).toEqual(before);
    const home = await req('GET', 'patients/me/journey', p); expect(home.statusCode, home.body).toBe(200); expect(home.json().programPurchases.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: i.intent.programPurchaseId, accessGrantId: g.id, accessAvailable: true })])); expect(home.body).not.toContain(f.input.body);
  }, 15_000);
  it('wallet debit precedes one grant and a 30-day DB-clock period, receipts survive session change', async () => {
    const f = await setup(), p = await patient(), i = await paid(f, p), g = await db.programAccessGrant.findUniqueOrThrow({ where: { id: i.access.id } }); expect(g.endsAt!.getTime() - g.grantedAt.getTime()).toBe(30 * 86400000); const j = await db.walletJournal.findUniqueOrThrow({ where: { reference: `intent:${i.intent.id}:debit` } }); expect(j.deltaRial).toBe(-50000n); expect(g.walletJournalId).toBe(j.id);
    const session = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT'], p.userId); const recovered = await req('GET', `patients/me/program-access-grants/${g.id}/content`, { ...p, ...session }); expect(recovered.statusCode, recovered.body).toBe(200); const [edge] = await db.$queryRaw<{ before: boolean; ended: boolean }[]>(Prisma.sql`SELECT program_grant_readable(${g.id}::uuid,${p.profile.id}::uuid,${new Date(g.endsAt!.getTime() - 1)}::timestamptz) AS before,program_grant_readable(${g.id}::uuid,${p.profile.id}::uuid,${g.endsAt}::timestamptz) AS ended`); expect(edge).toEqual({ before: true, ended: false });
  }, 15_000);
  it('concurrent same-key create/pay retry and different-key duplicate attempts produce one purchase/debit/grant', async () => {
    const f = await setup(), p = await patient(), consent = await accept(f, p), input = { publicationId: f.pub.id, publicationHash: f.pub.publicationHash, termsConsentRecordId: consent.id }, key = randomUUID(), creates = await Promise.all(Array.from({ length: 6 }, () => req('POST', 'patients/me/billing/program-intents', p, input, key))); for (const r of creates) expect(r.statusCode, r.body).toBe(201); expect(new Set(creates.map(r => r.json().id)).size).toBe(1); const i = creates[0]!.json(); expect((await req('POST', 'patients/me/billing/program-intents', p, input)).statusCode).toBe(409); await fund(p);
    const payKey = randomUUID(), payments = await Promise.all(Array.from({ length: 6 }, () => req('POST', `patients/me/billing/intents/${i.id}/wallet-payment`, p, undefined, payKey))); for (const r of payments) expect(r.statusCode, r.body).toBe(201); expect(await db.programPurchase.count({ where: { patientId: p.profile.id } })).toBe(1); expect(await db.programAccessGrant.count({ where: { patientId: p.profile.id } })).toBe(1); expect(await db.walletJournal.count({ where: { reference: `intent:${i.id}:debit` } })).toBe(1); expect((await req('POST', 'patients/me/billing/program-intents', p, input)).statusCode).toBe(409);
    expect((await req('POST', 'patients/me/billing/program-intents', p, { ...input, termsConsentRecordId: randomUUID() }, key)).statusCode).toBe(409);
  }, 20_000);
  it('exact terms retries/current reuse remain canonical after policy retirement, changed payload denied', async () => {
    const f = await setup(), p = await patient(), key = randomUUID(), a = await accept(f, p, key), alias = randomUUID(), b = await accept(f, p, alias); expect(b).toEqual(a); await db.consentPolicyVersion.update({ where: { id: f.terms.id }, data: { status: 'RETIRED', retiredAt: new Date() } }); expect(await accept(f, p, key)).toEqual(a); expect(await accept(f, p, alias)).toEqual(a);
    expect((await req('POST', 'patients/me/program-consents', p, { policyVersionId: f.terms.id, contentHash: '0'.repeat(64), accepted: true }, alias)).statusCode).toBe(409); expect(await db.patientConsentRecord.count({ where: { patientId: p.profile.id, policyVersionId: f.terms.id } })).toBe(1);
  }, 15_000);
  it('own independent role/session/scope required and other users never read receipts or private curriculum', async () => {
    const f = await setup('0'), p = await patient(), q = await patient(), i = await purchase(f, p), g = await grant(p, i.intent.programPurchaseId), impostor = await patient(false); for (const path of [`patients/me/program-purchases/${i.intent.programPurchaseId}`, `patients/me/program-access-grants/${g.id}/content`]) { const r = await req('GET', path, q); expect(r.statusCode, r.body).toBe(404); expect(r.body).not.toContain(f.input.body); }
    for (const who of [admin, doctor, impostor]) expect((await req('GET', `patients/me/program-offerings/${f.pub.id}`, who)).statusCode).toBe(403); await db.session.update({ where: { id: p.sessionId }, data: { revokedAt: new Date(), revokedReason: 'LOGOUT' } }); expect((await req('GET', `patients/me/program-access-grants/${g.id}/content`, p)).statusCode).toBe(401); expect((await app.inject({ method: 'GET', url: '/v1/patients/me/program-offerings' })).statusCode).toBe(401);
  }, 15_000);
  it('strict input prevents price/scope overrides, fabricated or foreign-owned acceptance and free bypass', async () => {
    const f = await setup(), p = await patient(), q = await patient(), c = await accept(f, p), other = await accept(f, q), input = { publicationId: f.pub.id, publicationHash: f.pub.publicationHash, termsConsentRecordId: c.id }; for (const patch of [{ amountRial: '0' }, { patientId: q.profile.id }, { clinicId }, { accessDurationDays: 3650 }, { method: 'FREE' }]) expect((await req('POST', 'patients/me/billing/program-intents', p, { ...input, ...patch })).statusCode).toBe(400);
    for (const patch of [{ termsConsentRecordId: other.id }, { termsConsentRecordId: randomUUID() }, { publicationHash: '0'.repeat(64) }]) expect((await req('POST', 'patients/me/billing/program-intents', p, { ...input, ...patch })).statusCode).toBe(409); for (const query of ['page=0', 'pageSize=51', 'clinicId=' + clinicId]) expect((await req('GET', `patients/me/program-offerings?${query}`, p)).statusCode).toBe(400);
    expect((await req('POST', 'patients/me/program-consents', p, { policyVersionId: f.terms.id, contentHash: f.terms.contentHash, accepted: false })).statusCode).toBe(400); const i = await purchase(f, p); await expect(db.billingIntent.update({ where: { id: i.intent.id }, data: { status: 'PAID', method: 'FREE', paidAt: new Date() } })).rejects.toThrow(); expect(await db.programAccessGrant.count({ where: { patientId: p.profile.id } })).toBe(0);
  }, 15_000);
  it('insufficient/frozen wallet leaves purchase unpaid and issues no grant or debit', async () => {
    const f = await setup(), p = await patient(), i = await purchase(f, p); const empty = await req('POST', `patients/me/billing/intents/${i.intent.id}/wallet-payment`, p); expect(empty.statusCode, empty.body).toBe(409); await fund(p); const s = await wallet.summary(p.profile); await wallet.setStatus(ctx(), p.profile.id, { frozen: true, expectedVersion: s.version, reason: 'Synthetic freeze' }, randomUUID()); const frozen = await req('POST', `patients/me/billing/intents/${i.intent.id}/wallet-payment`, p); expect(frozen.statusCode, frozen.body).toBe(409); expect(await grant(p, i.intent.programPurchaseId)).toBeNull(); expect(await db.walletJournal.count({ where: { reference: `intent:${i.intent.id}:debit` } })).toBe(0);
  }, 15_000);
  it('replacement preserves unexpired original quote and grants exact old price/version; new price is explicit', async () => {
    const f = await setup(), p = await patient(), i = await purchase(f, p), replacement = await publish({ ...f.config, amountRial: '90000' }); await fund(p); const r = await req('POST', `patients/me/billing/intents/${i.intent.id}/wallet-payment`, p); expect(r.statusCode, r.body).toBe(201); expect(r.json().amountRial).toBe('50000'); expect((await req('GET', `patients/me/program-offerings/${replacement.id}`, p)).json().amountRial).toBe('90000'); const g = await grant(p, i.intent.programPurchaseId); expect((await req('GET', `patients/me/program-access-grants/${g.id}/content`, p)).json().contentHash).toBe(f.definition.contentHash);
  }, 15_000);
  it('manual sale/terms retirement preserves paid content; clinical revocation suppresses body and retains receipt', async () => {
    const f = await setup(), p = await patient(), i = await paid(f, p); expect((await req('POST', `admin/program-offerings/${f.pub.id}/retire`)).statusCode).toBe(201); await db.consentPolicyVersion.update({ where: { id: f.terms.id }, data: { status: 'RETIRED', retiredAt: new Date() } }); expect((await req('GET', `patients/me/program-access-grants/${i.access.id}/content`, p)).statusCode).toBe(200); expect((await req('POST', `clinical/program-definitions/${f.definition.id}/revoke`, doctor)).statusCode).toBe(201);
    const r = await req('GET', `patients/me/program-access-grants/${i.access.id}/content`, p); expect(r.statusCode, r.body).toBe(409); expect(r.body).not.toContain(f.input.body); expect((await grant(p, i.intent.programPurchaseId)).accessAvailable).toBe(false); expect((await req('GET', 'patients/me/journey', p)).json().programPurchases.items[0]).toMatchObject({ paymentState: 'PAID', accessAvailable: false });
  }, 15_000);
  it('buys a fixed-terms service without manual setup and retains permanent access after a new login', async () => {
    const f = await setup('50000', 'PERPETUAL', true), p = await patient();
    expect(f.definition.contentReferences).toEqual([]);
    expect(f.pub.retentionPolicyRef).toBeNull();
    expect(f.pub.configurationReady).toBe(true);
    const i = await paid(f, p), g = i.access;
    expect(f.terms.policyKey).toBe('READY_PROGRAM_PURCHASE_TERMS');
    expect(g.endsAt).toBeNull();
    await expect(db.patientConsentRecord.delete({ where: { id: i.input.termsConsentRecordId } })).rejects.toThrow();
    expect(g).not.toBeNull();
    const read = await req('GET', `patients/me/program-access-grants/${g.id}/content`, p);
    expect(read.statusCode, read.body).toBe(200);
    expect(read.json().body).toBe(f.input.body);
    const refreshed = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT'], p.userId);
    const recovered = await req('GET', `patients/me/program-access-grants/${g.id}/content`, { ...p, ...refreshed });
    expect(recovered.statusCode, recovered.body).toBe(200);
    expect(recovered.json().body).toBe(f.input.body);
  }, 15_000);
  it('ready services retain reviewer checks and ignore revoked legacy educational references', async () => {
    const f = await setup('0'), p = await patient(), i = await purchase(f, p), g = await grant(p, i.intent.programPurchaseId); await db.clinicalRolePermission.delete({ where: { roleId_permission: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' } } }); try { expect((await req('GET', `patients/me/program-access-grants/${g.id}/content`, p)).statusCode).toBe(409); } finally { await db.clinicalRolePermission.create({ data: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' } }); }
    expect((await req('POST', `clinical/guidance-content/${f.content.id}/revoke`, doctor)).statusCode).toBe(201); expect((await req('GET', `patients/me/program-access-grants/${g.id}/content`, p)).statusCode).toBe(200); expect((await req('POST', 'admin/program-offerings/preview', admin, f.config)).json().configurationReady).toBe(true); expect(await db.programAccessGrant.count({ where: { purchaseId: i.intent.programPurchaseId } })).toBe(1);
  }, 15_000);
  it('server Verify controls bank fulfilment; callback hint/wrong token cannot grant and concurrent verify grants once', async () => {
    const f = await setup(), p = await patient(), i = await purchase(f, p), a = await gateway.create(p.userId, i.intent.id, randomUUID(), ctx(p)), stored = await db.billingGatewayAttempt.findUniqueOrThrow({ where: { id: a.id } }); await expect(gateway.callback({ OrderId: stored.providerOrderId.toString(), Token: 'wrong', ResCode: '0' })).rejects.toThrow(); expect(await grant(p, i.intent.programPurchaseId)).toBeNull(); await gateway.callback({ OrderId: stored.providerOrderId.toString(), Token: stored.providerToken!, ResCode: '17' }); await Promise.all(Array.from({ length: 6 }, () => gateway.verify(a.id))); expect((await billing.get(p.userId, i.intent.id)).status).toBe('PAID'); const g = await db.programAccessGrant.findFirstOrThrow({ where: { purchaseId: i.intent.programPurchaseId } }); expect(g).toMatchObject({ method: 'GATEWAY', gatewayAttemptId: a.id }); expect(await db.programAccessGrant.count({ where: { purchaseId: i.intent.programPurchaseId } })).toBe(1);
  }, 20_000);
  it('wrong verified amount and failed/ambiguous provider responses never issue access', async () => {
    const f = await setup(); for (const mode of ['WRONG_AMOUNT', 'FAILED', 'TIMEOUT'] as const) { const p = await patient(), i = await purchase(f, p), a = await gateway.create(p.userId, i.intent.id, randomUUID(), ctx(p)); providerMode = mode; try { await gateway.verify(a.id); } catch { /* Existing shared engine surfaces mismatch/reconciliation errors. */ } finally { providerMode = 'SUCCESS'; } expect(await grant(p, i.intent.programPurchaseId)).toBeNull(); expect((await billing.get(p.userId, i.intent.id)).status).toBe('PENDING'); }
  }, 20_000);
  it('unfulfillable verified payment compensates existing wallet once without content entitlement', async () => {
    const f = await setup(), p = await patient(), i = await purchase(f, p), a = await gateway.create(p.userId, i.intent.id, randomUUID(), ctx(p)); expect((await req('POST', `admin/program-offerings/${f.pub.id}/retire`)).statusCode).toBe(201); await gateway.verify(a.id); await gateway.verify(a.id); expect((await billing.get(p.userId, i.intent.id)).status).toBe('COMPENSATED'); expect(await grant(p, i.intent.programPurchaseId)).toBeNull(); expect((await wallet.summary(p.profile)).balanceRial).toBe('50000'); expect(await db.walletJournal.count({ where: { reference: `gateway:${a.id}:credit` } })).toBe(1);
  }, 15_000);
  it('ordinary successful cancellation/refund and direct SQL refund are denied without changing proved access', async () => {
    const f = await setup(), p = await patient(), i = await paid(f, p); expect((await req('POST', `patients/me/billing/intents/${i.intent.id}/cancel`, p)).statusCode).toBe(409); const r = await req('POST', `admin/billing/intents/${i.intent.id}/refunds`, admin, { amountRial: '50000', reason: 'Synthetic denied refund' }); expect(r.statusCode, r.body).toBe(409); expect(r.json().code).toBe('PROGRAM_REFUND_NOT_ALLOWED'); await expect(db.billingRefund.create({ data: { intentId: i.intent.id, amountRial: 1n, status: 'MANUAL_REQUIRED', reason: 'Synthetic invalid', idempotencyKey: randomUUID(), fingerprint: 'a'.repeat(64) } })).rejects.toThrow(); expect((await grant(p, i.intent.programPurchaseId)).accessAvailable).toBe(true);
  }, 15_000);
  it('retained SQL proof prevents reset, transfer, orphaned purchase and forged wallet/free grant', async () => {
    const f = await setup(), p = await patient(), i = await paid(f, p), g = await db.programAccessGrant.findUniqueOrThrow({ where: { id: i.access.id } }); for (const op of [() => db.programAccessGrant.delete({ where: { id: g.id } }), () => db.programAccessGrant.update({ where: { id: g.id }, data: { endsAt: new Date() } }), () => db.programPurchase.delete({ where: { id: i.intent.programPurchaseId } }), () => db.programPurchase.update({ where: { id: i.intent.programPurchaseId }, data: { patientId: randomUUID() } }), () => db.billingIntent.delete({ where: { id: i.intent.id } }), () => db.billingIntent.update({ where: { id: i.intent.id }, data: { status: 'PENDING' } })]) await expect(op()).rejects.toThrow(); const terms = await db.patientConsentRecord.findUniqueOrThrow({ where: { id: i.input.termsConsentRecordId } }); await expect(db.patientConsentRecord.delete({ where: { id: terms.id } })).rejects.toThrow(); await expect(db.patientConsentRecord.update({ where: { id: terms.id }, data: { withdrawnAt: new Date(), withdrawnByUserId: p.userId, withdrawnBySessionId: p.sessionId } })).rejects.toThrow();
    const q = await patient(), pending = await purchase(f, q); await expect(db.$transaction(async tx => { await tx.programAccessGrant.create({ data: { clinicId, patientId: q.profile.id, purchaseId: pending.intent.programPurchaseId, method: 'FREE', grantedAt: (await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now, endsAt: new Date(Date.now() + 30 * 86400000) } }); await tx.billingIntent.update({ where: { id: pending.intent.id }, data: { status: 'PAID', method: 'FREE', paidAt: new Date() } }); })).rejects.toThrow(); expect(await grant(q, pending.intent.programPurchaseId)).toBeNull();
  }, 20_000);
  it('database grant time stays correct when application clock is ninety seconds ahead', async () => {
    const f = await setup('0'), p = await patient(), now = (await db.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now; vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(now.getTime() + 90000)); try { const i = await purchase(f, p), g = await grant(p, i.intent.programPurchaseId); expect(Date.parse(g.grantedAt)).toBeLessThan(now.getTime() + 30000); expect(Date.parse(g.endsAt) - Date.parse(g.grantedAt)).toBe(30 * 86400000); } finally { vi.useRealTimers(); }
  }, 15_000);
  it('audit failure rolls back acceptance/grant/payment and withholds curriculum', async () => {
    const f = await setup(), p = await patient(), i = await purchase(f, p); await fund(p); await db.$executeRawUnsafe(`CREATE FUNCTION program_purchase_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action LIKE 'PROGRAM_%' THEN RAISE EXCEPTION 'synthetic program audit failure'; END IF; RETURN NEW; END $$`); await db.$executeRawUnsafe('CREATE TRIGGER program_purchase_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION program_purchase_test_audit_fail()'); try { const pay = await req('POST', `patients/me/billing/intents/${i.intent.id}/wallet-payment`, p); expect(pay.statusCode, pay.body).toBe(500); expect(await db.programAccessGrant.count({ where: { purchaseId: i.intent.programPurchaseId } })).toBe(0); expect(await db.walletJournal.count({ where: { reference: `intent:${i.intent.id}:debit` } })).toBe(0); const q = await patient(), acceptResponse = await req('POST', 'patients/me/program-consents', q, { policyVersionId: f.terms.id, contentHash: f.terms.contentHash, accepted: true }); expect(acceptResponse.statusCode).toBe(500); expect(await db.patientConsentRecord.count({ where: { patientId: q.profile.id } })).toBe(0); } finally { await db.$executeRawUnsafe('DROP TRIGGER program_purchase_test_audit_fail ON audit_events'); await db.$executeRawUnsafe('DROP FUNCTION program_purchase_test_audit_fail()'); }
    const pay = await req('POST', `patients/me/billing/intents/${i.intent.id}/wallet-payment`, p); expect(pay.statusCode, pay.body).toBe(201); const g = await grant(p, i.intent.programPurchaseId); expect((await req('GET', `patients/me/program-access-grants/${g.id}/content`, p)).statusCode).toBe(200);
  }, 20_000);
  it('expired bank quote compensates once and a later explicit purchase can issue fresh access', async () => {
    const f = await setup(), p = await patient(), service = app.get(ProgramPurchaseService), prepare = service.prepare.bind(service);
    const spy = vi.spyOn(service, 'prepare').mockImplementationOnce(async (...args) => ({ ...await prepare(...args), expiresAt: (await db.$queryRaw<{ expiry: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+INTERVAL '2 seconds' AS expiry`))[0]!.expiry }));
    let i: Awaited<ReturnType<typeof purchase>>; try { i = await purchase(f, p); } finally { spy.mockRestore(); }
    const a = await gateway.create(p.userId, i!.intent.id, randomUUID(), ctx(p)); let expired = false;
    for (let n = 0; n < 15 && !expired; n++) { await db.$queryRaw(Prisma.sql`SELECT pg_sleep(0.25)::text`); expired = !!(await db.$queryRaw<{ expired: boolean }[]>(Prisma.sql`SELECT expires_at<=CURRENT_TIMESTAMP AS expired FROM billing_intents WHERE id=${i!.intent.id}::uuid`))[0]?.expired; }
    expect(expired).toBe(true); await billing.expire(); await gateway.verify(a.id); await gateway.verify(a.id); expect((await billing.get(p.userId, i!.intent.id)).status).toBe('COMPENSATED'); expect(await grant(p, i!.intent.programPurchaseId)).toBeNull(); expect((await wallet.summary(p.profile)).balanceRial).toBe('50000');
    const later = await purchase(f, p); const r = await req('POST', `patients/me/billing/intents/${later.intent.id}/wallet-payment`, p); expect(r.statusCode, r.body).toBe(201); expect(await db.programPurchase.count({ where: { patientId: p.profile.id } })).toBe(2); expect(await db.programAccessGrant.count({ where: { patientId: p.profile.id } })).toBe(1);
  }, 20_000);
  it('abandoned unpaid checkout can be retried explicitly; paid no-refund policy does not debit an abandoned purchase', async () => {
    const f = await setup(), p = await patient(), i = await purchase(f, p), cancel = await req('POST', `patients/me/billing/intents/${i.intent.id}/cancel`, p); expect(cancel.statusCode, cancel.body).toBe(201); expect(cancel.json().status).toBe('CANCELLED'); const next = await purchase(f, p); expect(next.intent.id).not.toBe(i.intent.id); expect(await grant(p, i.intent.programPurchaseId)).toBeNull();
  }, 15_000);
  it('custom professional service cannot be sold through ready-program checkout', async () => {
    const f = await setup(), name = randomUUID(), service = await db.service.create({ data: { clinicId, name, canonicalName: name, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }), ds = await db.doctorService.create({ data: { clinicId, doctorId: doctor.doctorId!, serviceId: service.id, visitMode: 'ONLINE', durationMinutes: 30, priceAmount: 70000, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
    const created = await req('POST', 'admin/program-definitions/versions', admin, { ...f.input, programKey: `PROGRAM_${randomUUID().replaceAll('-', '').toUpperCase()}`, kind: 'CUSTOM_PROFESSIONAL_PLAN', doctorServiceId: ds.id }); expect(created.statusCode, created.body).toBe(201); const d = created.json(); expect((await req('POST', `clinical/program-definitions/${d.id}/approve`, doctor, { contentHash: d.contentHash, reviewedProgramAndSafety: true, noAutomaticTherapyActivation: true })).statusCode).toBe(201);
    const pub = await publish({ ...f.config, programDefinitionId: d.id, amountRial: '70000', accessMode: 'ONE_DELIVERY', accessDurationDays: null }), p = await patient(), c = await accept(f, p); expect((await req('GET', `patients/me/program-offerings/${pub.id}`, p)).statusCode).toBe(404); expect((await req('POST', 'patients/me/billing/program-intents', p, { publicationId: pub.id, publicationHash: pub.publicationHash, termsConsentRecordId: c.id })).statusCode).toBe(404); expect(await db.programPurchase.count({ where: { patientId: p.profile.id } })).toBe(0);
  }, 20_000);
  it('a reviewed replacement updates a free owner without creating another purchase or grant', async () => {
    const f = await setup('0'), p = await patient(), first = await purchase(f, p), old = await grant(p, first.intent.programPurchaseId);
    const next = await nextVersion(f), consent = await accept(next, p);
    const duplicate = await req('POST', 'patients/me/billing/program-intents', p, { publicationId: next.pub.id, publicationHash: next.pub.publicationHash, termsConsentRecordId: consent.id });
    expect(duplicate.statusCode).toBe(409);
    expect((await req('GET', `patients/me/program-access-grants/${old.id}/content`, p)).json()).toMatchObject({ body: 'Updated private curriculum for every current owner.', purchasedDefinitionId: f.definition.id, programDefinitionId: next.definition.id });
    expect(await db.programAccessGrant.count({ where: { patientId: p.profile.id } })).toBe(1);
    expect(await db.programPurchase.count({ where: { patientId: p.profile.id } })).toBe(1);
  }, 20_000);
  it('Home recommends the owned program before medical assessment eligibility while keeping onboarding first', async () => {
    const f = await setup('0'), p = await patient(); await db.userProfile.upsert({ where: { userId: p.userId }, create: { userId: p.userId, firstName: 'Synthetic', lastName: 'Patient' }, update: { userId: p.userId, firstName: 'Synthetic', lastName: 'Patient' } });
    const policy = await db.consentPolicyVersion.findFirstOrThrow({ where: { clinicId, policyKey: 'MEDICAL_INTAKE_PROCESSING', locale: 'fa-IR', status: 'ACTIVE' } }), consent = await db.patientConsentRecord.create({ data: { patientId: p.profile.id, policyVersionId: policy.id, contentHash: policy.contentHash, acceptedByUserId: p.userId, acceptedBySessionId: p.sessionId, acceptanceIdempotencyKey: randomUUID() } });
    const intake = await db.patientMedicalIntake.create({ data: { clinicId, patientId: p.profile.id, currentRevisionNumber: 1, completedRevisionNumber: 1, submissionState: 'COMPLETE' } }); await db.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: 1, assignedSchemaVersion: 1, revisionState: 'COMPLETE', birthDate: new Date('1990-01-01'), sexAtBirth: 'FEMALE', allergyReport: { status: 'NONE', items: [] }, chronicConditionReport: { status: 'NONE', items: [] }, currentMedicationReport: { status: 'NONE', items: [] }, completedAt: new Date(), completedConsentRecordId: consent.id, mutationOperation: 'COMPLETE', mutationKey: randomUUID(), recordingMode: 'PATIENT_ENTRY', reportedPatientId: p.profile.id, payloadHash: 'a'.repeat(64) } });
    const i = await purchase(f, p), g = await grant(p, i.intent.programPurchaseId), home = await req('GET', 'patients/me/journey', p); expect(home.statusCode, home.body).toBe(200); expect(home.json()).toMatchObject({ onboarding: { isComplete: true }, nextAction: { code: 'OPEN_PROGRAM', resourceId: g.id } });
  }, 20_000);
  it('late success on a separately reconciled old bank attempt compensates once without duplicating the valid grant', async () => {
    const f = await setup(), p = await patient(), i = await purchase(f, p), first = await gateway.create(p.userId, i.intent.id, randomUUID(), ctx(p)); providerMode = 'TIMEOUT'; await gateway.verify(first.id); providerMode = 'SUCCESS'; await gateway.resolveFailed(ctx(), first.id, 'Synthetic reviewed failure evidence', randomUUID());
    const second = await gateway.create(p.userId, i.intent.id, randomUUID(), ctx(p)); await gateway.verify(second.id); const g = await grant(p, i.intent.programPurchaseId), old = await db.billingGatewayAttempt.findUniqueOrThrow({ where: { id: first.id } }); await gateway.callback({ OrderId: old.providerOrderId.toString(), Token: old.providerToken!, ResCode: '0' }); await gateway.verify(first.id);
    expect((await billing.get(p.userId, i.intent.id)).status).toBe('PAID'); expect((await grant(p, i.intent.programPurchaseId)).id).toBe(g.id); expect((await wallet.summary(p.profile)).balanceRial).toBe('50000'); expect(await db.programAccessGrant.count({ where: { purchaseId: i.intent.programPurchaseId } })).toBe(1); expect((await db.billingGatewayAttempt.findUniqueOrThrow({ where: { id: first.id } })).compensated).toBe(true);
  }, 20_000);
  it('deferred proof rejects another purchase wallet debit even with a valid live quote and exact grant period', async () => {
    const f = await setup(), p = await patient(), valid = await paid(f, p), g = await db.programAccessGrant.findUniqueOrThrow({ where: { id: valid.access.id } }), q = await patient(), pending = await purchase(f, q);
    await expect(db.$transaction(async tx => { const now = (await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now; await tx.programAccessGrant.create({ data: { clinicId, patientId: q.profile.id, purchaseId: pending.intent.programPurchaseId, method: 'WALLET', walletJournalId: g.walletJournalId, grantedAt: now, endsAt: new Date(now.getTime() + 30 * 86400000) } }); await tx.billingIntent.update({ where: { id: pending.intent.id }, data: { status: 'PAID', method: 'WALLET', paidAt: new Date() } }); })).rejects.toThrow(/Actual exact immutable program wallet debit required/);
    expect(await grant(q, pending.intent.programPurchaseId)).toBeNull(); expect((await billing.get(q.userId, pending.intent.id)).status).toBe('PENDING');
  }, 20_000);
  it('SQL guard rejects program acceptance forged with a different patient session', async () => {
    const f = await setup(), p = await patient(), q = await patient(); await expect(db.patientConsentRecord.create({ data: { patientId: p.profile.id, policyVersionId: f.terms.id, contentHash: f.terms.contentHash, acceptedByUserId: p.userId, acceptedBySessionId: q.sessionId, acceptanceIdempotencyKey: randomUUID() } })).rejects.toThrow(/Current independent program terms identity/); expect(await db.patientConsentRecord.count({ where: { patientId: p.profile.id } })).toBe(0);
  }, 15_000);
  it('retained paid program from a real foreign clinic is neither listed nor readable by the local patient', async () => {
    const original = { clinicId, admin, doctor }, foreign = await db.clinic.create({ data: { name: 'Synthetic foreign program clinic', status: 'INACTIVE', timeZone: 'Asia/Tehran' } }); let foreignPub = '', foreignPurchase = '', foreignGrant = '';
    await db.clinic.update({ where: { id: original.clinicId }, data: { status: 'INACTIVE' } }); try { await db.clinic.update({ where: { id: foreign.id }, data: { status: 'ACTIVE' } }); clinicId = foreign.id; admin = await actor('ADMIN'); doctor = await actor('DOCTOR'); const f = await setup('0'), p = await patient(), i = await purchase(f, p), g = await grant(p, i.intent.programPurchaseId); foreignPub = f.pub.id; foreignPurchase = i.intent.programPurchaseId; foreignGrant = g.id; } finally { await db.clinic.update({ where: { id: foreign.id }, data: { status: 'INACTIVE' } }); await db.clinic.update({ where: { id: original.clinicId }, data: { status: 'ACTIVE' } }); clinicId = original.clinicId; admin = original.admin; doctor = original.doctor; }
    const p = await patient(); for (const path of [`patients/me/program-offerings/${foreignPub}`, `patients/me/program-purchases/${foreignPurchase}`, `patients/me/program-access-grants/${foreignGrant}/content`]) expect((await req('GET', path, p)).statusCode).toBe(404); expect((await req('GET', 'patients/me/program-purchases', p)).json().items).toEqual([]); expect((await req('GET', 'patients/me/journey', p)).json().programPurchases.items).toEqual([]);
  }, 25_000);
  it('purchase rechecks exact terms after waiting for the shared publication lock', async () => {
    const f = await setup(), p = await patient(), c = await accept(f, p), input = { publicationId: f.pub.id, publicationHash: f.pub.publicationHash, termsConsentRecordId: c.id }; let ready!: () => void, release!: () => void, pid = 0;
    const locked = new Promise<void>(resolve => { ready = resolve; }), gate = new Promise<void>(resolve => { release = resolve; }), holding = db.$transaction(async tx => { pid = (await tx.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT pg_backend_pid() AS id`))[0]!.id; await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'program-publication:' + clinicId + ':' + f.definition.programKey + ':fa-IR'},0))`); ready(); await gate; }, { timeout: 15000 });
    await locked; const pending = req('POST', 'patients/me/billing/program-intents', p, input);
    try { let blocked = false; for (let n = 0; n < 50 && !blocked; n++) { blocked = !!(await db.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted AND ${pid}=ANY(pg_blocking_pids(pid))`))[0]?.n; if (!blocked) await new Promise(resolve => setTimeout(resolve, 20)); } expect(blocked).toBe(true); await db.consentPolicyVersion.update({ where: { id: f.terms.id }, data: { status: 'RETIRED', retiredAt: new Date() } }); } finally { release(); await holding; }
    const response = await pending; expect(response.statusCode, response.body).toBe(409); expect(await db.programPurchase.count({ where: { patientId: p.profile.id } })).toBe(0);
  }, 20000);
  it('content audit failure withholds the already-owned curriculum without removing the financial receipt', async () => {
    const f = await setup('0'), p = await patient(), i = await purchase(f, p), g = await grant(p, i.intent.programPurchaseId);
    await db.$executeRawUnsafe(`CREATE FUNCTION program_content_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='PROGRAM_CONTENT_READ' THEN RAISE EXCEPTION 'synthetic content audit failure'; END IF; RETURN NEW; END $$`); await db.$executeRawUnsafe('CREATE TRIGGER program_content_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION program_content_test_audit_fail()'); try { const r = await req('GET', `patients/me/program-access-grants/${g.id}/content`, p); expect(r.statusCode).toBe(500); expect(r.body).not.toContain(f.input.body); expect((await grant(p, i.intent.programPurchaseId)).accessAvailable).toBe(true); } finally { await db.$executeRawUnsafe('DROP TRIGGER program_content_test_audit_fail ON audit_events'); await db.$executeRawUnsafe('DROP FUNCTION program_content_test_audit_fail()'); }
  }, 15000);
  it('persistent patient write limiter rejects the thirty-first command without duplicating acceptance', async () => {
    const f = await setup(), p = await patient(); for (let n = 0; n < 30; n++) await accept(f, p); const r = await req('POST', 'patients/me/program-consents', p, { policyVersionId: f.terms.id, contentHash: f.terms.contentHash, accepted: true }); expect(r.statusCode, r.body).toBe(429); expect(r.json().code).toBe('PROGRAM_RATE_LIMITED'); expect(await db.patientConsentRecord.count({ where: { patientId: p.profile.id } })).toBe(1);
  }, 20000);

  async function nextVersion(f: Awaited<ReturnType<typeof setup>>) {
    const created = await req('POST', 'admin/program-definitions/versions', admin, { ...f.input, title: 'Updated synthetic service title', body: 'Updated private curriculum for every current owner.' });
    expect(created.statusCode, created.body).toBe(201); const definition = created.json();
    const approved = await req('POST', `clinical/program-definitions/${definition.id}/approve`, doctor, { contentHash: definition.contentHash, reviewedProgramAndSafety: true, noAutomaticTherapyActivation: true });
    expect(approved.statusCode, approved.body).toBe(201);
    const pub = await publish({ ...f.config, programDefinitionId: definition.id });
    return { ...f, definition, pub };
  }
  it('serves new published content to existing owners without rewriting any purchase evidence', async () => {
    const f = await setup(), p = await patient(), owned = await paid(f, p);
    const before = await db.programPurchase.findUniqueOrThrow({ where: { id: owned.intent.programPurchaseId } });
    const next = await nextVersion(f);
    const content = await req('GET', `patients/me/program-access-grants/${owned.access.id}/content`, p);
    expect(content.statusCode, content.body).toBe(200);
    expect(content.json()).toMatchObject({ purchasedDefinitionId: f.definition.id, programDefinitionId: next.definition.id, body: 'Updated private curriculum for every current owner.' });
    expect(content.headers['cache-control']).toContain('no-store');
    expect(await db.programPurchase.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
    expect((await grant(p, before.id)).endsAt).toBe(owned.access.endsAt);
    const consent = await accept(next, p);
    const duplicate = await req('POST', 'patients/me/billing/program-intents', p, { publicationId: next.pub.id, publicationHash: next.pub.publicationHash, termsConsentRecordId: consent.id });
    expect(duplicate.statusCode, duplicate.body).toBe(409);
  });
  it('keeps an issued quote payable across publication and archive, while restored sales stay paused', async () => {
    const f = await setup(), p = await patient(), pending = await purchase(f, p);
    const next = await nextVersion(f);
    const root = await db.programService.findUniqueOrThrow({ where: { clinicId_programKey_locale: { clinicId, programKey: f.definition.programKey, locale: f.definition.locale } } });
    const archive = await req('POST', `admin/program-services/${root.id}/archive`, admin, { expectedRevision: root.revision }); expect(archive.statusCode, archive.body).toBe(201);
    await fund(p);
    const payment = await req('POST', `patients/me/billing/intents/${pending.intent.id}/wallet-payment`, p); expect(payment.statusCode, payment.body).toBe(201); expect(payment.json().status).toBe('PAID');
    const access = await grant(p, pending.intent.programPurchaseId);
    expect((await req('GET', `patients/me/program-access-grants/${access.id}/content`, p)).statusCode).toBe(200);
    const restore = await req('POST', `admin/program-services/${root.id}/restore`, admin, { expectedRevision: archive.json().revision }); expect(restore.statusCode, restore.body).toBe(201);
    expect(restore.json().sellingEnabled).toBe(false);
    const [state] = await db.$queryRaw<{ available: boolean }[]>(Prisma.sql`SELECT program_publication_current(${next.pub.id}::uuid) AS available`);
    expect(state.available).toBe(false);
  });
  it('does not activate an old pending quote after the current content loses medical approval', async () => {
    const f = await setup(), p = await patient(), pending = await purchase(f, p), next = await nextVersion(f);
    expect((await req('POST', `clinical/program-definitions/${next.definition.id}/revoke`, doctor)).statusCode).toBe(201);
    await fund(p); const before = await wallet.summary(p.profile);
    expect((await req('POST', `patients/me/billing/intents/${pending.intent.id}/wallet-payment`, p)).statusCode).toBe(409);
    expect(await wallet.summary(p.profile)).toMatchObject({ balanceRial: before.balanceRial, version: before.version, frozen: before.frozen });
    expect(await db.programAccessGrant.count({ where: { purchaseId: pending.intent.programPurchaseId } })).toBe(0);
  });

  it('retains recommendation settings and recognizes an owner across content versions', async () => {
    const f = await setup('0', 'PERPETUAL', true), p = await patient();
    await app.get(ProgramMezajService).settings(f.definition.id, ctx(), { expectedRevision: 0, enabled: true, icon: 'heart', pairs: ['damavi/safravi'] });
    const original = await purchase(f, p); await dimensionalResult(p);
    const next = await nextVersion(f);
    const recommendations = await req('GET', 'patients/me/program-recommendations', p);
    expect(recommendations.statusCode, recommendations.body).toBe(200);
    expect(recommendations.json().items).toContainEqual(expect.objectContaining({ programDefinitionId: next.definition.id, state: 'OWNED', purchaseId: original.intent.programPurchaseId, icon: 'heart' }));
    expect((await req('GET', 'patients/me/program-library', p)).json().items).toContainEqual(expect.objectContaining({ title: 'Updated synthetic service title', icon: 'heart', purchaseId: original.intent.programPurchaseId }));
  }, 20000);
  it('uses profile audience only for recommendations and does not block a direct purchase', async () => {
    const f = await setup('0', 'PERPETUAL', true), p = await patient();
    await dimensionalResult(p);
    await app.get(ProgramMezajService).settings(f.definition.id, ctx(), { expectedRevision: 0, enabled: true, icon: 'book', pairs: ['damavi/safravi'] });
    const root = await db.programService.findUniqueOrThrow({ where: { clinicId_programKey_locale: { clinicId, programKey: f.definition.programKey, locale: f.definition.locale } } });
    await db.programService.update({ where: { id: root.id }, data: { audience: 'FEMALE' } });
    await db.userProfile.upsert({ where: { userId: p.userId }, create: { userId: p.userId, gender: 'MALE' }, update: { gender: 'MALE' } });
    expect((await req('GET', 'patients/me/program-recommendations', p)).json().items.some((i: { serviceId: string }) => i.serviceId === root.id)).toBe(false);
    await db.userProfile.update({ where: { userId: p.userId }, data: { gender: 'FEMALE' } });
    expect((await req('GET', 'patients/me/program-recommendations', p)).json().items.some((i: { serviceId: string }) => i.serviceId === root.id)).toBe(true);
    await db.userProfile.update({ where: { userId: p.userId }, data: { gender: null } });
    // Missing profile fields still require the existing onboarding flow at the HTTP boundary.
    expect((await req('GET', 'patients/me/program-recommendations', p)).statusCode).toBe(403);
    expect((await app.get(ProgramMezajService).recommendations(ctx(p))).items.some(i => i.serviceId === root.id)).toBe(false);
    await db.userProfile.update({ where: { userId: p.userId }, data: { gender: 'MALE' } });
    expect((await purchase(f, p)).intent.status).toBe('PAID');
  }, 20000);

  it('serializes archive behind an actual quote reservation rather than issuing a quote after archive', async () => {
    const f = await setup(), p = await patient(), consent = await accept(f, p);
    const root = await db.programService.findUniqueOrThrow({ where: { clinicId_programKey_locale: { clinicId, programKey: f.definition.programKey, locale: f.definition.locale } } });
    const { Client } = await import('pg'), gate = new Client({ connectionString: process.env.DATABASE_URL });
    const gateId = parseInt(randomUUID().replaceAll('-', '').slice(0, 7), 16);
    await gate.connect(); await gate.query('SELECT pg_advisory_lock($1)', [gateId]);
    await db.$executeRawUnsafe(`CREATE FUNCTION program_quote_test_gate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.program_definition_id='${f.definition.id}'::uuid THEN PERFORM pg_advisory_xact_lock(${gateId}); END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER program_quote_test_gate AFTER INSERT ON program_purchases FOR EACH ROW EXECUTE FUNCTION program_quote_test_gate()');
    const pending = req('POST', 'patients/me/billing/program-intents', p, { publicationId: f.pub.id, publicationHash: f.pub.publicationHash, termsConsentRecordId: consent.id });
    try {
      let blocked = false;
      for (let attempt = 0; attempt < 150; attempt++) {
        const r = await gate.query('SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype=$1 AND objid=$2::oid AND NOT granted) AS blocked', ['advisory', gateId]);
        if (r.rows[0].blocked) { blocked = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(blocked).toBe(true);
      await expect(db.$transaction(async tx => { await tx.$executeRawUnsafe("SET LOCAL lock_timeout='100ms'"); await tx.programService.update({ where: { id: root.id }, data: { archivedAt: new Date(), sellingEnabled: false } }); })).rejects.toThrow();
      await gate.query('SELECT pg_advisory_unlock($1)', [gateId]);
      expect((await pending).statusCode).toBe(201);
      const archived = await req('POST', `admin/program-services/${root.id}/archive`, admin, { expectedRevision: root.revision }); expect(archived.statusCode, archived.body).toBe(201);
    } finally {
      await gate.query('SELECT pg_advisory_unlock_all()'); await pending.catch(() => undefined);
      await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS program_quote_test_gate ON program_purchases');
      await db.$executeRawUnsafe('DROP FUNCTION IF EXISTS program_quote_test_gate()'); await gate.end();
    }
  }, 20000);
  it('publishes revised temperament settings for the same approved content without changing ownership', async () => {
    const f = await setup('0', 'PERPETUAL', true), p = await patient();
    const root = await db.programService.findUniqueOrThrow({ where: { clinicId_programKey_locale: { clinicId, programKey: f.definition.programKey, locale: f.definition.locale } } });
    await dimensionalResult(p);
    await db.programService.update({ where: { id: root.id }, data: { draft: JSON.parse(JSON.stringify({ ...root.draft as object, pairs: ['damavi/safravi'] })) } });
    await publish(f.config);
    expect((await req('GET', 'patients/me/program-recommendations', p)).json().items.some((i: { serviceId: string }) => i.serviceId === root.id)).toBe(true);
    await db.programService.update({ where: { id: root.id }, data: { draft: JSON.parse(JSON.stringify({ ...root.draft as object, pairs: ['safravi/damavi'] })) } });
    await publish(f.config);
    expect((await req('GET', 'patients/me/program-recommendations', p)).json().items.some((i: { serviceId: string }) => i.serviceId === root.id)).toBe(false);
  }, 20000);

  it('quotes a scheduled discount once and honours it when the promotion changes', async () => {
    const f = await setup('2000000'), p = await patient();
    const [clock] = await db.$queryRaw<{now: Date}[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`);
    const pub = await publish({ ...f.config, discountPercent: 25, discountStartsAt: new Date(clock.now.getTime()-60000).toISOString(), discountEndsAt: new Date(clock.now.getTime()+60000).toISOString() });
    const offer = await req('GET', `patients/me/program-offerings/${pub.id}`, p); expect(offer.json()).toMatchObject({ baseAmountRial: '2000000', discountPercent: 25, amountRial: '1500000' });
    const i = await purchase({ ...f, pub }, p); expect(i.intent.amountRial).toBe('1500000');
    const stored = await db.programPurchase.findUniqueOrThrow({ where: { id: i.intent.programPurchaseId } });
    expect(stored.snapshot).toMatchObject({ schemaVersion: 3, baseAmountRial: '2000000', amountRial: '1500000', discountPercent: 25 });
    const [later] = await db.$queryRaw<{ok:boolean}[]>(Prisma.sql`SELECT program_quote_price_valid(${JSON.stringify(stored.snapshot)}::jsonb,${pub.id}::uuid,${new Date(clock.now.getTime()+120000)}) AS ok`); expect(later.ok).toBe(true);
    const [bad] = await db.$queryRaw<{ok: boolean}[]>(Prisma.sql`SELECT program_quote_price_valid(${JSON.stringify({ ...stored.snapshot as object, baseAmountRial: undefined })}::jsonb,${pub.id}::uuid,${stored.createdAt}) AS ok`); expect(bad.ok).toBe(false);
    // The quote is tied to immutable published pricing, not today's promotion configuration.
    await publish({ ...f.config, discountPercent: 0 });
    await fund(p); await fund(p); const paid = await req('POST', `patients/me/billing/intents/${i.intent.id}/wallet-payment`, p);
    expect(paid.statusCode, paid.body).toBe(201); expect(paid.json()).toMatchObject({ amountRial: '1500000', status: 'PAID' });
    expect(await db.programPurchase.findUniqueOrThrow({ where: { id: stored.id } })).toEqual(stored);
  },20000);
  it('activates a 100 percent discount through FREE and records exactly one purchase and grant', async () => {
    const f = await setup('2050000', 'PERPETUAL', true), p = await patient();
    const pub = await publish({ ...f.config, discountPercent: 100 }), consent = await accept(f,p), idempotencyKey = randomUUID();
    const input = { publicationId: pub.id, publicationHash: pub.publicationHash, termsConsentRecordId: consent.id };
    const result = await req('POST','patients/me/billing/program-intents',p,input,idempotencyKey); expect(result.statusCode,result.body).toBe(201);
    expect(result.json()).toMatchObject({ status:'PAID',method:'FREE',amountRial:'0' });
    expect((await req('POST','patients/me/billing/program-intents',p,input,idempotencyKey)).json().id).toBe(result.json().id);
    expect(await db.programAccessGrant.count({where:{purchaseId:result.json().programPurchaseId}})).toBe(1);
    const access=await grant(p,result.json().programPurchaseId); expect((await req('GET',`patients/me/program-access-grants/${access.id}/content`,p)).statusCode).toBe(200);
    expect(await db.auditEvent.count({where:{subjectId:access.id,action:'PROGRAM_ACCESS_GRANTED'}})).toBe(1);
  },20000);

});
