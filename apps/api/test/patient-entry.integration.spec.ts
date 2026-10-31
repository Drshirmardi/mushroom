import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { BillingGatewayService } from '../src/modules/billing/billing-gateway.service';
import { PaymentProviderRegistry } from '../src/modules/commerce/payments/payment-provider.registry';
import { PaymentCredentialCryptoService } from '../src/modules/commerce/payments/payment-credential-crypto.service';
import { SadadRuntimeConfigService } from '../src/modules/commerce/payments/sadad-runtime-config.service';
import type { PaymentProviderPort } from '../src/modules/commerce/payments/payment-provider.port';
import { WalletService } from '../src/modules/billing/wallet.service';
import { randomUUID, createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_ENTRY_TEST_ISOLATED !== '1')('required patient entry on isolated PostgreSQL', () => {
  let app: NestFastifyApplication; let db: PrismaService; let clinicId: string; let sourceId: string; let admin: Awaited<ReturnType<typeof actor>>;
  const headers = (token: string) => ({ authorization: `Bearer ${token}` });
  const request = (actor: { token: string }, method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown) => app.inject({ method, url, headers: headers(actor.token), ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }) });
  const status = (actor: { token: string }) => request(actor, 'GET', '/v1/patients/me/entry');
  async function actor(role = 'PATIENT', old = false) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    const targetRole = await db.role.findUniqueOrThrow({ where: { code: role as 'PATIENT' | 'ADMIN' | 'DOCTOR' } });
    await db.userRole.create({ data: { userId: auth.userId, roleId: targetRole.id } });
    if (old) await db.user.update({ where: { id: auth.userId }, data: { createdAt: new Date('2020-01-01') } });
    const patient = role === 'PATIENT' ? await db.patientProfile.create({ data: { userId: auth.userId, clinicId } }) : null;
    return { ...auth, patientId: patient?.id };
  }
  async function source(published = true) {
    const structure = { schemaVersion: 1, sections: [{ id: 's', title: 'Synthetic', questions: [{ id: 'q', text: 'Synthetic question', type: 'BOOLEAN', required: true, trueScore: 2, falseScore: 0 }] }], resultBands: [{ id: 'only', title: 'Synthetic result', minInclusive: 0, requiresReview: false }] };
    return db.assessmentVersion.create({ data: { clinicId, assessmentKey: `ENTRY_${randomUUID().slice(0, 8)}`, versionNumber: 1, locale: 'fa-IR', title: 'Synthetic entry', structure, contentHash: createHash('sha256').update(JSON.stringify(structure)).digest('hex'), status: published ? 'PUBLISHED' : 'DRAFT', publishedAt: published ? new Date() : null } });
  }
  async function policy(enabled: boolean, assessmentVersionId: string | null = sourceId) {
    const current = (await request(admin, 'GET', '/v1/admin/assessment-entry-policy')).json();
    return request(admin, 'PUT', '/v1/admin/assessment-entry-policy', { enabled, amountRial:'0',allowDeferral:false,assessmentVersionId, expectedRevision: current.revision });
  }
  async function prepared(assessmentVersionId: string = sourceId) {
    expect((await policy(true, assessmentVersionId)).statusCode).toBe(200);
    const p = await actor();
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' })).statusCode).toBe(200);
    const start = await request(p, 'POST', '/v1/patients/me/entry/start'); expect(start.statusCode).toBe(200);
    return { ...p, submissionId: start.json().submissionId as string };
  }
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !/^\/patient_entry_verify_[a-f0-9]{32}$/.test(target.pathname)) throw new Error('Disposable entry database required');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id; admin = await actor('ADMIN'); sourceId = (await source()).id;
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  it('completes a basic profile on a fresh clinic with no entry assessment policy at all', async () => {
    await db.patientEntryPolicy.deleteMany({ where: { clinicId } });
    const p = await actor();
    expect((await status(p)).json()).toMatchObject({ phase: 'PROFILE', assessmentRequired: false });
    const saved = await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ phase: 'COMPLETE', required: false });
    expect(await db.patientAssessmentSubmission.count({ where: { patientId: p.patientId } })).toBe(0);
  });
  it('rejects anonymous and non-admin policy updates; rejects draft configuration', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/patients/me/entry' })).statusCode).toBe(401);
    const doctor = await actor('DOCTOR'); expect((await request(doctor, 'PUT', '/v1/admin/assessment-entry-policy', { enabled: true, assessmentVersionId: sourceId, expectedRevision: 0 })).statusCode).toBe(403);
    expect((await policy(true, (await source(false)).id)).statusCode).toBe(409);
    expect((await policy(true)).statusCode).toBe(200);
  });
  it('resumes a paid entry, permits configured deferral, verifies wallet payment and preserves exact price without acceptance records',async()=>{
    await policy(true);const config=(await request(admin,'GET','/v1/admin/assessment-entry-policy')).json();
    expect((await request(admin,'PUT','/v1/admin/assessment-entry-policy',{enabled:true,assessmentVersionId:sourceId,expectedRevision:config.revision,amountRial:'100000',allowDeferral:true})).statusCode).toBe(200);
    const who=await actor(),other=await actor();
    const profile=await request(who,'POST','/v1/patients/me/entry/profile',{firstName:'Synthetic',lastName:'Person',gender:'FEMALE',birthDate:'1990-01-01'});expect(profile.json()).toMatchObject({phase:'PAYMENT',amountRial:'100000'});
    expect((await request(who,'POST','/v1/patients/me/entry/start')).statusCode).toBe(409);
    const skipped=await request(who,'POST','/v1/patients/me/entry/defer');expect(skipped.json()).toMatchObject({required:false,reminder:true});expect((await request(who,'GET','/v1/patients/me/journey')).statusCode).toBe(200);
    expect((await request(who,'POST','/v1/patients/me/entry/resume')).json()).toMatchObject({required:true,phase:'PAYMENT',reminder:false});
    const key=randomUUID(),invoice=await app.inject({method:'POST',url:'/v1/patients/me/entry/payment',headers:{...headers(who.token),'idempotency-key':key}});expect(invoice.statusCode,invoice.body).toBe(200);const intent=invoice.json();
    expect((await request(other,'GET',`/v1/patients/me/billing/intents/${intent.id}`)).statusCode).toBe(403);
    expect((await status(who)).json()).toMatchObject({phase:'PAYMENT',intentId:intent.id});
    expect((await db.$queryRawUnsafe<{pending:boolean}[]>('SELECT assessment_has_pending_purchase($1::uuid,$2::uuid) AS pending',who.patientId,sourceId))[0]?.pending).toBe(true);
    await expect(db.billingIntent.update({where:{id:intent.id},data:{status:'PAID',method:'WALLET',paidAt:new Date()}})).rejects.toThrow(/Exact owned entry settlement/);
    await expect(db.patientEntry.update({where:{patientId:who.patientId},data:{paidIntentId:intent.id}})).rejects.toThrow(/Verified exact entry payment/);
    const current=(await request(admin,'GET','/v1/admin/assessment-entry-policy')).json();await request(admin,'PUT','/v1/admin/assessment-entry-policy',{enabled:true,assessmentVersionId:sourceId,expectedRevision:current.revision,amountRial:'900000',allowDeferral:true});expect((await status(who)).json().amountRial).toBe('100000');
    await db.clinicalClinicAccess.upsert({where:{userId_clinicId:{userId:admin.userId,clinicId}},create:{userId:admin.userId,clinicId},update:{}});
    const wallet=app.get(WalletService),balance=await wallet.summary(await db.patientProfile.findUniqueOrThrow({where:{id:who.patientId}}));
    await wallet.adjust({actorUserId:admin.userId,actorSessionId:null,requestId:randomUUID(),ipAddress:'127.0.0.1'},who.patientId!,{type:'CREDIT',amountToman:'20000',expectedVersion:balance.version,reason:'Synthetic entry payment'},randomUUID());
    const payKey=randomUUID();const pay=await app.inject({method:'POST',url:`/v1/patients/me/billing/intents/${intent.id}/wallet-payment`,headers:{...headers(who.token),'idempotency-key':payKey}});expect(pay.statusCode,pay.body).toBe(201);
    const replay=await app.inject({method:'POST',url:`/v1/patients/me/billing/intents/${intent.id}/wallet-payment`,headers:{...headers(who.token),'idempotency-key':payKey}});expect(replay.statusCode,replay.body).toBe(201);expect(await db.walletJournal.count({where:{reference:`intent:${intent.id}:debit`}})).toBe(1);
    expect((await status(who)).json().phase).toBe('ASSESSMENT');
    const start=await request(who,'POST','/v1/patients/me/entry/start');expect(start.statusCode,start.body).toBe(200);const sid=start.json().submissionId;
    const saved=await app.inject({method:'PUT',url:`/v1/assessment-submissions/${sid}`,headers:headers(who.token),payload:{expectedRevision:0,answers:{q:true}}});expect(saved.statusCode,saved.body).toBe(200);
    const complete=await app.inject({method:'POST',url:`/v1/assessment-submissions/${sid}/submit`,headers:{...headers(who.token),'idempotency-key':randomUUID()},payload:{expectedRevision:saved.json().revision}});expect(complete.statusCode,complete.body).toBe(201);
    expect((await request(who,'POST','/v1/patients/me/entry/complete')).json()).toMatchObject({required:false,reminder:false});
    const administrative=await request(admin,'GET',`/v1/admin/patients/${who.patientId}`);expect(administrative.statusCode,administrative.body).toBe(200);expect(administrative.json().assessments).toEqual([]);
    expect(await db.patientConsentRecord.count({where:{patientId:who.patientId}})).toBe(0);expect(await db.billingIntent.count({where:{patientId:who.patientId,purpose:'ENTRY_ASSESSMENT',status:'PAID'}})).toBe(1);
    await policy(false);
  });
  it.each(['SUCCESS','FAILED','WRONG_AMOUNT','UNAVAILABLE'] as const)('uses actual shared server Verify for paid entry %s without granting unpaid access',async mode=>{
    const config=await db.paymentProviderConfig.findUnique({where:{clinicId_providerCode:{clinicId,providerCode:'sadad'}},select:{enabled:true,isDefault:true,goLiveReady:true,activeRevisionId:true}});
    const requests=new Map<string,{amount:bigint;orderId:bigint}>();
    const fake:PaymentProviderPort={descriptor:{code:'sadad',displayName:'Synthetic entry PSP',capabilities:{createPayment:'SUPPORTED_WHEN_GO_LIVE_READY',parseCallback:'SUPPORTED_WHEN_GO_LIVE_READY',verifyPayment:'SUPPORTED_WHEN_GO_LIVE_READY',sandbox:'UNSUPPORTED',inquiry:'UNSUPPORTED',webhook:'UNSUPPORTED',refund:'UNSUPPORTED',partialRefund:'UNSUPPORTED'}},async createPayment(input){const token=`entry-${input.providerOrderId}`;requests.set(token,{amount:input.providerAmount,orderId:input.providerOrderId});return{providerResultCode:'0',token,redirectUrl:`https://sadad.shaparak.ir/Purchase?Token=${token}`};},parseCallback(input){const row=input as Record<string,string>;return{providerOrderId:BigInt(row.OrderId),token:row.Token,resultCode:row.ResCode};},async verifyPayment({token}){const row=requests.get(token)!;return{resultCode:mode==='FAILED'?'101':'100',providerOrderId:row.orderId,amount:row.amount+(mode==='WRONG_AMOUNT'?1n:0n),referenceId:`entry-${row.orderId}`,traceNumber:`entry-${row.orderId}`};}};
    app.get(PaymentProviderRegistry).register(fake);const runtime=app.get(SadadRuntimeConfigService);vi.spyOn(runtime,'settings').mockReturnValue({returnUrl:'https://api.example.test/v1/payments/providers/sadad/callback',resultUrl:'https://app.example.test/profile/wallet/payment-result',redirectProfile:'PHP_VPG_PURCHASE',timeoutMs:1000});vi.spyOn(runtime,'live','get').mockReturnValue(true);
    try{
      const encrypted=app.get(PaymentCredentialCryptoService).encrypt({merchantId:'synthetic',terminalId:'123',terminalKey:Buffer.alloc(24,7).toString('base64')});
      const provider=await db.paymentProviderConfig.upsert({where:{clinicId_providerCode:{clinicId,providerCode:'sadad'}},create:{clinicId,providerCode:'sadad',providerUnit:'RIAL'},update:{enabled:false,isDefault:false}}),version=(await db.paymentProviderCredentialVersion.count({where:{configId:provider.id}}))+1;
      const credential=await db.paymentProviderCredentialVersion.create({data:{configId:provider.id,versionNumber:version,encryptedPayload:new Uint8Array(encrypted.ciphertext),encryptionNonce:new Uint8Array(encrypted.nonce),authenticationTag:new Uint8Array(encrypted.tag),encryptionKeyVersion:encrypted.keyVersion}});
      const revision=await db.paymentProviderConfigRevision.create({data:{configId:provider.id,revisionNumber:version,providerUnit:'RIAL',goLiveReady:true,credentialVersionId:credential.id}});await db.paymentProviderConfig.update({where:{id:provider.id},data:{activeRevisionId:revision.id,enabled:true,isDefault:true,goLiveReady:true}});
      const bankingSource=await source();await policy(true,bankingSource.id);const current=(await request(admin,'GET','/v1/admin/assessment-entry-policy')).json();expect((await request(admin,'PUT','/v1/admin/assessment-entry-policy',{enabled:true,assessmentVersionId:bankingSource.id,expectedRevision:current.revision,amountRial:'100000',allowDeferral:false})).statusCode).toBe(200);
      const who=await actor();await request(who,'POST','/v1/patients/me/entry/profile',{firstName:'Synthetic',lastName:'Person',gender:'FEMALE',birthDate:'1990-01-01'});
      expect((await request(who,'POST','/v1/patients/me/entry/defer')).statusCode).toBe(409);
      const invoice=await app.inject({method:'POST',url:'/v1/patients/me/entry/payment',headers:{...headers(who.token),'idempotency-key':randomUUID()}});expect(invoice.statusCode,invoice.body).toBe(200);const intent=invoice.json(),gateway=app.get(BillingGatewayService);
      const attempt=await gateway.create(who.userId,intent.id,randomUUID(),{actorUserId:who.userId,actorSessionId:who.sessionId,requestId:randomUUID(),ipAddress:'127.0.0.1'});
      expect((await request(who,'POST','/v1/patients/me/entry/start')).statusCode).toBe(409);
      if(mode==='UNAVAILABLE')expect((await request(admin,'POST',`/v1/admin/assessments/${bankingSource.id}/archive`)).statusCode).toBe(201);
      await gateway.verify(attempt.id);await gateway.verify(attempt.id);
      const state=(await status(who)).json();expect(state.phase).toBe(mode==='SUCCESS'?'ASSESSMENT':mode==='UNAVAILABLE'?'UNAVAILABLE':'PAYMENT');
      expect((await db.patientEntry.findUniqueOrThrow({where:{patientId:who.patientId}})).paidIntentId).toBe(mode==='SUCCESS'?intent.id:null);
      if(mode==='UNAVAILABLE'){expect((await db.billingIntent.findUniqueOrThrow({where:{id:intent.id}})).status).toBe('COMPENSATED');expect(await db.walletJournal.count({where:{reference:`gateway:${attempt.id}:credit`}})).toBe(1);}
      expect(await db.patientConsentRecord.count({where:{patientId:who.patientId}})).toBe(0);
    }finally{vi.restoreAllMocks();await db.paymentProviderConfig.updateMany({where:{clinicId,providerCode:'sadad'},data:config??{enabled:false,isDefault:false,goLiveReady:false,activeRevisionId:null}});await policy(false);}
  });
  it('keeps one free entry and creates separate paid retakes with latest valid Mizaj in profile',async()=>{
    await db.clinicalClinicAccess.upsert({where:{userId_clinicId:{userId:admin.userId,clinicId}},create:{userId:admin.userId,clinicId},update:{}});
    const base=structuredClone(MIZAJ_DRAFT_PRESET.structure),dimensions=base.scoring.dimensions;
    const structure={...base,schemaVersion:3,scoring:{...base.scoring,algorithmId:'DIMENSION_TIEBREAK',algorithmVersion:2},followUps:dimensions.flatMap((a,i)=>dimensions.slice(i+1).map(b=>({id:`tie_${a.id}_${b.id}`,title:'Synthetic follow up',tiedDimensions:[a.id,b.id],options:[a,b].map(d=>({id:`o_${d.id}`,title:d.title,dimensionId:d.id}))})))};
    const created=await request(admin,'POST','/v1/admin/assessments',{assessmentKey:`ENTRY_MIZAJ_${randomUUID()}`,locale:'fa-IR',title:'Synthetic Mizaj',structure});expect(created.statusCode,created.body).toBe(201);const source=created.json();
    const offer=await app.inject({method:'POST',url:'/v1/admin/assessment-offerings/inline-versions',headers:{...headers(admin.token),'idempotency-key':randomUUID()},payload:{assessmentVersionId:source.id,expectedQuestionnaireHash:source.contentHash,title:'Paid retake',kind:'INDIVIDUAL',priceMode:'PAID',amountRial:'100000',texts:{processing:'Synthetic',terms:'Synthetic',retention:'Synthetic',visibility:'Synthetic'}}});expect(offer.statusCode,offer.body).toBe(201);
    const who=await prepared(source.id);
    async function complete(sid:string){const answers=Object.fromEntries(structure.sections.flatMap(section=>section.questions.map(q=>[q.id,q.options[0]!.id])));const saved=await request(who,'PUT',`/v1/assessment-submissions/${sid}`,{answers,expectedRevision:0});expect(saved.statusCode,saved.body).toBe(200);const result=await app.inject({method:'POST',url:`/v1/assessment-submissions/${sid}/submit`,headers:{...headers(who.token),'idempotency-key':randomUUID()},payload:{expectedRevision:saved.json().revision}});expect(result.statusCode,result.body).toBe(201);return result.json();}
    await complete(who.submissionId);expect((await request(who,'POST','/v1/patients/me/entry/complete')).statusCode).toBe(200);
    expect((await request(who,'GET','/v1/patients/me/mezaj')).json().assessmentSubmissionId).toBe(who.submissionId);
    const detail=await request(who,'GET',`/v1/patients/me/educational-assessment-offerings/${offer.json().adminPublicationId}`);expect(detail.statusCode,detail.body).toBe(200);expect(detail.json().publicPurchaseAvailable).toBe(true);
    const accept=async(policy:{id:string;contentHash:string})=>{const result=await app.inject({method:'POST',url:'/v1/patients/me/assessment-consents',headers:{...headers(who.token),'idempotency-key':randomUUID()},payload:{policyVersionId:policy.id,contentHash:policy.contentHash,accepted:true}});expect(result.statusCode,result.body).toBe(201);return result.json().id;};
    const processing=await accept(detail.json().processingPolicy),terms=await accept(detail.json().termsPolicy),wallet=app.get(WalletService),profile=await db.patientProfile.findUniqueOrThrow({where:{id:who.patientId}}),balance=await wallet.summary(profile);
    await wallet.adjust({actorUserId:admin.userId,actorSessionId:admin.sessionId,requestId:randomUUID(),ipAddress:'127.0.0.1'},profile.id,{type:'CREDIT',amountToman:'30000',expectedVersion:balance.version,reason:'Synthetic retake funding'},randomUUID());
    for(let turn=0;turn<2;turn++){
      const bought=await app.inject({method:'POST',url:'/v1/patients/me/billing/assessment-intents',headers:{...headers(who.token),'idempotency-key':randomUUID()},payload:{publicationId:offer.json().adminPublicationId,publicationHash:detail.json().publicationHash,processingConsentRecordId:processing,termsConsentRecordId:terms}});expect(bought.statusCode,bought.body).toBe(201);
      const intent=bought.json();const pay=await app.inject({method:'POST',url:`/v1/patients/me/billing/intents/${intent.id}/wallet-payment`,headers:{...headers(who.token),'idempotency-key':randomUUID()}});expect(pay.statusCode,pay.body).toBe(201);
      const grant=await db.assessmentAccessGrant.findFirstOrThrow({where:{purchaseId:intent.assessmentPurchaseId}}),started=await request(who,'POST',`/v1/patients/me/assessment-access-grants/${grant.id}/submission`);expect(started.statusCode,started.body).toBe(201);expect(started.json().id).not.toBe(who.submissionId);
      await complete(started.json().id);expect((await request(who,'GET','/v1/patients/me/mezaj')).json().assessmentSubmissionId).toBe(started.json().id);
      const currentOffering=await request(who,'GET',`/v1/patients/me/educational-assessment-offerings/${offer.json().adminPublicationId}`);expect(currentOffering.json().publicPurchaseAvailable).toBe(true);
    }
    expect(await db.patientAssessmentSubmission.count({where:{patientId:profile.id,assessmentVersionId:source.id,state:'COMPLETE'}})).toBe(3);expect(await db.billingIntent.count({where:{patientId:profile.id,purpose:'ENTRY_ASSESSMENT'}})).toBe(0);
    await policy(false);
  });
  it('rolls back the entire initial attempt when entry audit fails, then retries without an orphan',async()=>{
    await policy(true);const who=await actor();await request(who,'POST','/v1/patients/me/entry/profile',{firstName:'Synthetic',lastName:'Person',gender:'FEMALE',birthDate:'1990-01-01'});
    await db.$executeRawUnsafe(`CREATE FUNCTION entry_start_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id='${who.userId}'::uuid AND NEW.action='PATIENT_ENTRY_STARTED' THEN RAISE EXCEPTION 'Synthetic audit rollback'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER entry_start_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION entry_start_fail()');
    try{expect((await request(who,'POST','/v1/patients/me/entry/start')).statusCode).toBe(500);expect(await db.patientAssessmentSubmission.count({where:{patientId:who.patientId}})).toBe(0);expect((await db.patientEntry.findUniqueOrThrow({where:{patientId:who.patientId}})).submissionId).toBeNull();}
    finally{await db.$executeRawUnsafe('DROP TRIGGER entry_start_fail ON audit_events');await db.$executeRawUnsafe('DROP FUNCTION entry_start_fail()');}
    const started=await request(who,'POST','/v1/patients/me/entry/start');expect(started.statusCode,started.body).toBe(200);expect(await db.patientAssessmentSubmission.count({where:{patientId:who.patientId}})).toBe(1);await policy(false);
  });
  it('hides a questionnaire from catalog and direct public starts while preserving exact entry access',async()=>{
    const hidden=await source();
    const changed=await app.inject({method:'PATCH',url:`/v1/admin/assessments/${hidden.id}/distribution`,headers:headers(admin.token),payload:{publiclyAvailable:false}});
    expect(changed.statusCode,changed.body).toBe(200);expect(changed.json()).toEqual({publiclyAvailable:false});
    const who=await actor('PATIENT',true);
    expect((await request(who,'POST','/v1/patients/me/entry/profile',{firstName:'Synthetic',lastName:'Person',gender:'FEMALE',birthDate:'1990-01-01'})).statusCode).toBe(200);
    const list=await request(who,'GET','/v1/assessments');expect(list.statusCode,list.body).toBe(200);expect(list.json().items.some((item:{id:string})=>item.id===hidden.id)).toBe(false);
    expect((await request(who,'POST',`/v1/assessments/${hidden.id}/submissions`)).statusCode).toBe(404);
    const entry=await prepared(hidden.id);expect(entry.submissionId).toBeTruthy();
  });
  it('persists entry introduction, preserves it for older clients and exposes it before start', async () => {
    const configured=(await request(admin,'GET','/v1/admin/assessment-entry-policy')).json();
    const introduction='برای شناخت بهتر خودتان، این آزمون را کامل کنید.\nپس از ادامه سؤال‌ها نمایش داده می‌شوند.';
    const saved=await request(admin,'PUT','/v1/admin/assessment-entry-policy',{enabled:true,assessmentVersionId:sourceId,expectedRevision:configured.revision,introduction});
    expect(saved.statusCode,saved.body).toBe(200);expect(saved.json().introduction).toBe(introduction);
    const who=await actor();expect((await status(who)).json().introduction).toBe(introduction);
    const profile=await request(who,'POST','/v1/patients/me/entry/profile',{firstName:'Synthetic',lastName:'Person',gender:'FEMALE',birthDate:'1990-01-01'});
    expect(profile.json()).toMatchObject({phase:'ASSESSMENT',introduction});
    expect((await policy(true)).json().introduction).toBe(introduction);
    const current=(await request(admin,'GET','/v1/admin/assessment-entry-policy')).json();
    const cleared=await request(admin,'PUT','/v1/admin/assessment-entry-policy',{enabled:true,assessmentVersionId:sourceId,expectedRevision:current.revision,introduction:'   '});
    expect(cleared.json().introduction).toBeNull();expect((await status(who)).json().introduction).toContain('پاسخی را انتخاب کنید');
  });
  it('starts the exact offered entry once without consent or financial fabrication',async()=>{
    const offered=await source(),auth=await actor('ADMIN');await db.clinicalClinicAccess.create({data:{userId:auth.userId,clinicId}});
    const pub=await app.inject({method:'POST',url:'/v1/admin/assessment-offerings/inline-versions',headers:{...headers(auth.token),'idempotency-key':randomUUID()},payload:{assessmentVersionId:offered.id,expectedQuestionnaireHash:offered.contentHash,title:'Synthetic offering',kind:'INDIVIDUAL',priceMode:'PAID',amountRial:'100000',texts:{processing:'Synthetic',terms:'Synthetic',retention:'Synthetic',visibility:'Synthetic'}}});
    expect(pub.statusCode,pub.body).toBe(201);expect((await policy(true,offered.id)).statusCode).toBe(200);
    const who=await actor();expect((await request(who,'POST','/v1/patients/me/entry/profile',{firstName:'Synthetic',lastName:'Person',gender:'FEMALE',birthDate:'1990-01-01'})).statusCode).toBe(200);
    const attempts=await Promise.all([request(who,'POST','/v1/patients/me/entry/start'),request(who,'POST','/v1/patients/me/entry/start')]);
    expect(attempts.map(a=>a.statusCode),attempts.map(a=>a.body).join('\n')).toEqual([200,200]);expect(attempts[0].json().submissionId).toBe(attempts[1].json().submissionId);
    const submission=await db.patientAssessmentSubmission.findUniqueOrThrow({where:{id:attempts[0].json().submissionId}});expect(submission.entryPatientId).toBe(who.patientId);expect(submission.accessGrantId).toBeNull();
    expect(await db.patientConsentRecord.count({where:{patientId:who.patientId}})).toBe(0);expect(await db.billingIntent.count({where:{patientId:who.patientId}})).toBe(0);
  });
  it('requires and saves the complete basic profile when no assessment is configured', async () => {
    expect((await policy(false, null)).statusCode).toBe(200);
    const p = await actor();
    const initial = (await status(p)).json();
    expect(initial).toMatchObject({ required: true, assessmentRequired: false, phase: 'PROFILE', gender: null });
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', birthDate: '1990-01-01' })).statusCode).toBe(400);
    const saved = await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ required: false, assessmentRequired: false, phase: 'COMPLETE', firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' });
    expect((await request(p, 'GET', '/v1/patients/me/journey')).statusCode).toBe(200);
    expect(await db.userProfile.findUniqueOrThrow({ where: { userId: p.userId } })).toMatchObject({ gender: 'FEMALE' });
    expect(await db.patientMedicalIntake.count({ where: { patientId: p.patientId } })).toBe(0);
    expect(await db.patientConsentRecord.count({ where: { patientId: p.patientId } })).toBe(0);
    const completed = await db.patientEntry.findUniqueOrThrow({ where: { patientId: p.patientId } });
    expect(completed.completedAt).not.toBeNull();
    expect((await policy(true)).statusCode).toBe(200);
    expect((await status(p)).json()).toMatchObject({ required: false, phase: 'COMPLETE' });
    await expect(db.patientEntry.update({ where: { patientId: p.patientId }, data: { completedAt: null } })).rejects.toThrow();
  });
  it('requires incomplete old profiles without enrolling old accounts into a new assessment policy', async () => {
    const old = await actor('PATIENT', true);
    expect((await status(old)).json()).toMatchObject({ required: true, assessmentRequired: false, phase: 'PROFILE' });
    const saved = await request(old, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'MALE', birthDate: '1990-01-01' });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ required: false, phase: 'COMPLETE' });
    expect((await status(old)).json().required).toBe(false);
  });
  it('gates new private requests and does not provision medical intake or consent', async () => {
    const p = await actor(); expect((await status(p)).json().phase).toBe('PROFILE');
    const blocked = await request(p, 'GET', '/v1/patients/me/journey'); expect(blocked.statusCode).toBe(403); expect(blocked.json().code).toBe('PATIENT_ENTRY_REQUIRED');
    expect((await request(p, 'POST', `/v1/assessments/${sourceId}/submissions`)).statusCode).toBe(403);
    expect(await db.patientMedicalIntake.count({ where: { patientId: p.patientId } })).toBe(0);
    expect(await db.patientConsentRecord.count({ where: { patientId: p.patientId } })).toBe(0);
  });
  it('validates basic details and resumes one bound source under concurrent start', async () => {
    expect((await policy(true)).statusCode).toBe(200);
    const p = await actor();
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: ' ', lastName: 'Person', gender: 'MALE', birthDate: '1990-02-30' })).statusCode).toBe(422);
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' })).json().phase).toBe('ASSESSMENT');
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' })).statusCode).toBe(200);
    const started = await Promise.all([request(p, 'POST', '/v1/patients/me/entry/start'), request(p, 'POST', '/v1/patients/me/entry/start')]);
    expect(started.map(r => r.statusCode)).toEqual([200, 200]); expect(started[0].json().submissionId).toBe(started[1].json().submissionId);
    expect(await db.patientAssessmentSubmission.count({ where: { patientId: p.patientId } })).toBe(1);
  });
  it('enforces bound submission ownership, server completion and idempotent enter-Home', async () => {
    const p = await prepared(); const other = await prepared();
    expect((await request(p, 'GET', `/v1/assessment-submissions/${other.submissionId}`)).statusCode).toBe(403);
    expect((await request(p, 'POST', '/v1/patients/me/entry/complete')).statusCode).toBe(409);
    const saved = await request(p, 'PUT', `/v1/assessment-submissions/${p.submissionId}`, { answers: { q: true }, expectedRevision: 0 }); expect(saved.statusCode).toBe(200);
    const result = await app.inject({ method: 'POST', url: `/v1/assessment-submissions/${p.submissionId}/submit`, headers: { ...headers(p.token), 'Idempotency-Key': randomUUID() }, payload: { expectedRevision: saved.json().revision } }); expect(result.statusCode).toBe(201);
    expect((await status(p)).json().phase).toBe('RESULT');
    expect((await request(p, 'GET', '/v1/patients/me/journey')).statusCode).toBe(403);
    expect((await request(p, 'POST', '/v1/patients/me/entry/complete')).json().required).toBe(false);
    expect((await request(p, 'POST', '/v1/patients/me/entry/complete')).statusCode).toBe(200);
    expect((await request(p, 'GET', '/v1/patients/me/journey')).statusCode).toBe(200);
    expect(await db.patientMedicalIntake.count({ where: { patientId: p.patientId } })).toBe(0);
    const completed = await db.patientEntry.findUniqueOrThrow({ where: { patientId: p.patientId } });
    await db.userProfile.update({ where: { userId: p.userId }, data: { gender: null } });
    expect((await status(p)).json().phase).toBe('PROFILE');
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' })).json().phase).toBe('COMPLETE');
    expect((await db.patientEntry.findUniqueOrThrow({ where: { patientId: p.patientId } })).completedAt).toEqual(completed.completedAt);
  });
  it('repairs missing legacy demographics without losing an in-progress assessment or answers', async () => {
    const p = await prepared();
    const saved = await request(p, 'PUT', `/v1/assessment-submissions/${p.submissionId}`, { answers: { q: true }, expectedRevision: 0 });
    expect(saved.statusCode).toBe(200);
    await db.userProfile.update({ where: { userId: p.userId }, data: { gender: null } });
    expect((await status(p)).json()).toMatchObject({ required: true, phase: 'PROFILE', submissionId: p.submissionId });
    const repaired = await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' });
    expect(repaired.statusCode).toBe(200);
    expect(repaired.json()).toMatchObject({ phase: 'ASSESSMENT', submissionId: p.submissionId });
    expect(await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: p.submissionId } })).toMatchObject({ answers: { q: true }, revision: saved.json().revision, state: 'IN_PROGRESS' });
  });
  it('rejects database completion without the currently required assessment', async () => {
    expect((await policy(true)).statusCode).toBe(200);
    const p = await actor();
    await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'MALE', birthDate: '1990-01-01' });
    await expect(db.patientEntry.update({ where: { patientId: p.patientId }, data: { completedAt: new Date() } })).rejects.toThrow();
    const current = await db.patientEntryPolicy.findUniqueOrThrow({ where: { clinicId } });
    await expect(db.patientEntryPolicy.update({ where: { clinicId }, data: { enforcedFrom: new Date(current.enforcedFrom!.getTime() + 1000) } })).rejects.toThrow();
  });
  it('serializes concurrent profile-only completion and preserves its completion marker', async () => {
    expect((await policy(false, null)).statusCode).toBe(200);
    const p = await actor();
    const body = { firstName: 'Synthetic', lastName: 'Person', gender: 'FEMALE', birthDate: '1990-01-01' };
    const responses = await Promise.all([request(p, 'POST', '/v1/patients/me/entry/profile', body), request(p, 'POST', '/v1/patients/me/entry/profile', body)]);
    expect(responses.map(r => r.statusCode)).toEqual([200, 200]);
    expect(responses.every(r => r.json().required === false)).toBe(true);
    expect(await db.patientEntry.count({ where: { patientId: p.patientId } })).toBe(1);
    expect(await db.auditEvent.count({ where: { action: 'PATIENT_ENTRY_PROFILE_SAVED', subjectId: p.patientId } })).toBe(1);
  });
  it('keeps started assessments pinned when ADMIN changes the selection', async () => {
    const p = await prepared(); const replacement = await source();
    expect((await policy(true, replacement.id)).statusCode).toBe(200);
    expect((await status(p)).json().assessmentVersionId).toBe(sourceId);
    const newer = await prepared(replacement.id); expect((await status(newer)).json().assessmentVersionId).toBe(replacement.id);
    expect((await policy(true)).statusCode).toBe(200);
  });
  it('shows unavailable sources explicitly and lets ADMIN disable a retired configuration', async () => {
    const temporary = await source(); expect((await policy(true, temporary.id)).statusCode).toBe(200);
    const p = await actor(); await db.assessmentVersion.update({ where: { id: temporary.id }, data: { status: 'RETIRED', retiredAt: new Date() } });
    expect((await status(p)).json().phase).toBe('PROFILE');
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', gender: 'MALE', birthDate: '1990-01-01' })).json().phase).toBe('UNAVAILABLE');
    expect((await policy(false, temporary.id)).statusCode).toBe(200); expect((await status(p)).json().required).toBe(false);
  });
  it('saves and completes owned self-reported health without consent configuration or a repeated gender answer', async () => {
    const clinic = await db.clinic.create({ data: { name: 'Synthetic independent health', status: 'INACTIVE' } });
    const p = await actor();
    await db.patientProfile.update({ where: { id: p.patientId }, data: { clinicId: clinic.id } });
    const profile = await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Health', gender: 'FEMALE', birthDate: '1990-01-01' });
    expect(profile.statusCode, profile.body).toBe(200);
    const body = { expectedRevision: 0, birthDate: profile.json().birthDate, allergyReport: { status: 'NONE', items: [] }, chronicConditionReport: { status: 'UNKNOWN', items: [] }, currentMedicationReport: { status: 'PRESENT', items: ['Synthetic medication'] } };
    const saved = await request(p, 'PUT', '/v1/patients/me/medical-intake', body);
    expect(saved.statusCode, saved.body).toBe(200);
    const key = randomUUID();
    const complete = () => app.inject({ method: 'POST', url: '/v1/patients/me/medical-intake/complete', headers: { ...headers(p.token), 'idempotency-key': key }, payload: { expectedRevision: saved.json().currentRevision } });
    const completed = await complete(); expect(completed.statusCode, completed.body).toBe(200);
    expect(completed.json()).toMatchObject({ submissionState: 'COMPLETE', snapshot: { sexAtBirth: null } });
    expect((await complete()).json().currentRevision).toBe(completed.json().currentRevision);
    const summary = await request(p, 'GET', '/v1/patients/me/onboarding-status');
    expect(summary.json()).toMatchObject({ isComplete: true, missingFields: [], blockerCodes: [], activeConsentRecordId: null });
    expect(await db.patientConsentRecord.count({ where: { patientId: p.patientId } })).toBe(0);
    expect(await db.consentPolicyVersion.count({ where: { clinicId: clinic.id } })).toBe(0);
    const revision = await db.patientMedicalIntakeRevision.findFirstOrThrow({ where: { intake: { patientId: p.patientId }, revisionState: 'COMPLETE' } });
    expect(revision.completedConsentRecordId).toBeNull();
    const other = await actor();
    expect((await request(other, 'GET', '/v1/patients/me/medical-intake')).statusCode).toBe(403);
  });
});
