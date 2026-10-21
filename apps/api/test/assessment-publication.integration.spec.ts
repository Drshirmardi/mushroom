import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { AssessmentPublicationService } from '../src/modules/assessments/publication/assessment-publication.service';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('assessment commercial publication (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication, db: PrismaService, clinicId: string, roleId: string;
  let originalGrant = true;
  let admin: Awaited<ReturnType<typeof actor>>, doctor: Awaited<ReturnType<typeof actor>>;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? ''); if (!['127.0.0.1','localhost'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test:55419 required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService); clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    roleId = (await db.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } })).id; originalGrant = !!await db.clinicalRolePermission.findUnique({ where: { roleId_permission: { roleId, permission: 'CLINICAL_RECORD_SIGN' } } });
    await db.clinicalRolePermission.upsert({ where: { roleId_permission: { roleId, permission: 'CLINICAL_RECORD_SIGN' } }, create: { roleId, permission: 'CLINICAL_RECORD_SIGN' }, update: {} });
    admin = await actor('ADMIN'); doctor = await actor('DOCTOR');
  }, 30_000);
  afterAll(async () => { if (db && !originalGrant) await db.clinicalRolePermission.deleteMany({ where: { roleId, permission: 'CLINICAL_RECORD_SIGN' } }); await app?.close(); });
  async function actor(role: 'ADMIN'|'DOCTOR'|'PATIENT', membership = true, liveRole = true) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]); if (liveRole) await db.userRole.create({ data: { userId: auth.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } });
    if (membership && role !== 'PATIENT') await db.clinicalClinicAccess.create({ data: { userId: auth.userId, clinicId } });
    if (role === 'DOCTOR') { const key = randomUUID(); const s = await db.specialty.create({ data: { clinicId, name: key, canonicalName: key, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }); const d = await db.doctorProfile.create({ data: { clinicId, userId: auth.userId, displayName: 'Synthetic commercial protocol reviewer' } }); await db.doctorSpecialty.create({ data: { clinicId, doctorId: d.id, specialtyId: s.id } }); await db.doctorProfile.update({ where: { id: d.id }, data: { isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }); }
    return auth;
  }
  const req = (method:'GET'|'POST', path:string, who = admin, payload?:object, key:string|null = randomUUID()) => app.inject({ method, url:`/v1/${path}`, headers:{ authorization:`Bearer ${who.token}`, origin:'http://localhost:3000', ...(key ? {'idempotency-key':key}:{}), ...(payload ? {'content-type':'application/json'}:{}) }, ...(payload ? {payload:JSON.stringify(payload)}:{}) });
  const base = 'admin/assessment-commercial-publications';
  const structure = { schemaVersion:1, sections:[{id:'one',questions:[{id:'q',type:'BOOLEAN',required:true,trueScore:1,falseScore:0}]}], resultBands:[{id:'one',title:'Synthetic',minInclusive:0,maxExclusive:2,riskLevel:'NONE',requiresReview:false}] };
  async function policy(purpose:string, locale='fa-IR', scope=clinicId, validHash=true) {
    await db.consentPolicyVersion.updateMany({where:{clinicId:scope,policyKey:purpose,locale,status:'ACTIVE'},data:{status:'RETIRED',retiredAt:new Date()}});
    const previous=await db.consentPolicyVersion.findFirst({where:{clinicId:scope,policyKey:purpose,locale},orderBy:{versionNumber:'desc'}});
    const body='Synthetic commercial fixture only. Not approved legal or clinical text.';
    return db.consentPolicyVersion.create({data:{clinicId:scope,policyKey:purpose,locale,versionNumber:(previous?.versionNumber??0)+1,title:'Synthetic commercial policy',body,contentHash:validHash?createHash('sha256').update(body).digest('hex'):'f'.repeat(64),status:'ACTIVE',activatedAt:new Date()}});
  }
  async function draft(definition: Record<string,unknown>) { const r=await req('POST','admin/assessment-offerings/versions',admin,definition); expect(r.statusCode,r.body).toBe(201); return r.json() as {id:string;offeringKey:string;versionNumber:number}; }
  const preview = (offeringId:string, termsId:string, who=admin) => req('GET',`${base}/preview?offeringVersionId=${offeringId}&termsPolicyVersionId=${termsId}`,who);
  async function prepared(kind:'INDIVIDUAL'|'COUPLES'='INDIVIDUAL') {
    const p=await policy('ASSESSMENT_PROCESSING'), t=await policy('ASSESSMENT_PURCHASE_TERMS');
    const v=(await req('POST','admin/assessments',admin,{assessmentKey:`TEST_${randomUUID()}`,locale:'fa-IR',title:'Synthetic commercial source',structure})).json(); expect((await req('POST',`admin/assessments/${v.id}/publish`)).statusCode).toBe(201);
    const pr=(await req('GET',`clinical/assessment-protocols/${v.id}?consentPolicyVersionId=${p.id}`,doctor)).json();
    const reviewResponse=await req('POST',`clinical/assessment-protocols/${v.id}/reviews`,doctor,{consentPolicyVersionId:p.id,protocolHash:pr.protocolHash,expectedReviewNumber:0,reviewedQuestionnaireAndScoring:true,educationalOnly:true,noDiagnosisOrTherapeuticDiet:true}); expect(reviewResponse.statusCode,reviewResponse.body).toBe(201); const review=reviewResponse.json();
    const definition={offeringKey:`O_${randomUUID().replaceAll('-','').toUpperCase()}`,kind,title:'Synthetic configurable assessment',assessmentVersionId:v.id,priceMode:'PAID',paymentPoint:'PRE_START',amountRial:'250000',currency:'IRR',algorithmId:'WEIGHTED_SUM',algorithmVersion:1,policyDraft:{minimumAgeYears:18,consentPolicyVersionId:p.id,retentionPolicyRef:'SYNTHETIC_RETENTION_NOT_LEGAL_POLICY',resultVisibilityPolicyRef:'SYNTHETIC_OWN_ACCOUNT',refundPolicyRef:'NO_REFUNDS'}};
    const d=await draft(definition); const r=await preview(d.id,t.id); expect(r.statusCode,r.body).toBe(200); expect(r.json().configurationReady).toBe(true);
    return {v,p,t,review,d,definition,body:{offeringVersionId:d.id,termsPolicyVersionId:t.id,publicationHash:r.json().publicationHash as string,expectedPublicationNumber:r.json().expectedPublicationNumber as number,reviewedTermsAndRetention:true}};
  }
  const publish = (f:Awaited<ReturnType<typeof prepared>>, who=admin, key:string|null=randomUUID(), patch={}) => req('POST',base,who,{...f.body,...patch},key);
  const usable = (id:string) => db.$transaction(tx=>app.get(AssessmentPublicationService).currentPublication(tx,clinicId,id));

  it('publishes configurable exact physician-reviewed tariff and fixed owner decisions without changing draft contract or charging',async()=>{
    const f=await prepared(); const before=await db.billingIntent.count(); const r=await publish(f); expect(r.statusCode,r.body).toBe(201); expect(r.json()).toMatchObject({status:'ACTIVE',publicationNumber:1,protocolReviewId:f.review.id,termsPolicyVersionId:f.t.id,offering:{amountRial:'250000'},policy:{minimumAgeYears:18,paymentPoint:'PRE_START',ordinaryRefunds:false,patientCancellation:false,invitationAutomaticExpiry:false,entitlementAutomaticExpiry:false}});
    expect((await usable(r.json().id))?.id).toBe(r.json().id); expect((await req('GET',`${base}/${r.json().id}`)).json()).toMatchObject({commercialUsable:true,blockers:[]});
    const old=await req('GET',`admin/assessment-offerings/${f.d.id}`); expect(old.json()).toMatchObject({status:'DRAFT',releaseReadiness:{ready:false}}); expect(await db.billingIntent.count()).toBe(before); expect(r.headers['cache-control']).toBe('private, no-store');
    for(const field of ['publishedByUserId','publishedSessionId','idempotencyKey','payloadHash','retiredByUserId','retiredSessionId']) expect(r.json()).not.toHaveProperty(field);
  });
  it('supports independently configured couples tariff without activating couples checkout or sharing any answers',async()=>{
    const f=await prepared('COUPLES'); const rs=await Promise.all([db.billingIntent.count(),db.patientAssessmentSubmission.count(),db.coupleSession.count()]);
    const r=await publish(f); expect(r.statusCode).toBe(201); expect(r.json().offering.kind).toBe('COUPLES'); expect(await Promise.all([db.billingIntent.count(),db.patientAssessmentSubmission.count(),db.coupleSession.count()])).toEqual(rs);
    expect((await app.inject({method:'GET',url:'/v1/patients/me/assessment-commercial-publications'})).statusCode).toBe(404);
  });
  it('changing dashboard tariff creates a retained replacement and leaves prior exact price immutable',async()=>{
    const f=await prepared(); const first=(await publish(f)).json(); const d=await draft({...f.definition,amountRial:'990000'}); const p=(await preview(d.id,f.t.id)).json(); expect(p.publicationHash).not.toBe(first.publicationHash);
    const r=await publish(f,admin,randomUUID(),{offeringVersionId:d.id,publicationHash:p.publicationHash,expectedPublicationNumber:1}); expect(r.statusCode,r.body).toBe(201); expect(r.json()).toMatchObject({publicationNumber:2,offering:{amountRial:'990000'}});
    const historical=(await req('GET',`${base}/${first.id}`)).json(); expect(historical).toMatchObject({status:'RETIRED',retirementReason:'REPLACED',offering:{amountRial:'250000'},commercialUsable:false}); expect(await usable(first.id)).toBeNull();
    expect(await db.assessmentOfferingPublication.count({where:{clinicId,offeringKey:f.d.offeringKey,status:'ACTIVE'}})).toBe(1);
  });
  it('canonical concurrent retries create one publication and retained replay never reactivates withdrawn tariff',async()=>{
    const f=await prepared(); const key=randomUUID(); const rs=await Promise.all(Array.from({length:8},(_,i)=>req('POST',base,admin,i%2?f.body:Object.fromEntries(Object.entries(f.body).reverse()),key))); expect(rs.map(r=>r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(rs.map(r=>r.json().id)).size).toBe(1);
    const id=rs[0]!.json().id; await req('POST',`${base}/${id}/retire`); const replay=await publish(f,admin,key); expect(replay.statusCode).toBe(201); expect(replay.json().status).toBe('RETIRED'); expect(await usable(id)).toBeNull();
    expect((await publish(f,admin,key,{expectedPublicationNumber:1})).json().code).toBe('IDEMPOTENCY_KEY_REUSED'); expect(await db.assessmentOfferingPublication.count({where:{offeringKey:f.d.offeringKey}})).toBe(1);
  });
  it('serializes distinct stale publication commands with exact expected publication revision',async()=>{
    const f=await prepared(); const rs=await Promise.all(Array.from({length:8},()=>publish(f))); expect(rs.filter(r=>r.statusCode===201)).toHaveLength(1); expect(rs.filter(r=>r.statusCode===409)).toHaveLength(7);
    expect((await publish(f,admin,randomUUID(),{expectedPublicationNumber:1})).statusCode).toBe(201); expect(await db.assessmentOfferingPublication.count({where:{offeringKey:f.d.offeringKey}})).toBe(2);
  });
  it('concurrent replacement/withdrawal retains a single current tariff and original retirement evidence',async()=>{
    const f=await prepared(); const first=(await publish(f)).json(); const d=await draft({...f.definition,amountRial:'400000'}); const p=(await preview(d.id,f.t.id)).json();
    const rs=await Promise.all([req('POST',`${base}/${first.id}/retire`),publish(f,admin,randomUUID(),{offeringVersionId:d.id,publicationHash:p.publicationHash,expectedPublicationNumber:1})]); expect(rs.map(r=>r.statusCode)).toEqual([201,201]);
    const old=await db.assessmentOfferingPublication.findUniqueOrThrow({where:{id:first.id}}); await req('POST',`${base}/${first.id}/retire`); expect(await db.assessmentOfferingPublication.findUnique({where:{id:first.id}})).toEqual(old);
    expect(await db.assessmentOfferingPublication.count({where:{offeringKey:f.d.offeringKey,status:'ACTIVE'}})).toBe(1);
  });
  it('requires exact preview hash, explicit terms attestation and strict command/query bounds',async()=>{
    const f=await prepared(); expect((await publish(f,admin,randomUUID(),{publicationHash:'f'.repeat(64)})).statusCode).toBe(409);
    for(const patch of [{reviewedTermsAndRetention:false},{expectedPublicationNumber:-1},{expectedPublicationNumber:0.1},{amountRial:'1'},{protocolReviewId:randomUUID()},{clinicId}]) expect((await publish(f,admin,randomUUID(),patch)).statusCode).toBe(400);
    expect((await publish(f,admin,null)).statusCode).toBe(422); expect((await req('GET',`${base}?pageSize=51`)).statusCode).toBe(400); expect((await req('GET',`${base}/preview?offeringVersionId=${f.d.id}`)).statusCode).toBe(400);
  });
  it('enforces live scoped ADMIN and active owned session on every administrative operation',async()=>{
    const f=await prepared(); const row=(await publish(f)).json();
    for(const who of [doctor,await actor('PATIENT'),await actor('ADMIN',false),await actor('ADMIN',true,false)]) {
      for(const [method,path,payload] of [['GET',base,undefined],['GET',`${base}/${row.id}`,undefined],['GET',`${base}/preview?offeringVersionId=${f.d.id}&termsPolicyVersionId=${f.t.id}`,undefined],['POST',base,f.body],['POST',`${base}/${row.id}/retire`,undefined]] as const) expect((await req(method,path,who,payload)).statusCode).toBe(403);
    }
    const who=await actor('ADMIN'); await db.session.update({where:{id:who.sessionId},data:{revokedAt:new Date(),revokedReason:'LOGOUT'}}); expect((await req('GET',base,who)).statusCode).toBe(401); expect((await app.inject({method:'GET',url:`/v1/${base}`})).statusCode).toBe(401);
  });
  it('rejects incomplete/conflicting draft policies without weakening historical draft acceptance',async()=>{
    const f=await prepared();
    for(const patch of [{amountRial:null},{paymentPoint:'PRE_RESULT_UNLOCK'},{algorithmId:'UNAPPROVED'},{policyDraft:{...f.definition.policyDraft,minimumAgeYears:17}},{policyDraft:{...f.definition.policyDraft,invitationTtlHours:24}},{policyDraft:{...f.definition.policyDraft,entitlementValidityDays:365}},{policyDraft:{...f.definition.policyDraft,refundPolicyRef:'REFUND_ANY_TIME'}},{policyDraft:{minimumAgeYears:18,consentPolicyVersionId:f.p.id}}]) {
      const d=await draft({...f.definition,...patch}); const p=await preview(d.id,f.t.id); expect(p.json().configurationReady).toBe(false); expect((await publish(f,admin,randomUUID(),{offeringVersionId:d.id,publicationHash:p.json().publicationHash})).statusCode).toBe(422);
    }
    const free=await draft({...f.definition,priceMode:'FREE',paymentPoint:null,amountRial:'0'}); expect((await preview(free.id,f.t.id)).json().blockers).toContain('PAID_PRE_START_TARIFF_REQUIRED');
  });
  it('conceals wrong clinic/purpose/locale terms and foreign publication/source',async()=>{
    const f=await prepared(); const foreign=await db.clinic.create({data:{name:'Synthetic foreign commercial clinic',status:'INACTIVE'}});
    for(const t of [await policy(`TEST_OTHER_${randomUUID()}`),await policy('ASSESSMENT_PURCHASE_TERMS','en-US'),await policy('ASSESSMENT_PURCHASE_TERMS','fa-IR',foreign.id)]) { expect((await preview(f.d.id,t.id)).statusCode).toBe(404); expect((await publish(f,admin,randomUUID(),{termsPolicyVersionId:t.id})).statusCode).toBe(404); }
    const q=await db.assessmentVersion.create({data:{clinicId:foreign.id,assessmentKey:'TEST',locale:'fa-IR',versionNumber:1,title:'Synthetic foreign',structure,contentHash:'a'.repeat(64),status:'PUBLISHED',publishedAt:new Date()}});
    const d=await db.assessmentOfferingVersion.create({data:{clinicId:foreign.id,offeringKey:'TEST',versionNumber:1,kind:'INDIVIDUAL',locale:'fa-IR',title:'Synthetic',assessmentVersionId:q.id,priceMode:'PAID',currency:'IRR',createdByUserId:admin.userId,idempotencyKey:randomUUID(),payloadHash:'a'.repeat(64)}}); expect((await preview(d.id,f.t.id)).statusCode).toBe(404); expect((await req('GET',`${base}/${randomUUID()}`)).statusCode).toBe(404);
  });
  it('terms rotation/hash mismatch blocks commercial usability and never falls back to retired prices',async()=>{
    const f=await prepared(); const row=(await publish(f)).json(); const next=await policy('ASSESSMENT_PURCHASE_TERMS'); expect(await usable(row.id)).toBeNull(); expect((await req('GET',`${base}/${row.id}`)).json().blockers).toContain('PURCHASE_TERMS_UNAVAILABLE');
    expect((await publish(f,admin,randomUUID(),{expectedPublicationNumber:1})).statusCode).toBe(409); const p=(await preview(f.d.id,next.id)).json(); expect(p.publicationHash).not.toBe(row.publicationHash); expect((await publish(f,admin,randomUUID(),{expectedPublicationNumber:1,termsPolicyVersionId:next.id,publicationHash:p.publicationHash})).statusCode).toBe(201);
    const broken=await policy('ASSESSMENT_PURCHASE_TERMS','fa-IR',clinicId,false); expect((await preview(f.d.id,broken.id)).json().blockers).toContain('PURCHASE_TERMS_UNAVAILABLE');
  });
  it('physician withdrawal/re-review cannot inherit publication and retirement stays possible with unavailable sources',async()=>{
    const f=await prepared(); const row=(await publish(f)).json(); expect((await req('POST',`clinical/assessment-protocols/${f.v.id}/reviews/${f.review.id}/withdrawal`,doctor,{protocolHash:f.review.protocolHash,expectedReviewNumber:1,withdrawalReason:'Synthetic withdrawal'})).statusCode).toBe(201); expect(await usable(row.id)).toBeNull();
    const p=(await req('GET',`clinical/assessment-protocols/${f.v.id}`,doctor)).json(); expect((await req('POST',`clinical/assessment-protocols/${f.v.id}/reviews`,doctor,{consentPolicyVersionId:f.p.id,protocolHash:p.protocolHash,expectedReviewNumber:2,reviewedQuestionnaireAndScoring:true,educationalOnly:true,noDiagnosisOrTherapeuticDiet:true})).statusCode).toBe(201); expect(await usable(row.id)).toBeNull(); expect((await req('GET',`${base}/${row.id}`)).json().blockers).toContain('PUBLICATION_SOURCE_CHANGED');
    await db.assessmentVersion.update({where:{id:f.v.id},data:{status:'RETIRED',retiredAt:new Date()}}); await policy('ASSESSMENT_PURCHASE_TERMS'); expect((await req('POST',`${base}/${row.id}/retire`)).statusCode).toBe(201);
  });
  it('retiring source draft or losing reviewer authority prevents new commercial use',async()=>{
    const f=await prepared(); const row=(await publish(f)).json(); await req('POST',`admin/assessment-offerings/${f.d.id}/retire`); expect(await usable(row.id)).toBeNull(); expect((await req('GET',`${base}/${row.id}`)).json().blockers).toContain('DRAFT_RETIRED');
    const g=await prepared(); const current=(await publish(g)).json(); await db.clinicalClinicAccess.delete({where:{userId_clinicId:{userId:doctor.userId,clinicId}}}); try {expect(await usable(current.id)).toBeNull();} finally {await db.clinicalClinicAccess.create({data:{userId:doctor.userId,clinicId}});}
  });
  it('bounded retained history filters tariff kind/key without private command or actor fields',async()=>{
    const f=await prepared(); await publish(f); await publish(f,admin,randomUUID(),{expectedPublicationNumber:1}); const r=await req('GET',`${base}?offeringKey=${f.d.offeringKey}&kind=INDIVIDUAL&page=1&pageSize=1`); expect(r.statusCode).toBe(200); expect(r.json()).toMatchObject({total:2,page:1,pageSize:1,items:[{publicationNumber:2}]});
    for(const field of ['publishedByUserId','publishedSessionId','idempotencyKey','payloadHash']) expect(r.json().items[0]).not.toHaveProperty(field); expect((await req('GET',`${base}?offeringKey=${f.d.offeringKey}&kind=COUPLES`)).json().items).toEqual([]);
  });
  it('database rejects snapshot/evidence mutation, reactivation, deletion, forged actor/session and sequence gaps',async()=>{
    const f=await prepared(); const row=(await publish(f)).json(); const actual=await db.assessmentOfferingPublication.findUniqueOrThrow({where:{id:row.id}}); const stored={...actual,policySnapshot:actual.policySnapshot as Prisma.InputJsonObject};
    await expect(db.assessmentOfferingPublication.update({where:{id:row.id},data:{publicationHash:'b'.repeat(64)}})).rejects.toThrow(/immutable/); await expect(db.assessmentOfferingPublication.delete({where:{id:row.id}})).rejects.toThrow(/retained/);
    await expect(db.assessmentOfferingPublication.create({data:{...stored,id:randomUUID(),publicationNumber:8,idempotencyKey:randomUUID()}})).rejects.toThrow(/consecutive/);
    await expect(db.assessmentOfferingPublication.create({data:{...stored,id:randomUUID(),publicationNumber:2,idempotencyKey:randomUUID(),publishedByUserId:doctor.userId,publishedSessionId:doctor.sessionId}})).rejects.toThrow(/administrator role/);
    await expect(db.assessmentOfferingPublication.create({data:{...stored,id:randomUUID(),publicationNumber:2,idempotencyKey:randomUUID(),publishedSessionId:doctor.sessionId}})).rejects.toThrow(/owned commercial administrator session/);
    await expect(db.assessmentOfferingPublication.update({where:{id:row.id},data:{status:'RETIRED',retiredAt:new Date(stored.createdAt.getTime()+60_000),retiredByUserId:admin.userId,retiredSessionId:admin.sessionId,retirementReason:'REPLACED'}})).rejects.toThrow(/atomic successor/);
    await req('POST',`${base}/${row.id}/retire`); await expect(db.assessmentOfferingPublication.update({where:{id:row.id},data:{status:'ACTIVE',retiredAt:null,retiredByUserId:null,retiredSessionId:null,retirementReason:null}})).rejects.toThrow(/final/);
    const retired=await db.assessmentOfferingPublication.findUniqueOrThrow({where:{id:row.id}}); await expect(db.assessmentOfferingPublication.update({where:{id:row.id},data:{retiredAt:new Date(retired.retiredAt!.getTime()+1)}})).rejects.toThrow(/evidence is immutable/);
  });
  it('database rejects fixed policy/source/terms/protocol forgery on the next valid sequence',async()=>{
    const f=await prepared(); const row=(await publish(f)).json(); const actual=await db.assessmentOfferingPublication.findUniqueOrThrow({where:{id:row.id}}); const stored={...actual,policySnapshot:actual.policySnapshot as Prisma.InputJsonObject}; await req('POST',`${base}/${row.id}/retire`);
    for(const patch of [{policySnapshot:{...stored.policySnapshot as object,ordinaryRefunds:true}},{termsContentHash:'f'.repeat(64)},{protocolReviewId:randomUUID()},{offeringKey:'UNRELATED'}]) await expect(db.assessmentOfferingPublication.create({data:{...stored,id:randomUUID(),publicationNumber:2,idempotencyKey:randomUUID(),createdAt:new Date(Date.now()+1000),...patch}})).rejects.toThrow();
    expect(await db.assessmentOfferingPublication.count({where:{offeringKey:f.d.offeringKey,status:'ACTIVE'}})).toBe(0);
  });
  it('retirement/republication preserve monotonic evidence across backwards clock steps',async()=>{
    const f=await prepared(); const row=(await publish(f)).json(); const actual=await db.assessmentOfferingPublication.findUniqueOrThrow({where:{id:row.id}}); const stored={...actual,policySnapshot:actual.policySnapshot as Prisma.InputJsonObject}; await req('POST',`${base}/${row.id}/retire`);
    const retained=await db.assessmentOfferingPublication.findUniqueOrThrow({where:{id:row.id}});
    const future=await db.assessmentOfferingPublication.create({data:{...stored,id:randomUUID(),publicationNumber:2,idempotencyKey:randomUUID(),createdAt:new Date(retained.retiredAt!.getTime()+60_000)}});
    const retired=await req('POST',`${base}/${future.id}/retire`); expect(retired.statusCode).toBe(201); expect(new Date(retired.json().retiredAt).getTime()).toBeGreaterThanOrEqual(future.createdAt.getTime());
    const r=await publish(f,admin,randomUUID(),{expectedPublicationNumber:2}); expect(r.statusCode,r.body).toBe(201); expect(new Date(r.json().createdAt).getTime()).toBeGreaterThanOrEqual(new Date(retired.json().retiredAt).getTime());
  });
  it('audit failure denies reads and rolls back initial publication/replacement/withdrawal atomically',async()=>{
    const f=await prepared(); const first=(await publish(f)).json(); const failing=await actor('ADMIN'); const empty=await draft({...f.definition,offeringKey:`O_${randomUUID().replaceAll('-','').toUpperCase()}`}); const p=(await preview(empty.id,f.t.id)).json();
    if(!/^[a-f0-9-]{36}$/.test(failing.userId)) throw new Error('Synthetic UUID required');
    await db.$executeRawUnsafe(`CREATE FUNCTION commercial_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id='${failing.userId}'::uuid THEN RAISE EXCEPTION 'synthetic commercial audit failure'; END IF; RETURN NEW; END $$`); await db.$executeRaw(Prisma.sql`CREATE TRIGGER commercial_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION commercial_test_audit_fail()`);
    try {
      for(const r of [await publish(f,failing,randomUUID(),{offeringVersionId:empty.id,publicationHash:p.publicationHash}),await publish(f,failing,randomUUID(),{expectedPublicationNumber:1}),await req('POST',`${base}/${first.id}/retire`,failing),await preview(f.d.id,f.t.id,failing),await req('GET',`${base}/${first.id}`,failing),await req('GET',base,failing)]) {expect(r.statusCode).toBe(500);expect(r.body).not.toContain('synthetic commercial audit failure');}
      expect(await db.assessmentOfferingPublication.count({where:{offeringKey:empty.offeringKey}})).toBe(0); expect(await db.assessmentOfferingPublication.count({where:{offeringKey:f.d.offeringKey}})).toBe(1); expect((await db.assessmentOfferingPublication.findUniqueOrThrow({where:{id:first.id}})).status).toBe('ACTIVE');
    } finally {await db.$executeRaw(Prisma.sql`DROP TRIGGER commercial_test_audit_fail ON audit_events`);await db.$executeRaw(Prisma.sql`DROP FUNCTION commercial_test_audit_fail()`);}
    const events=await db.auditEvent.findMany({where:{subjectType:'ASSESSMENT_COMMERCIAL',subjectId:first.id}}); expect(events.length).toBeGreaterThan(0); expect(events.every(e=>JSON.stringify(e.metadata)==='{}')).toBe(true);
  });
});
