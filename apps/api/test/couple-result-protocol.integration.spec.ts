import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { CoupleResultProtocolService } from '../src/modules/assessments/couples/result-protocol/couple-result-protocol.service';
import { selectCouplePair, type CoupleResultPair } from '../src/modules/assessments/couples/result-protocol/couple-result-protocol.definition';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('joint educational protocol (isolated PostgreSQL)',()=>{
  let app:NestFastifyApplication,db:PrismaService,clinicId:string,roleId:string,originalGrant=true,contentId:string;
  let admin:Awaited<ReturnType<typeof actor>>,doctor:Awaited<ReturnType<typeof actor>>;
  const base='admin/couple-result-protocols',clinical='clinical/couple-result-protocols';
  beforeAll(async()=>{
    const target=new URL(process.env.DATABASE_URL??'');if(!['localhost','127.0.0.1'].includes(target.hostname)||target.port!=='55419'||target.pathname!=='/patient_journey_test')throw new Error('Disposable patient_journey_test:55419 required.');
    Logger.overrideLogger(['error']);app=await createApiApplication();await app.init();db=app.get(PrismaService);clinicId=(await db.clinic.findFirstOrThrow({where:{status:'ACTIVE'}})).id;
    roleId=(await db.role.findUniqueOrThrow({where:{code:'DOCTOR'}})).id;originalGrant=!!await db.clinicalRolePermission.findUnique({where:{roleId_permission:{roleId,permission:'CLINICAL_RECORD_SIGN'}}});await grant();admin=await actor('ADMIN');doctor=await actor('DOCTOR');contentId=await content();
  },30_000);
  afterAll(async()=>{try{if(db&&!originalGrant)await db.clinicalRolePermission.deleteMany({where:{roleId,permission:'CLINICAL_RECORD_SIGN'}});}finally{await app?.close();}});
  const grant=()=>db.clinicalRolePermission.upsert({where:{roleId_permission:{roleId,permission:'CLINICAL_RECORD_SIGN'}},create:{roleId,permission:'CLINICAL_RECORD_SIGN'},update:{}});
  async function actor(role:'ADMIN'|'DOCTOR'|'PATIENT',member=true,liveRole=true){
    const a=await createTestAccessToken(db,app.get(AccessTokenService),[role]);if(liveRole)await db.userRole.create({data:{userId:a.userId,roleId:(await db.role.findUniqueOrThrow({where:{code:role}})).id}});if(member&&role!=='PATIENT')await db.clinicalClinicAccess.create({data:{userId:a.userId,clinicId}});
    if(role==='DOCTOR'){const key=randomUUID();const specialty=await db.specialty.create({data:{clinicId,name:key,canonicalName:key,isActive:true,publicationStatus:'PUBLISHED',publishedAt:new Date()}});const d=await db.doctorProfile.create({data:{clinicId,userId:a.userId,displayName:'Synthetic joint reviewer'}});await db.doctorSpecialty.create({data:{clinicId,doctorId:d.id,specialtyId:specialty.id}});await db.doctorProfile.update({where:{id:d.id},data:{isActive:true,publicationStatus:'PUBLISHED',publishedAt:new Date()}});}return a;
  }
  const req=(method:'GET'|'POST',path:string,who=admin,payload?:object,key:string|null=randomUUID())=>app.inject({method,url:`/v1/${path}`,headers:{authorization:`Bearer ${who.token}`,origin:'http://localhost:3000',...(key?{'idempotency-key':key}:{}),...(payload?{'content-type':'application/json'}:{})},...(payload?{payload:JSON.stringify(payload)}:{})});
  const attest=(r:{contentHash:string})=>({contentHash:r.contentHash,educationalOnly:true,noDiagnosisOrTherapeuticDiet:true});
  async function content(){const key=randomUUID();const category=await db.articleCategory.create({data:{clinicId,name:key,slug:key}});const article=await db.article.create({data:{clinicId,categoryId:category.id,slug:key,title:'Synthetic joint education',body:'Synthetic fixture only; no validity or medical advice.'}});const r=await req('POST','admin/guidance-content/versions',admin,{articleId:article.id,locale:'fa-IR',kind:'GENERAL_EDUCATION',provenance:[{label:'Synthetic',url:'https://example.org/synthetic',accessedOn:'2026-10-17'}],safety:{intendedAudience:'Synthetic adult fixture',limitations:'Education only',contraindications:[],seekProfessionalCare:'Qualified professional review'}});expect(r.statusCode,r.body).toBe(201);expect((await req('POST',`clinical/guidance-content/${r.json().id}/approve`,doctor,attest(r.json()))).statusCode).toBe(201);return r.json().id as string;}
  async function policy(key:string,locale='fa-IR',scope=clinicId){await db.consentPolicyVersion.updateMany({where:{clinicId:scope,policyKey:key,locale,status:'ACTIVE'},data:{status:'RETIRED',retiredAt:new Date()}});const n=await db.consentPolicyVersion.findFirst({where:{clinicId:scope,policyKey:key,locale},orderBy:{versionNumber:'desc'}});const body='Synthetic joint disclosure fixture. Not approved legal text.';return db.consentPolicyVersion.create({data:{clinicId:scope,policyKey:key,locale,versionNumber:(n?.versionNumber??0)+1,title:'Synthetic',body,contentHash:createHash('sha256').update(body).digest('hex'),status:'ACTIVE',activatedAt:new Date()}});}
  async function configured(requiresReview=false,reference=contentId){
    const processing=await policy('ASSESSMENT_PROCESSING'),disclosure=await policy('COUPLES_RESULT_SHARING');const structure={schemaVersion:1,sections:[{id:'one',questions:[{id:'q',type:'BOOLEAN',required:true,trueScore:1,falseScore:0}]}],resultBands:[{id:'first',title:'Synthetic first',minInclusive:0,maxExclusive:1,requiresReview},{id:'second',title:'Synthetic second',minInclusive:1,maxExclusive:2,requiresReview}]};
    const r=await req('POST','admin/assessments',admin,{assessmentKey:`TEST_${randomUUID()}`,locale:'fa-IR',title:'Synthetic joint source',structure});expect(r.statusCode,r.body).toBe(201);const source=r.json();expect((await req('POST',`admin/assessments/${source.id}/publish`)).statusCode).toBe(201);
    const preview=(await req('GET',`clinical/assessment-protocols/${source.id}?consentPolicyVersionId=${processing.id}`,doctor)).json();const approved=await req('POST',`clinical/assessment-protocols/${source.id}/reviews`,doctor,{consentPolicyVersionId:processing.id,protocolHash:preview.protocolHash,expectedReviewNumber:0,reviewedQuestionnaireAndScoring:true,educationalOnly:true,noDiagnosisOrTherapeuticDiet:true});expect(approved.statusCode,approved.body).toBe(201);
    const pairs=[['first','first'],['first','second'],['second','second']].map(([firstBandId,secondBandId])=>({firstBandId:firstBandId!,secondBandId:secondBandId!,guidanceContentIds:[reference],recommendConsultation:true}));
    return {source,review:approved.json(),processing,disclosure,body:{assessmentVersionId:source.id as string,protocolReviewId:approved.json().id as string,disclosurePolicyVersionId:disclosure.id,pairs}};
  }
  async function draft(f:Awaited<ReturnType<typeof configured>>,pairs=f.body.pairs){const r=await req('POST',`${base}/versions`,admin,{...f.body,pairs});expect(r.statusCode,r.body).toBe(201);return r.json() as {id:string;contentHash:string;versionNumber:number};}
  const approve=(r:{id:string;contentHash:string},who=doctor,patch:object={})=>req('POST',`${clinical}/${r.id}/approve`,who,{...attest(r),reviewedJointDisclosure:true,...patch});
  const usable=(source:string,exactId?:string)=>db.$transaction(tx=>app.get(CoupleResultProtocolService).usable(tx,clinicId,source,exactId));

  it('retains exact unpublished configuration then accepts qualified complete approval with versioned provenance',async()=>{
    const f=await configured(),r=await draft(f);expect(await usable(f.source.id)).toBeNull();const before=await req('GET',`${base}/${r.id}`);expect(before.json()).toMatchObject({status:'DRAFT',usable:false,blockers:['APPROVAL_REQUIRED'],questionnaireContentHash:f.source.contentHash,disclosureContentHash:f.disclosure.contentHash,algorithmId:'APPROVED_PAIR_LOOKUP',algorithmVersion:1});
    const accepted=await approve(r);expect(accepted.statusCode,accepted.body).toBe(201);expect(accepted.json()).toMatchObject({status:'APPROVED',usable:true,blockers:[]});expect((await usable(f.source.id))?.id).toBe(r.id);const [sql]=await db.$queryRaw<{usable:boolean}[]>(Prisma.sql`SELECT couple_result_protocol_usable(${r.id}::uuid) AS usable`);expect(sql!.usable).toBe(true);
    expect(accepted.headers['cache-control']).toBe('private, no-store');for(const field of['answers','score','patientId','approvedByUserId','approvedSessionId','createdByUserId','compatibilityPercentage'])expect(accepted.body).not.toContain(`"${field}"`);
    expect((await approve(r)).json()).toEqual(accepted.json());const row=await db.coupleResultProtocolVersion.findUniqueOrThrow({where:{id:r.id}});const pairs=row.pairs as unknown as CoupleResultPair[];expect(selectCouplePair(pairs,'first','second')).toEqual(selectCouplePair(pairs,'second','first'));expect(selectCouplePair(pairs,'unknown','second')).toBeNull();
  });
  it('keeps partial drafts unpublishable and rejects reversed duplicates, unknown bands and review-dependent sources',async()=>{
    const f=await configured(),r=await draft(f,f.body.pairs.slice(0,1));expect((await approve(r)).statusCode).toBe(409);expect((await req('GET',`${base}/${r.id}`)).json().blockers).toContain('PAIR_COVERAGE_INCOMPLETE');
    for(const pairs of[[...f.body.pairs,{...f.body.pairs[1]!,firstBandId:'second',secondBandId:'first'}],[{...f.body.pairs[0]!,firstBandId:'unknown'}],[{...f.body.pairs[0]!,guidanceContentIds:[]}],[{...f.body.pairs[0]!,guidanceContentIds:[contentId,contentId.toUpperCase()]}]])expect([400,422]).toContain((await req('POST',`${base}/versions`,admin,{...f.body,pairs})).statusCode);
    const gated=await configured(true);expect((await req('POST',`${base}/versions`,admin,gated.body)).statusCode).toBe(422);
  });
  it('normalizes pair order for canonical command replay and serializes concurrent retained versions',async()=>{
    const f=await configured(),key=randomUUID();const rs=await Promise.all(Array.from({length:8},()=>req('POST',`${base}/versions`,admin,f.body,key)));expect(rs.map(r=>r.statusCode)).toEqual(Array(8).fill(201));expect(new Set(rs.map(r=>r.json().id)).size).toBe(1);
    const reversed={...f.body,pairs:[...f.body.pairs].reverse().map(p=>({...p,firstBandId:p.secondBandId,secondBandId:p.firstBandId}))};expect((await req('POST',`${base}/versions`,admin,reversed,key)).json().id).toBe(rs[0]!.json().id);expect((await req('POST',`${base}/versions`,admin,{...f.body,pairs:f.body.pairs.slice(0,1)},key)).json().code).toBe('IDEMPOTENCY_KEY_REUSED');
    const versions=await Promise.all(Array.from({length:6},()=>req('POST',`${base}/versions`,admin,f.body)));expect(versions.map(r=>r.statusCode)).toEqual(Array(6).fill(201));expect(versions.map(r=>r.json().versionNumber).sort((a,b)=>a-b)).toEqual([2,3,4,5,6,7]);
  });
  it('requires strict exact attestations and rejects forged clinical or patient inputs',async()=>{
    const f=await configured(),r=await draft(f);for(const patch of[{reviewedJointDisclosure:false},{educationalOnly:false},{noDiagnosisOrTherapeuticDiet:false},{contentHash:'a'.repeat(64)},{patientId:randomUUID()}])expect([400,409,422]).toContain((await approve(r,doctor,patch)).statusCode);
    expect((await req('POST',`${base}/versions`,admin,{...f.body,price:1})).statusCode).toBe(400);expect((await req('POST',`${base}/versions`,admin,f.body,null)).statusCode).toBe(422);expect((await req('GET',`${base}?pageSize=51`)).statusCode).toBe(400);expect((await req('POST',`${base}/versions`,doctor,f.body)).statusCode).toBe(403);expect((await approve(r,admin)).statusCode).toBe(403);expect((await app.inject({method:'GET',url:`/v1/${base}`})).statusCode).toBe(401);
    const patient=await actor('PATIENT');expect((await req('GET',base,patient)).statusCode).toBe(403);expect((await req('GET',`${clinical}/${r.id}`,patient)).statusCode).toBe(403);
  });
  it('checks current database role, clinic membership, live session and qualified doctor profile',async()=>{
    const f=await configured(),r=await draft(f);
    for(const who of[await actor('ADMIN',false),await actor('ADMIN',true,false)])expect((await req('GET',`${base}/${r.id}`,who)).statusCode).toBe(403);
    for(const who of[await actor('DOCTOR',false),await actor('DOCTOR',true,false)])expect((await approve(r,who)).statusCode).toBe(403);
    const inactive=await actor('DOCTOR');await db.doctorProfile.update({where:{userId:inactive.userId},data:{isActive:false}});expect((await approve(r,inactive)).statusCode).toBe(403);
    const revoked=await actor('DOCTOR');await db.session.update({where:{id:revoked.sessionId},data:{revokedAt:new Date(),revokedReason:'LOGOUT'}});expect([401,403]).toContain((await approve(r,revoked)).statusCode);
    try{await db.clinicalRolePermission.delete({where:{roleId_permission:{roleId,permission:'CLINICAL_RECORD_SIGN'}}});expect((await approve(r)).statusCode).toBe(403);}finally{await grant();}
    expect((await approve(r)).statusCode).toBe(201);
  });
  it('uses latest ever-approved version without falling back past revocation, while exact pins remain explicit',async()=>{
    const f=await configured(),first=await draft(f);await approve(first);await draft(f);expect((await usable(f.source.id))?.id).toBe(first.id);const last=await draft(f);await approve(last);expect((await usable(f.source.id))?.id).toBe(last.id);expect((await req('POST',`${base}/${last.id}/revoke`)).statusCode).toBe(403);
    const revoked=await req('POST',`${clinical}/${last.id}/revoke`,doctor);expect(revoked.statusCode,revoked.body).toBe(201);expect(await usable(f.source.id)).toBeNull();expect((await usable(f.source.id,first.id))?.id).toBe(first.id);expect((await approve(last)).statusCode).toBe(409);expect((await req('POST',`${clinical}/${last.id}/revoke`,doctor)).json()).toEqual(revoked.json());
  });
  it('withdraws unapproved drafts administratively without granting clinical approval',async()=>{
    const f=await configured(),r=await draft(f);expect((await req('POST',`${base}/${r.id}/revoke`)).json()).toMatchObject({status:'REVOKED',approvedAt:null,usable:false});expect((await approve(r)).statusCode).toBe(409);expect((await req('POST',`${base}/${r.id}/revoke`)).statusCode).toBe(201);
  });
  it('concurrent approval and final revocation cannot resurrect a joint protocol',async()=>{
    const f=await configured(),r=await draft(f);const rs=await Promise.all([approve(r),req('POST',`${clinical}/${r.id}/revoke`,doctor)]);expect([201,409]).toContain(rs[0]!.statusCode);expect(rs[1]!.statusCode).toBe(201);expect((await db.coupleResultProtocolVersion.findUniqueOrThrow({where:{id:r.id}})).status).toBe('REVOKED');expect(await usable(f.source.id)).toBeNull();expect((await approve(r)).statusCode).toBe(409);
  });
  it('locked exact readiness serializes final revocation for later domain transactions',async()=>{
    const f=await configured(),r=await draft(f);await approve(r);let pending:ReturnType<typeof req>|undefined;
    try{await db.$transaction(async tx=>{expect((await app.get(CoupleResultProtocolService).usable(tx,clinicId,f.source.id,r.id,true))?.id).toBe(r.id);pending=req('POST',`${clinical}/${r.id}/revoke`,doctor);void pending.then(()=>{});
      const namespace=`assessment-protocol:${f.source.id}`;let waiting=false;for(let check=0;check<40&&!waiting;check++){const [row]=await tx.$queryRaw<{waiting:boolean}[]>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted AND objid=(hashtextextended(${namespace},0)&4294967295)::oid AND classid=((hashtextextended(${namespace},0)>>32)&4294967295)::oid) AS waiting`);waiting=row!.waiting;if(!waiting)await tx.$queryRaw(Prisma.sql`SELECT pg_sleep(0.02)::text`);}expect(waiting).toBe(true);
    });}finally{if(pending){const result=await pending;expect(result.statusCode,result.body).toBe(201);}}expect(await usable(f.source.id,r.id)).toBeNull();
  });
  it('fails closed when exact joint policy rotates but permits final withdrawal',async()=>{
    const f=await configured(),r=await draft(f);await approve(r);await policy('COUPLES_RESULT_SHARING');expect(await usable(f.source.id)).toBeNull();expect((await req('GET',`${base}/${r.id}`)).json().blockers).toContain('JOINT_DISCLOSURE_UNAVAILABLE');expect((await approve(r)).statusCode).toBe(409);expect((await req('POST',`${clinical}/${r.id}/revoke`,doctor)).statusCode).toBe(201);
  });
  it('requires currently approved pinned content and rejects revoked, wrong-purpose/locale or foreign references',async()=>{
    const own=await content(),f=await configured(false,own),r=await draft(f);await approve(r);await req('POST',`clinical/guidance-content/${own}/revoke`,doctor);expect(await usable(f.source.id)).toBeNull();expect((await req('GET',`${base}/${r.id}`)).json().blockers).toContain('APPROVED_CONTENT_UNAVAILABLE');expect((await req('POST',`${base}/versions`,admin,f.body)).statusCode).toBe(422);
    for(const disclosure of[await policy(`TEST_${randomUUID()}`),await policy('COUPLES_RESULT_SHARING','en-US'),await policy('COUPLES_RESULT_SHARING','fa-IR',(await db.clinic.create({data:{name:'Synthetic foreign',status:'INACTIVE'}})).id)])expect((await req('POST',`${base}/versions`,admin,{...f.body,disclosurePolicyVersionId:disclosure.id})).statusCode).toBe(404);
  });
  it('current source/review/reviewer changes block usability without rewriting historical definition',async()=>{
    const f=await configured(),r=await draft(f);await approve(r);const stored=await db.coupleResultProtocolVersion.findUniqueOrThrow({where:{id:r.id}});
    await req('POST',`clinical/assessment-protocols/${f.source.id}/reviews/${f.review.id}/withdrawal`,doctor,{protocolHash:f.review.protocolHash,expectedReviewNumber:1,withdrawalReason:'Synthetic protocol withdrawal'});expect(await usable(f.source.id)).toBeNull();expect((await req('GET',`${base}/${r.id}`)).json().blockers).toContain('CURRENT_PROTOCOL_UNAVAILABLE');
    await db.assessmentVersion.update({where:{id:f.source.id},data:{status:'RETIRED',retiredAt:new Date()}});expect((await req('POST',`${clinical}/${r.id}/revoke`,doctor)).statusCode).toBe(201);expect((await db.coupleResultProtocolVersion.findUniqueOrThrow({where:{id:r.id}})).pairs).toEqual(stored.pairs);
    const g=await configured(),other=await draft(g);await approve(other);const reviewer=await db.doctorProfile.findUniqueOrThrow({where:{userId:doctor.userId}});try{await db.doctorProfile.update({where:{id:reviewer.id},data:{isActive:false}});expect(await usable(g.source.id)).toBeNull();expect((await req('GET',`${base}/${other.id}`)).json().blockers).toContain('PHYSICIAN_UNAVAILABLE');}finally{await db.doctorProfile.update({where:{id:reviewer.id},data:{isActive:true}});}
  });
  it('SQL retains immutable definitions, exhaustive approval and independent actor/session evidence',async()=>{
    const f=await configured(),r=await draft(f);const partial=await draft(f,f.body.pairs.slice(0,1));
    await expect(db.coupleResultProtocolVersion.update({where:{id:r.id},data:{pairs:[]}})).rejects.toThrow(/immutable/);await expect(db.coupleResultProtocolVersion.delete({where:{id:r.id}})).rejects.toThrow(/retained/);
    const profile=await db.doctorProfile.findUniqueOrThrow({where:{userId:doctor.userId}});const [time]=await db.$queryRaw<{now:Date}[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,(SELECT created_at FROM couple_result_protocol_versions WHERE id=${partial.id}::uuid)) AS now`);
    await expect(db.coupleResultProtocolVersion.update({where:{id:partial.id},data:{status:'APPROVED',approvedByUserId:doctor.userId,approvedDoctorId:profile.id,approvedSessionId:doctor.sessionId,approvedAt:time!.now}})).rejects.toThrow(/Exhaustive/);
    await expect(db.coupleResultProtocolVersion.update({where:{id:r.id},data:{status:'APPROVED',approvedByUserId:admin.userId,approvedDoctorId:profile.id,approvedSessionId:admin.sessionId,approvedAt:time!.now}})).rejects.toThrow(/physician/);
    await expect(db.coupleResultProtocolVersion.update({where:{id:r.id},data:{status:'APPROVED',approvedByUserId:doctor.userId,approvedDoctorId:profile.id,approvedSessionId:admin.sessionId,approvedAt:time!.now}})).rejects.toThrow(/session/);
    await approve(r);await req('POST',`${clinical}/${r.id}/revoke`,doctor);await expect(db.coupleResultProtocolVersion.update({where:{id:r.id},data:{status:'APPROVED',revokedAt:null,revokedByUserId:null,revokedSessionId:null}})).rejects.toThrow(/final/);
  });
  it('bounded list uses retained metadata with explicit detail readiness and no patient lookup or side effects',async()=>{
    const f=await configured(),r=await draft(f);await approve(r);const counts=await Promise.all([db.assessmentPurchase.count(),db.assessmentAccessGrant.count(),db.patientAssessmentSubmission.count(),db.coupleSession.count()]);
    const response=await req('GET',`${base}?assessmentVersionId=${f.source.id}&page=1&pageSize=1&status=APPROVED`);expect(response.statusCode).toBe(200);expect(response.json()).toMatchObject({total:1,page:1,pageSize:1,items:[{id:r.id,usable:false,blockers:['DETAIL_READINESS_REQUIRED']}]});expect((await req('GET',`${clinical}/${r.id}`,doctor)).statusCode).toBe(200);expect(await Promise.all([db.assessmentPurchase.count(),db.assessmentAccessGrant.count(),db.patientAssessmentSubmission.count(),db.coupleSession.count()])).toEqual(counts);
    expect((await req('GET',`${base}/${randomUUID()}`)).statusCode).toBe(404);const foreign=await actor('ADMIN',false);const clinic=await db.clinic.create({data:{name:'Synthetic isolated clinic',status:'INACTIVE'}});await db.clinicalClinicAccess.create({data:{clinicId:clinic.id,userId:foreign.userId}});expect((await req('GET',`${base}/${r.id}`,foreign)).statusCode).toBe(403);
  });
  it('atomic audit failure rolls back draft, approval and revocation and fails reads safely',async()=>{
    const f=await configured();if(![admin.userId,doctor.userId].every(id=>/^[a-f0-9-]{36}$/.test(id)))throw new Error('Synthetic UUID required.');
    await db.$executeRawUnsafe(`CREATE FUNCTION couple_protocol_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.subject_type='COUPLE_RESULT_PROTOCOL' AND NEW.actor_user_id IN('${admin.userId}'::uuid,'${doctor.userId}'::uuid) THEN RAISE EXCEPTION 'synthetic joint audit failure'; END IF; RETURN NEW; END $$`);
    const fail=()=>db.$executeRaw(Prisma.sql`CREATE TRIGGER couple_protocol_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION couple_protocol_test_audit_fail()`),clear=()=>db.$executeRaw(Prisma.sql`DROP TRIGGER couple_protocol_test_audit_fail ON audit_events`);
    try{await fail();expect((await req('POST',`${base}/versions`,admin,f.body)).statusCode).toBe(500);expect(await db.coupleResultProtocolVersion.count({where:{assessmentVersionId:f.source.id}})).toBe(0);await clear();const r=await draft(f);await fail();expect((await approve(r)).statusCode).toBe(500);expect((await db.coupleResultProtocolVersion.findUniqueOrThrow({where:{id:r.id}})).status).toBe('DRAFT');await clear();await approve(r);await fail();expect((await req('POST',`${clinical}/${r.id}/revoke`,doctor)).statusCode).toBe(500);expect((await db.coupleResultProtocolVersion.findUniqueOrThrow({where:{id:r.id}})).status).toBe('APPROVED');for(const path of[base,`${base}/${r.id}`]){const response=await req('GET',path);expect(response.statusCode).toBe(500);expect(response.body).not.toContain('synthetic joint audit failure');}await clear();}finally{await db.$executeRaw(Prisma.sql`DROP TRIGGER IF EXISTS couple_protocol_test_audit_fail ON audit_events`);await db.$executeRaw(Prisma.sql`DROP FUNCTION couple_protocol_test_audit_fail()`);}
  });
});
