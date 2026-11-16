import { CoupleLinkService } from '../src/modules/assessments/couples/couple-link.service';
import { WalletService } from '../src/modules/billing/wallet.service';
import { createCompleteTestPatient } from './patient-entry-test-support';
import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { canonicalAssessmentJson } from '../src/modules/assessments/domain/assessment-canonical-json';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('assessment offering drafts (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let db: PrismaService;
  let clinicId: string;
  let admin: Awaited<ReturnType<typeof actor>>;
  let sourceId: string;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    admin = await actor('ADMIN', true);
    sourceId = (await questionnaire()).id;
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  async function actor(role: string, membership = false) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    const record = await db.role.upsert({ where: { code: role as 'ADMIN' | 'DOCTOR' | 'PATIENT' }, create: { code: role as 'ADMIN' | 'DOCTOR' | 'PATIENT' }, update: {} });
    await db.userRole.create({ data: { userId: auth.userId, roleId: record.id } });
    if (membership) await db.clinicalClinicAccess.create({ data: { userId: auth.userId, clinicId } });
    return auth;
  }
  async function questionnaire(options: { clinicId?: string; key?: string; locale?: string; draft?: boolean } = {}) {
    return db.assessmentVersion.create({ data: { clinicId: options.clinicId ?? clinicId, assessmentKey: options.key ?? 'MEZAJ', locale: options.locale ?? `x-${randomUUID().slice(0, 8)}`, versionNumber: 1, title: 'Synthetic offering questionnaire', contentHash: 'a'.repeat(64), structure: { schemaVersion: 1, sections: [] }, status: options.draft ? 'DRAFT' : 'PUBLISHED', ...(options.draft ? {} : { publishedAt: new Date() }) } });
  }
  it('marriage phone request supports a future account, rejects mismatched identity and binds independent roles', async () => {
    const definition = { version: 1, purpose: 'MARRIAGE', roles: [{ id: 'FIRST', title: 'Man', genders: ['MALE'], minimumAgeYears: 18 }, { id: 'SECOND', title: 'Woman', genders: ['FEMALE'], minimumAgeYears: 18 }], genericJointText: 'Synthetic generic interpretation' };
    const source = await db.assessmentVersion.create({ data: { clinicId, assessmentKey: `MARRIAGE_${randomUUID()}`, locale: 'fa-IR', versionNumber: 1, title: 'Synthetic', contentHash: 'a'.repeat(64), structure: { schemaVersion: 1, sections: [{ id: 'main', questions: [{ id: 'q', type: 'BOOLEAN', required: true, trueScore: 1, falseScore: 0 }] }] }, status: 'PUBLISHED', publishedAt: new Date() } });
    const offer = await request('POST','/inline-versions',{ assessmentVersionId: source.id, title: 'Synthetic marriage', kind: 'COUPLES', priceMode: 'PAID', amountRial: '100000', texts: { processing: 'Synthetic processing', retention: 'Synthetic retention', visibility: 'Synthetic visibility', disclosure: 'Synthetic disclosure', terms: 'Synthetic terms', marriage: definition } });
    expect(offer.statusCode,offer.body).toBe(201);
    const policy = await db.consentPolicyVersion.findFirst({ where: { clinicId, policyKey: 'COUPLES_ACCOUNT_LINKING', status: 'ACTIVE' } }) ?? await db.consentPolicyVersion.create({ data: { clinicId, policyKey: 'COUPLES_ACCOUNT_LINKING', locale: 'fa-IR', versionNumber: 1, title: 'Synthetic linking', body: 'Synthetic linking fixture', contentHash: createHash('sha256').update('Synthetic linking fixture').digest('hex'), status: 'ACTIVE', activatedAt: new Date() } });
    const sender = await actor('PATIENT'); const senderProfile = await createCompleteTestPatient(db,{data:{ userId: sender.userId,clinicId }}); await db.userProfile.update({ where: { userId: sender.userId }, data: { gender: 'MALE' } });
    const http = (who:typeof sender,method:'GET'|'POST',path:string,body?:object,key=randomUUID()) => app.inject({ method,url:'/v1/patients/me/marriage-requests'+path,headers:{authorization:`Bearer ${who.token}`,origin:'http://localhost:3000','idempotency-key':key},...(body?{payload:body}:{}) });
    const publicationId = offer.json().adminPublicationId as string;
    const settingsRes = await http(sender,'GET',`/settings/${publicationId}`); expect(settingsRes.statusCode,settingsRes.body).toBe(200);
    const termsPolicy = settingsRes.json().termsPolicy as { id: string; contentHash: string };
    const termsConsent = await app.inject({ method:'POST',url:'/v1/patients/me/assessment-consents',headers:{authorization:`Bearer ${sender.token}`,origin:'http://localhost:3000','idempotency-key':randomUUID()},payload:{policyVersionId:termsPolicy.id,contentHash:termsPolicy.contentHash,accepted:true} }); expect(termsConsent.statusCode,termsConsent.body).toBe(201);
    const wallet = app.get(WalletService), walletSummary = await wallet.summary(senderProfile);
    await wallet.adjust({actorUserId:admin.userId,actorSessionId:admin.sessionId,requestId:randomUUID(),ipAddress:'127.0.0.1'},senderProfile.id,{type:'CREDIT',amountToman:'50000',expectedVersion:walletSummary.version,reason:'Synthetic marriage prepayment'},randomUUID());
    const prepayIntent = await http(sender,'POST',`/settings/${publicationId}/billing-intents`,{termsConsentRecordId:termsConsent.json().id}); expect(prepayIntent.statusCode,prepayIntent.body).toBe(201);
    const paidPrepay = await app.inject({ method:'POST',url:`/v1/patients/me/billing/intents/${prepayIntent.json().id}/wallet-payment`,headers:{authorization:`Bearer ${sender.token}`,origin:'http://localhost:3000','idempotency-key':randomUUID()} }); expect(paidPrepay.statusCode,paidPrepay.body).toBe(201);
    const phone = `+989${Math.floor(Math.random()*900000000+100000000)}`; const before = await db.user.count(); const key=randomUUID();
    const body = { publicationId, initiatorRole:'FIRST',recipientPhone:phone,consentPolicyVersionId:policy.id,consentAccepted:true };
    const created=await http(sender,'POST','',body,key); expect(created.statusCode,created.body).toBe(201); expect(await db.user.count()).toBe(before); let id=created.json().id;
    expect(created.json().recipientPhoneMasked).toBe('09•••••'+phone.slice(-4)); expect(created.body).not.toContain(phone);
    expect((await http(sender,'GET','')).json().items.find((item:{id:string})=>item.id===id).recipientPhoneMasked).toBe('09•••••'+phone.slice(-4));
    expect(created.json()).not.toHaveProperty('recipientHash'); expect(created.json()).not.toHaveProperty('recipientPatientId');
    expect((await http(sender,'POST','',body,key)).json().id).toBe(id);
    const catalog=await app.inject({method:'GET',url:'/v1/patients/me/educational-assessment-offerings?kind=COUPLES&servicePurpose=MARRIAGE&pageSize=1',headers:{authorization:`Bearer ${sender.token}`}});expect(catalog.statusCode,catalog.body).toBe(200);expect(catalog.json().items).toHaveLength(1);expect(catalog.json().items[0].servicePurpose).toBe('MARRIAGE');
    const oldId=id,replacementKey=randomUUID();const replacement=await http(sender,'POST',`/${oldId}/replace`,body,replacementKey);expect(replacement.statusCode,replacement.body).toBe(201);id=replacement.json().id;expect(id).not.toBe(oldId);expect((await http(sender,'GET',`/${oldId}`)).json().status).toBe('REPLACED');expect((await http(sender,'POST',`/${oldId}/replace`,body,replacementKey)).json().id).toBe(id);
    const user=await db.user.create({data:{phone}});const receiver=await createTestAccessToken(db,app.get(AccessTokenService),['PATIENT'],user.id);await db.userRole.create({data:{userId:user.id,roleId:(await db.role.findUniqueOrThrow({where:{code:'PATIENT'}})).id}});await createCompleteTestPatient(db,{data:{userId:user.id,clinicId}});
    expect((await http(receiver,'GET',`/${id}`)).statusCode).toBe(404);
    expect((await http(receiver,'GET','?status=PENDING&direction=RECEIVED')).json().total).toBe(0);
    await db.session.update({where:{id:receiver.sessionId},data:{verifiedPhone:phone}});
    // Older pending invitation must survive pages filled with newer closed requests.
    const original = await db.marriageServiceRequest.findUniqueOrThrow({where:{id}});
    const {id: _id, paidIntentId: _paidIntentId, ...copy} = original;
    for(let i=0;i<21;i++){
      const link=await app.get(CoupleLinkService).create(sender.userId,{consentPolicyVersionId:policy.id,consentAccepted:true},randomUUID(),{actorUserId:sender.userId,actorSessionId:sender.sessionId,requestId:randomUUID(),ipAddress:'127.0.0.1'});
      await db.marriageServiceRequest.create({data:{...copy,id:randomUUID(),replacesId:null,paidIntentId:null,linkId:link.id,idempotencyKey:randomUUID(),status:'CANCELLED',createdAt:new Date(original.createdAt.getTime()+1000+i)}});
    }
    expect((await http(receiver,'GET','')).json().items.map((x:{id:string})=>x.id)).not.toContain(id);
    const filtered=await http(receiver,'GET','?status=PENDING&direction=RECEIVED');expect(filtered.statusCode,filtered.body).toBe(200);expect(filtered.json().items.map((x:{id:string})=>x.id)).toEqual([id]);expect(filtered.json().total).toBe(1);expect(filtered.json().items[0].recipientPhoneMasked).toBeNull();
    expect((await http(receiver,'GET','?direction=SENT')).json().total).toBe(0);
    expect((await http(sender,'GET','?direction=RECEIVED')).json().total).toBe(0);
    expect((await http(sender,'GET','?status=PENDING&direction=SENT')).json().total).toBe(1);
    expect((await http(receiver,'GET','?direction=UNKNOWN')).statusCode).toBe(400);
    expect((await http(receiver,'GET','?status=UNKNOWN')).statusCode).toBe(400);
    const stranger=await actor('PATIENT');await createCompleteTestPatient(db,{data:{userId:stranger.userId,clinicId}});
    expect((await http(stranger,'GET','?status=PENDING&direction=RECEIVED')).json().total).toBe(0);
    const anotherClinic=await db.clinic.create({data:{name:'Synthetic isolation clinic',status:'INACTIVE'}});
    const outsider=await actor('PATIENT');await createCompleteTestPatient(db,{data:{userId:outsider.userId,clinicId:anotherClinic.id}});
    const outsidePhone=(await db.user.findUniqueOrThrow({where:{id:outsider.userId}})).phone;
    await db.user.update({where:{id:user.id},data:{phone:`+989${Math.floor(Math.random()*900000000+100000000)}`}});
    await db.user.update({where:{id:outsider.userId},data:{phone}});await db.session.update({where:{id:outsider.sessionId},data:{verifiedPhone:phone}});
    const outsideList=await http(outsider,'GET','?status=PENDING&direction=RECEIVED');expect(outsideList.statusCode,outsideList.body).toBe(404);expect(outsideList.body).not.toContain(id);
    await db.user.update({where:{id:outsider.userId},data:{phone:outsidePhone}});await db.user.update({where:{id:user.id},data:{phone}});
    const accept={consentPolicyVersionId:policy.id,consentAccepted:true};
    await db.userProfile.update({where:{userId:user.id},data:{gender:'MALE'}});
    const ineligible=await http(receiver,'POST',`/${id}/review`);expect(ineligible.statusCode,ineligible.body).toBe(201);expect(ineligible.json().recipientPhoneMasked).toBeNull();expect(ineligible.json().eligibilityNotConfirmed).toBe(true);expect(ineligible.json().educationalId).toBeNull();expect(ineligible.json().ownIneligibilityReason).toBe('GENDER_NOT_ALLOWED');const privateView=(await http(sender,'GET',`/${id}`)).json();expect(privateView.ownIneligibilityReason).toBeNull();expect(privateView).not.toHaveProperty('recipientGender');
    expect((await http(sender,'POST',`/${id}/review`)).statusCode).toBe(404);expect((await http(sender,'GET',`/${id}`)).json().eligibilityNotConfirmed).toBe(true);
    await db.userProfile.update({where:{userId:user.id},data:{gender:'FEMALE'}});
    const patientId=(await db.patientProfile.findUniqueOrThrow({where:{userId:user.id}})).id;
    await db.patientEntry.update({where:{patientId},data:{birthDate:new Date('2015-01-01')}});
    const minor=await http(receiver,'POST',`/${id}/accept`,accept);expect(minor.json().ownIneligibilityReason).toBe('AGE_BELOW_MINIMUM');expect(minor.json().educationalId).toBeNull();
    await db.patientEntry.update({where:{patientId},data:{birthDate:new Date('1990-01-01')}});
    const responses=await Promise.all([http(receiver,'POST',`/${id}/accept`,accept),http(receiver,'POST',`/${id}/accept`,accept)]);
    for(const response of responses)expect(response.statusCode,response.body).toBe(201);
    expect(responses[0]!.json().status).toBe('ACCEPTED');expect(responses[1]!.json().educationalId).toBe(responses[0]!.json().educationalId);
    const saved=await db.marriageServiceRequest.findUniqueOrThrow({where:{id}});expect(saved.recipientPatientId).toBe((await db.patientProfile.findUniqueOrThrow({where:{userId:user.id}})).id);expect(Buffer.from(saved.encryptedPayload).toString()).not.toContain(phone);
    expect((await db.educationalCoupleParticipant.count({where:{sessionId:saved.educationalId!}}))).toBe(2);
    const changedPhone = `+989${Math.floor(Math.random()*900000000+100000000)}`;
    await db.user.update({where:{id:user.id},data:{phone:changedPhone}});await db.session.update({where:{id:receiver.sessionId},data:{verifiedPhone:changedPhone}});
    expect((await http(sender,'GET',`/${id}`)).json().recipientPhoneMasked).toBe('09•••••'+phone.slice(-4));
    const recipientView=await http(receiver,'GET',`/${id}`);expect(recipientView.statusCode,recipientView.body).toBe(200);expect(recipientView.json().recipientPhoneMasked).toBeNull();expect(recipientView.body).not.toContain(phone);expect(recipientView.body).not.toContain(changedPhone);
  },30_000);

  it.each(['INDIVIDUAL', 'COUPLES'])('inline offering saves all modes with owned documents and retry safety: %s', async kind => {
    const structure = { schemaVersion: 1, sections: [{ id: 'main', questions: [{ id: 'q', type: 'BOOLEAN', required: true, trueScore: 1, falseScore: 0 }] }] };
    const source = await db.assessmentVersion.create({ data: { clinicId, assessmentKey: `INLINE_${randomUUID()}`, locale: 'fa-IR', versionNumber: 1, title: 'Synthetic inline', contentHash: 'a'.repeat(64), structure, status: 'PUBLISHED', publishedAt: new Date() } });
    for (const priceMode of ['FREE', 'PAID']) {
      const payload = { assessmentVersionId: source.id, title: 'Synthetic inline', kind, priceMode, ...(priceMode === 'PAID' ? { amountRial: '100000' } : {}), texts: { processing: 'رضایت پردازش', retention: 'نگهداری سوابق', visibility: 'نمایش به صاحب حساب', terms: 'شرایط خرید', disclosure: 'اشتراک نتیجه با رضایت مستقل' } };
      const key = randomUUID();
      const response = await request('POST', '/inline-versions', payload, key);
      expect(response.statusCode, response.body).toBe(201);
      const row = response.json();
      expect(row.algorithmId).toBe('WEIGHTED_SUM');
      expect(row.publicationAuthority).toBe('ADMIN_PUBLISHED');
      expect(row.releaseReadiness).toEqual({ ready: true, blockers: [] });
      const publication = await db.assessmentAdminPublication.findUniqueOrThrow({ where: { offeringVersionId: row.id } });
      expect(publication.publishedByUserId).toBe(admin.userId);
      expect(publication.status).toBe('ACTIVE');
      await expect(db.assessmentAdminPublication.update({ where: { id: publication.id }, data: { questionnaireContentHash: 'b'.repeat(64) } })).rejects.toThrow(/immutable/);
      await expect(db.assessmentAdminPublication.delete({ where: { id: publication.id } })).rejects.toThrow(/retained/);
      expect(row.offeringKey).toMatch(/^AUTO_/);
      const documents = await db.consentPolicyVersion.findMany({ where: { assessmentOfferingVersionId: row.id } });
      expect(documents).toHaveLength(1 + Number(priceMode === 'PAID') + Number(kind === 'COUPLES'));
      expect(documents.every(document => document.status === 'ACTIVE' && document.clinicId === clinicId)).toBe(true);
      const replay = await request('POST', '/inline-versions', payload, key);
      expect(replay.statusCode).toBe(201); expect(replay.json().id).toBe(row.id);
      expect((await request('POST', '/inline-versions', { ...payload, title: 'Changed' }, key)).statusCode).toBe(409);
    }
  });
  it('inline draft publication rolls back documents and source on failure and replays a concurrent retry', async () => {
    const who = await actor('ADMIN', true);
    const source = await db.assessmentVersion.create({ data: { clinicId, assessmentKey: `ATOMIC_${randomUUID()}`, locale: 'fa-IR', versionNumber: 1, title: 'Synthetic draft', contentHash: 'a'.repeat(64), structure: { schemaVersion: 1, sections: [{ id: 's', questions: [{ id: 'q', type: 'BOOLEAN', required: true, trueScore: 1, falseScore: 0 }] }] } } });
    const payload = { assessmentVersionId: source.id, expectedQuestionnaireHash: source.contentHash, title: 'Synthetic atomic', kind: 'INDIVIDUAL', priceMode: 'FREE', texts: { processing: 'پردازش', retention: 'نگهداری', visibility: 'نمایش' } };
    expect((await request('POST', '/inline-versions', { ...payload, expectedQuestionnaireHash: 'b'.repeat(64) }, randomUUID(), who)).statusCode).toBe(409);
    if (!/^[a-f0-9-]{36}$/.test(who.userId)) throw new Error('Synthetic UUID required');
    await db.$executeRawUnsafe(`CREATE FUNCTION inline_offering_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id='${who.userId}'::uuid AND NEW.action='CONSENT_POLICY_PUBLISHED' THEN RAISE EXCEPTION 'synthetic inline failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER inline_offering_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION inline_offering_audit_fail()`);
    try {
      expect((await request('POST', '/inline-versions', payload, randomUUID(), who)).statusCode).toBe(500);
      expect((await db.assessmentVersion.findUniqueOrThrow({ where: { id: source.id } })).status).toBe('DRAFT');
      expect(await db.assessmentOfferingVersion.count({ where: { assessmentVersionId: source.id } })).toBe(0);
      expect(await db.consentPolicyVersion.count({ where: { publishedByUserId: who.userId } })).toBe(0);
    } finally {
      await db.$executeRaw(Prisma.sql`DROP TRIGGER inline_offering_audit_fail ON audit_events`);
      await db.$executeRaw(Prisma.sql`DROP FUNCTION inline_offering_audit_fail()`);
    }
    const key = randomUUID();
    const responses = await Promise.all([request('POST', '/inline-versions', payload, key, who), request('POST', '/inline-versions', payload, key, who)]);
    expect(responses.map(r => r.statusCode)).toEqual([201, 201]);
    expect(responses[0].json().id).toBe(responses[1].json().id);
    expect(responses[0].json().authoringTexts).toEqual(payload.texts);
    expect((await db.assessmentVersion.findUniqueOrThrow({ where: { id: source.id } })).status).toBe('PUBLISHED');
    expect(await db.assessmentOfferingVersion.count({ where: { assessmentVersionId: source.id } })).toBe(1);
  });
  it.each([1, 2])('inline 11+1 version %s publishes drafts and stores every offering mode', async algorithmVersion => {
    const base = structuredClone(MIZAJ_DRAFT_PRESET.structure);
    const dimensions = base.scoring.dimensions;
    const followUps = dimensions.flatMap((a, first) => dimensions.slice(first + 1).map(b => ({ id: `tie_${a.id}_${b.id}`, title: 'Synthetic distinction', tiedDimensions: [a.id, b.id], options: [a, b].map(dimension => ({ id: `o_${dimension.id}`, title: dimension.title, dimensionId: dimension.id })) })));
    const structure = { ...base, schemaVersion: 3, scoring: { ...base.scoring, algorithmId: 'DIMENSION_TIEBREAK', algorithmVersion }, followUps };
    for (const kind of ['INDIVIDUAL', 'COUPLES']) for (const priceMode of ['FREE', 'PAID']) {
      const contentHash = createHash('sha256').update(canonicalAssessmentJson(structure)).digest('hex');
      const source = await db.assessmentVersion.create({ data: { clinicId, assessmentKey: `MZ_${randomUUID()}`, locale: 'fa-IR', versionNumber: 1, title: 'Synthetic Mizaj', structure, contentHash } });
      const payload = { assessmentVersionId: source.id, expectedQuestionnaireHash: contentHash, title: 'Synthetic Mizaj offering', kind, priceMode, ...(priceMode === 'PAID' ? { amountRial: '100000' } : {}), texts: { processing: 'پردازش', retention: 'نگهداری', visibility: 'نمایش', terms: 'شرایط', disclosure: 'اشتراک' } };
      const result = await request('POST', '/inline-versions', payload);
      expect(result.statusCode, result.body).toBe(201);
      expect((await db.assessmentAdminPublication.findUniqueOrThrow({ where: { offeringVersionId: result.json().id } })).publishedByUserId).toBe(admin.userId);
      expect(result.json().algorithmId).toBe('DIMENSION_TIEBREAK'); expect(result.json().algorithmVersion).toBe(algorithmVersion);
      expect(result.json().authoringTexts).toEqual(payload.texts);
      expect((await db.assessmentVersion.findUniqueOrThrow({ where: { id: source.id } })).publishedByUserId).toBe(admin.userId);
      expect(await db.assessmentProtocolReview.count({ where: { assessmentVersionId: source.id } })).toBe(0);
    }
  });
  const body = () => ({ offeringKey: `TEST_${randomUUID().replaceAll('-', '').toUpperCase()}`, kind: 'INDIVIDUAL', title: 'Synthetic individual offering', assessmentVersionId: sourceId, priceMode: 'FREE', currency: 'IRR' });
  const request = (method: 'GET' | 'POST', path = '', payload?: object, key: string | undefined = randomUUID(), who = admin) => app.inject({ method, url: `/v1/admin/assessment-offerings${path}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}), ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  async function create(payload = body()) { const response = await request('POST', '/versions', payload); expect(response.statusCode).toBe(201); return response.json() as { id: string; offeringKey: string; versionNumber: number }; }

  it('creates a free immutable draft with explicit release blockers and no payment fabrication', async () => {
    const payload = body(); const response = await request('POST', '/versions', payload); expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ status: 'DRAFT', versionNumber: 1, amountRial: '0', currency: 'IRR', paymentPoint: null, algorithmId: null, releaseReadiness: { ready: false } });
    expect(response.json().releaseReadiness.blockers).toContain('CLINICAL_RELEASE_APPROVAL_REQUIRED');
    for (const field of ['idempotencyKey', 'payloadHash', 'createdByUserId']) expect(response.body).not.toContain(`"${field}"`);
    expect(await db.billingIntent.count({ where: { snapshot: { path: ['offeringKey'], equals: payload.offeringKey } } })).toBe(0);
  });
  it('accepts incomplete paid/couples configuration without inventing price or consent defaults', async () => {
    const response = await request('POST', '/versions', { ...body(), kind: 'COUPLES', priceMode: 'PAID' }); expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ amountRial: null, paymentPoint: null, policyDraft: {}, releaseReadiness: { ready: false } });
    expect(response.json().releaseReadiness.blockers).toEqual(expect.arrayContaining(['PRICE_CONFIGURATION_INCOMPLETE', 'COUPLES_SESSION_AND_ALGORITHM_APPROVAL_REQUIRED', 'DRAFT_POLICY_INCOMPLETE']));
  });
  it('stores integer prices and explicit payment points without enabling publication', async () => {
    const response = await request('POST', '/versions', { ...body(), priceMode: 'PAID', amountRial: '9000000000000000000', paymentPoint: 'PRE_RESULT_UNLOCK', algorithmId: 'UNAPPROVED_MODEL', algorithmVersion: 1, policyDraft: { minimumAgeYears: 18, quoteTtlSeconds: 600 } });
    expect(response.statusCode).toBe(201); expect(response.json()).toMatchObject({ amountRial: '9000000000000000000', paymentPoint: 'PRE_RESULT_UNLOCK', releaseReadiness: { ready: false } });
    expect((await request('POST', `/${response.json().id}/publish`)).statusCode).toBe(404);
  });
  it('replays simultaneous equivalent command keys once despite JSON property order', async () => {
    const payload = body(); const key = randomUUID();
    const reversed = Object.fromEntries(Object.entries(payload).reverse());
    const responses = await Promise.all(Array.from({ length: 10 }, (_, n) => request('POST', '/versions', n % 2 ? payload : reversed, key)));
    expect(responses.map(r => r.statusCode)).toEqual(Array(10).fill(201)); expect(new Set(responses.map(r => r.json().id)).size).toBe(1);
    expect(await db.assessmentOfferingVersion.count({ where: { offeringKey: payload.offeringKey } })).toBe(1);
    expect(await db.auditEvent.count({ where: { subjectId: responses[0].json().id, action: 'ASSESSMENT_OFFERING_VERSION_CREATED' } })).toBe(1);
    const changed = await request('POST', '/versions', { ...payload, title: 'Changed' }, key); expect(changed.statusCode).toBe(409); expect(changed.json().code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
  it('serializes distinct version commands into consecutive immutable versions', async () => {
    const payload = body(); const responses = await Promise.all(Array.from({ length: 8 }, (_, n) => request('POST', '/versions', { ...payload, title: `Version ${n}` })));
    expect(responses.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(responses.map(r => r.json().versionNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('rejects changing stable kind/locale/questionnaire family', async () => {
    const payload = body(); await create(payload);
    const differentLocale = await questionnaire(); const differentKey = await questionnaire({ key: 'MAIN', locale: (await db.assessmentVersion.findUniqueOrThrow({ where: { id: sourceId } })).locale });
    for (const change of [{ kind: 'COUPLES' }, { assessmentVersionId: differentLocale.id }, { assessmentVersionId: differentKey.id }]) { const response = await request('POST', '/versions', { ...payload, ...change }); expect(response.statusCode).toBe(409); expect(response.json().code).toBe('ASSESSMENT_OFFERING_CONFLICT'); }
  });
  it('requires ADMIN and explicit active clinic membership on every route', async () => {
    const item = await create(); const foreignAdmin = await actor('ADMIN');
    for (const who of [await actor('PATIENT'), await actor('DOCTOR'), await actor('STAFF'), foreignAdmin]) {
      for (const [method, path, payload] of [['GET', '', undefined], ['GET', `/${item.id}`, undefined], ['POST', '/versions', body()], ['POST', `/${item.id}/retire`, undefined]] as const) expect((await request(method, path, payload, randomUUID(), who)).statusCode).toBe(403);
    }
    expect((await app.inject({ method: 'GET', url: '/v1/admin/assessment-offerings' })).statusCode).toBe(401);
  });
  it('conceals foreign clinic/draft questionnaire references and foreign offering ids', async () => {
    const other = await db.clinic.create({ data: { name: 'Synthetic other', status: 'INACTIVE' } }); const foreign = await questionnaire({ clinicId: other.id }); const draft = await questionnaire({ draft: true });
    for (const id of [foreign.id, draft.id]) expect((await request('POST', '/versions', { ...body(), assessmentVersionId: id })).statusCode).toBe(404);
    const foreignRow = await db.assessmentOfferingVersion.create({ data: { clinicId: other.id, offeringKey: 'FOREIGN', versionNumber: 1, kind: 'INDIVIDUAL', title: 'Foreign hidden', locale: foreign.locale, assessmentVersionId: foreign.id, priceMode: 'FREE', amountRial: 0n, currency: 'IRR', createdByUserId: admin.userId, idempotencyKey: randomUUID(), payloadHash: 'a'.repeat(64) } });
    expect((await request('GET', `/${foreignRow.id}`)).statusCode).toBe(404); expect((await request('POST', `/${foreignRow.id}/retire`)).statusCode).toBe(404);
    expect((await request('GET')).body).not.toContain(foreignRow.id);
  });
  it('validates money, cross-field configuration and strict bounded DTOs', async () => {
    for (const extra of [{ amountRial: '1' }, { paymentPoint: 'PRE_START' }, { priceMode: 'PAID', amountRial: '0' }, { priceMode: 'PAID', amountRial: '9000000000000000001' }, { algorithmId: 'ONE_WITHOUT_VERSION' }]) expect((await request('POST', '/versions', { ...body(), ...extra })).statusCode).toBe(422);
    for (const extra of [{ amountRial: 12 }, { amountRial: '01' }, { amountRial: '0.5' }, { currency: 'TOMAN' }, { status: 'PUBLISHED' }, { policyDraft: { madeUp: true } }, { policyDraft: { quoteTtlSeconds: 0 } }]) expect((await request('POST', '/versions', { ...body(), ...extra })).statusCode).toBe(400);
    for (const query of ['?page=0', '?pageSize=51', '?clinicId=foreign']) expect((await request('GET', query)).statusCode).toBe(400);
    expect((await request('POST', '/versions', body(), '')).json().code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
  it('lists a bounded configuration history and retires idempotently without content changes', async () => {
    const payload = body(); const key = randomUUID(); const created = await request('POST', '/versions', payload, key); const id = created.json().id;
    await create(payload); await create(payload);
    const listed = await request('GET', `?offeringKey=${payload.offeringKey}&pageSize=2`); expect(listed.json().items).toHaveLength(2); expect(listed.json().total).toBe(3); expect(listed.headers['cache-control']).toBe('private, no-store');
    const retired = await Promise.all([request('POST', `/${id}/retire`), request('POST', `/${id}/retire`)]); expect(retired.map(r => r.statusCode)).toEqual([201, 201]); expect(retired[0].json().retiredAt).toBe(retired[1].json().retiredAt);
    expect(await db.auditEvent.count({ where: { subjectId: id, action: 'ASSESSMENT_OFFERING_RETIRED' } })).toBe(1);
    const replay = await request('POST', '/versions', payload, key); expect(replay.json().id).toBe(id); expect(replay.json().status).toBe('RETIRED'); expect(replay.json().releaseReadiness.blockers).toContain('OFFERING_RETIRED');
  });
  it('database blocks content rewrites, deletes, publication and version gaps', async () => {
    const item = await create();
    await expect(db.assessmentOfferingVersion.update({ where: { id: item.id }, data: { title: 'Rewrite' } })).rejects.toThrow(/immutable/);
    await expect(db.assessmentOfferingVersion.delete({ where: { id: item.id } })).rejects.toThrow(/retained/);
    await expect(db.assessmentOfferingVersion.update({ where: { id: item.id }, data: { status: 'PUBLISHED' } })).rejects.toThrow();
    const row = await db.assessmentOfferingVersion.findUniqueOrThrow({ where: { id: item.id } });
    await expect(db.assessmentOfferingVersion.create({ data: { ...row, authoringTexts: Prisma.DbNull, policyDraft: {}, id: randomUUID(), versionNumber: 3, idempotencyKey: randomUUID() } })).rejects.toThrow(/consecutive/);
    await expect(db.assessmentOfferingVersion.create({ data: { ...row, authoringTexts: Prisma.DbNull, policyDraft: {}, id: randomUUID(), offeringKey: `BAD_${randomUUID().replaceAll('-', '').toUpperCase()}`, versionNumber: 1, amountRial: null, idempotencyKey: randomUUID() } })).rejects.toThrow();
    await expect(db.assessmentOfferingVersion.create({ data: { ...row, authoringTexts: Prisma.DbNull, policyDraft: {}, id: randomUUID(), versionNumber: 2, kind: 'COUPLES', idempotencyKey: randomUUID() } })).rejects.toThrow(/stable/);
    const other = await db.clinic.create({ data: { name: 'Synthetic SQL scope', status: 'INACTIVE' } }); const foreign = await questionnaire({ clinicId: other.id });
    await expect(db.assessmentOfferingVersion.create({ data: { ...row, authoringTexts: Prisma.DbNull, policyDraft: {}, id: randomUUID(), offeringKey: `SCOPE_${randomUUID().replaceAll('-', '').toUpperCase()}`, assessmentVersionId: foreign.id, locale: foreign.locale, idempotencyKey: randomUUID() } })).rejects.toThrow(/same-clinic/);
  });
  it('rolls back creation/retirement and fails reads when their audit fails', async () => {
    const isolated = await actor('ADMIN', true); const payload = body(); const opened = await request('POST', '/versions', payload, randomUUID(), isolated); const id = opened.json().id;
    if (!/^[a-f0-9-]{36}$/.test(isolated.userId)) throw new Error('Invalid synthetic UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION offerings_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id = '${isolated.userId}'::uuid THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER offerings_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION offerings_test_audit_fail()`);
    const failedPayload = body();
    try {
      for (const [method, path, data] of [['POST', '/versions', failedPayload], ['POST', `/${id}/retire`, undefined], ['GET', `/${id}`, undefined], ['GET', '', undefined]] as const) { const response = await request(method, path, data, randomUUID(), isolated); expect(response.statusCode).toBe(500); expect(response.body).not.toContain('synthetic audit failure'); }
      expect(await db.assessmentOfferingVersion.count({ where: { offeringKey: failedPayload.offeringKey } })).toBe(0);
      expect((await db.assessmentOfferingVersion.findUniqueOrThrow({ where: { id } })).status).toBe('DRAFT');
    } finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER offerings_test_audit_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION offerings_test_audit_fail()`); }
  });
});
