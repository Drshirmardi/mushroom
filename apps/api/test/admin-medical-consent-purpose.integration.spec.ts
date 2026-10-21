import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { assertPatientJourneyTestDatabase, createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('admin medical purpose isolation (disposable PostgreSQL)',()=>{
  let app:NestFastifyApplication,db:PrismaService,admin:Awaited<ReturnType<typeof actor>>;
  async function actor(role:'PATIENT'|'ADMIN'='PATIENT'){
    const a=await createTestAccessToken(db,app.get(AccessTokenService),[role]);
    await db.userRole.create({data:{userId:a.userId,roleId:(await db.role.findUniqueOrThrow({where:{code:role}})).id}});return a;
  }
  beforeAll(async()=>{assertPatientJourneyTestDatabase();Logger.overrideLogger(false);app=await createApiApplication();await app.init();db=app.get(PrismaService);admin=await actor('ADMIN');},30000);
  afterAll(async()=>{await app?.close();});
  const req=(method:'GET'|'PATCH',path:string,who=admin,payload?:object,key=randomUUID())=>app.inject({method,url:`/v1/${path}`,headers:{authorization:`Bearer ${who.token}`,origin:'http://localhost:3000','idempotency-key':key,...(payload?{'content-type':'application/json'}:{})},...(payload?{payload:JSON.stringify(payload)}:{})});
  async function policy(clinicId:string,purpose='MEDICAL_INTAKE_PROCESSING',locale='fa-IR'){
    await db.consentPolicyVersion.updateMany({where:{clinicId,policyKey:purpose,locale,status:'ACTIVE'},data:{status:'RETIRED',retiredAt:new Date()}});
    const old=await db.consentPolicyVersion.findFirst({where:{clinicId,policyKey:purpose,locale},orderBy:{versionNumber:'desc'}}),body=`Synthetic consent fixture ${randomUUID()}; no real approved legal text.`;
    return db.consentPolicyVersion.create({data:{clinicId,policyKey:purpose,locale,versionNumber:(old?.versionNumber??0)+1,title:'Synthetic terms',body,contentHash:createHash('sha256').update(body).digest('hex'),status:'ACTIVE',activatedAt:new Date()}});
  }
  async function fixture(purpose='MEDICAL_INTAKE_PROCESSING',locale='fa-IR',foreign=false){
    await db.clinic.updateMany({where:{status:'ACTIVE'},data:{status:'INACTIVE'}});
    const clinic=await db.clinic.create({data:{name:'Synthetic purpose clinic',timeZone:'Asia/Tehran',status:'ACTIVE'}}),p=await actor();
    await db.userProfile.create({data:{userId:p.userId,firstName:'Synthetic',lastName:'Patient'}});
    const patient=await db.patientProfile.create({data:{userId:p.userId,clinicId:clinic.id}}),other=foreign?await db.clinic.create({data:{name:'Synthetic foreign clinic',timeZone:'Asia/Tehran',status:'INACTIVE'}}):clinic;
    const legal=await policy(other.id,purpose,locale),consent=await db.patientConsentRecord.create({data:{patientId:patient.id,policyVersionId:legal.id,contentHash:legal.contentHash,acceptedByUserId:p.userId,acceptedBySessionId:p.sessionId,acceptanceIdempotencyKey:randomUUID()}}),intake=await db.patientMedicalIntake.create({data:{patientId:patient.id,clinicId:clinic.id,submissionState:'COMPLETE',currentRevisionNumber:1,completedRevisionNumber:1}});
    const revision=await db.patientMedicalIntakeRevision.create({data:{intakeId:intake.id,revisionNumber:1,assignedSchemaVersion:1,revisionState:'COMPLETE',birthDate:new Date('1991-01-02Z'),sexAtBirth:'FEMALE',allergyReport:{status:'NONE',items:[]},chronicConditionReport:{status:'UNKNOWN',items:[]},currentMedicationReport:{status:'NONE',items:[]},completedAt:new Date(),completedConsentRecordId:consent.id,reportedPatientId:patient.id,recordedByUserId:p.userId,recordingMode:'PATIENT_ENTRY',mutationOperation:'COMPLETE',mutationKey:randomUUID(),payloadHash:'a'.repeat(64)}});
    return {clinic,p,patient,legal,consent,intake,revision};
  }
  const detail=(f:Awaited<ReturnType<typeof fixture>>)=>`admin/patients/${f.patient.id}`;
  async function completeState(f:Awaited<ReturnType<typeof fixture>>,complete:boolean){
    const phone=(await db.user.findUniqueOrThrow({where:{id:f.p.userId}})).phone;
    const list=await req('GET',`admin/patients?query=${encodeURIComponent(phone)}`);expect(list.statusCode,list.body).toBe(200);expect(list.json().items.find((i:{patientId:string})=>i.patientId===f.patient.id).onboardingState).toBe(complete?'COMPLETE':'IN_PROGRESS');
    const report=await req('GET',`admin/reporting/patients?clinicId=${f.clinic.id}`);expect(report.statusCode,report.body).toBe(200);expect(report.json()).toMatchObject({onboardingComplete:complete?1:0,onboardingIncomplete:complete?0:1});
  }
  const correction={expectedRevision:1,correctionReason:'Synthetic correction only',tobaccoUse:'NEVER'};
  it.each([
    ['PROGRAM_PURCHASE_TERMS','fa-IR',false],['ASSESSMENT_PROCESSING','fa-IR',false],['COUPLES_RESULT_SHARING','fa-IR',false],['CUSTOM_PROGRAM_CARE','fa-IR',false],['MEDICAL_INTAKE_PROCESSING','en-US',false],['MEDICAL_INTAKE_PROCESSING','fa-IR',true],
  ])('%s/%s foreign=%s never authorizes medical access or completion',async(purpose,locale,foreign)=>{
    const f=await fixture(purpose,locale,foreign),r=await req('GET',detail(f));expect(r.statusCode,r.body).toBe(200);expect(r.json()).toMatchObject({consent:{active:false},intake:{status:'CONSENT_REQUIRED',value:null}});expect(r.body).not.toContain('1991-01-02');
    const write=await req('PATCH',`${detail(f)}/medical-intake`,admin,correction);expect(write.statusCode,write.body).toBe(403);expect(write.json().code).toBe('CONSENT_REQUIRED');expect(await db.patientMedicalIntakeRevision.count({where:{intakeId:f.intake.id}})).toBe(1);await completeState(f,false);
  });
  it('current exact medical consent works even when unrelated active policy was inserted first',async()=>{
    const f=await fixture('PROGRAM_PURCHASE_TERMS'),medical=await policy(f.clinic.id),consent=await db.patientConsentRecord.create({data:{patientId:f.patient.id,policyVersionId:medical.id,contentHash:medical.contentHash,acceptedByUserId:f.p.userId,acceptedBySessionId:f.p.sessionId,acceptanceIdempotencyKey:randomUUID()}});
    await db.patientMedicalIntakeRevision.update({where:{id:f.revision.id},data:{completedConsentRecordId:consent.id}});
    const r=await req('GET',detail(f));expect(r.statusCode,r.body).toBe(200);expect(r.json()).toMatchObject({consent:{active:true,policyVersionId:medical.id},intake:{status:'AVAILABLE',value:{birthDate:'1991-01-02'}}});await completeState(f,true);
    expect((await req('GET',detail(f),f.p)).statusCode).toBe(403);expect((await app.inject({method:'GET',url:`/v1/${detail(f)}`})).statusCode).toBe(401);
  });
  it('withdrawn medical acceptance cannot fall back to a live purchase acceptance',async()=>{
    const f=await fixture(),other=await policy(f.clinic.id,'PROGRAM_PURCHASE_TERMS');await db.patientConsentRecord.create({data:{patientId:f.patient.id,policyVersionId:other.id,contentHash:other.contentHash,acceptedByUserId:f.p.userId,acceptedBySessionId:f.p.sessionId,acceptanceIdempotencyKey:randomUUID()}});await db.patientConsentRecord.update({where:{id:f.consent.id},data:{withdrawnAt:new Date(),withdrawnByUserId:f.p.userId,withdrawnBySessionId:f.p.sessionId,withdrawalIdempotencyKey:randomUUID(),withdrawalRequestId:randomUUID()}});
    expect((await req('GET',detail(f))).json().intake.value).toBeNull();expect((await req('PATCH',`${detail(f)}/medical-intake`,admin,correction)).statusCode).toBe(403);await completeState(f,false);
  });
  it('replacement acceptance permits current processing but cannot retroactively complete an old revision',async()=>{
    const f=await fixture(),medical=await policy(f.clinic.id);await db.patientConsentRecord.create({data:{patientId:f.patient.id,policyVersionId:medical.id,contentHash:medical.contentHash,acceptedByUserId:f.p.userId,acceptedBySessionId:f.p.sessionId,acceptanceIdempotencyKey:randomUUID()}});expect((await req('GET',detail(f))).json()).toMatchObject({consent:{active:true},intake:{status:'AVAILABLE'}});await completeState(f,false);
  });
  it('mismatched acceptance hash cannot authorize medical read/write or completion',async()=>{
    const f=await fixture();await db.patientConsentRecord.update({where:{id:f.consent.id},data:{contentHash:'b'.repeat(64)}});expect((await req('GET',detail(f))).json().intake.value).toBeNull();expect((await req('PATCH',`${detail(f)}/medical-intake`,admin,correction)).statusCode).toBe(403);await completeState(f,false);
  });
  it('canonical correction retries preserve one revision and require still-current consent',async()=>{
    const f=await fixture(),key=randomUUID(),path=`${detail(f)}/medical-intake`,first=await req('PATCH',path,admin,correction,key);expect(first.statusCode,first.body).toBe(200);const replay=await req('PATCH',path,admin,correction,key);expect(replay.statusCode,replay.body).toBe(200);expect(replay.json()).toEqual(first.json());expect(await db.patientMedicalIntakeRevision.count({where:{intakeId:f.intake.id}})).toBe(2);expect((await req('PATCH',path,admin,{...correction,tobaccoUse:'CURRENT'},key)).statusCode).toBe(409);await db.patientConsentRecord.update({where:{id:f.consent.id},data:{withdrawnAt:new Date(),withdrawnByUserId:f.p.userId,withdrawnBySessionId:f.p.sessionId,withdrawalIdempotencyKey:randomUUID(),withdrawalRequestId:randomUUID()}});expect((await req('PATCH',path,admin,correction,key)).statusCode).toBe(403);
  });
  it('onboarding summary counts only medical completion across clinics and independent consent purposes',async()=>{
    const before=await req('GET','admin/patients/onboarding-summary');expect(before.statusCode,before.body).toBe(200);const old=before.json();await fixture('PROGRAM_PURCHASE_TERMS');await fixture();const after=await req('GET','admin/patients/onboarding-summary');expect(after.statusCode,after.body).toBe(200);expect(after.json()).toMatchObject({onboardingCompletePatients:old.onboardingCompletePatients+1,onboardingIncompletePatients:old.onboardingIncompletePatients+1});
  });
  it.each(['READ','CORRECT'])('committed withdrawal during observed %s consent-lock wait withholds medical data',async mode=>{
    const f=await fixture();let ready!:()=>void,release!:()=>void,pid=0;const locked=new Promise<void>(r=>{ready=r;}),gate=new Promise<void>(r=>{release=r;});
    const holding=db.$transaction(async tx=>{pid=(await tx.$queryRaw<{id:number}[]>(Prisma.sql`SELECT pg_backend_pid() AS id`))[0]!.id;await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${f.consent.id}::uuid FOR UPDATE`);ready();await gate;await tx.patientConsentRecord.update({where:{id:f.consent.id},data:{withdrawnAt:new Date(),withdrawnByUserId:f.p.userId,withdrawnBySessionId:f.p.sessionId,withdrawalIdempotencyKey:randomUUID(),withdrawalRequestId:randomUUID()}});},{timeout:15000});await locked;
    const pending=mode==='READ'?req('GET',detail(f)):req('PATCH',`${detail(f)}/medical-intake`,admin,correction);
    try{let blocked=false;for(let n=0;n<60&&!blocked;n++){blocked=!!(await db.$queryRaw<{n:number}[]>(Prisma.sql`SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted AND ${pid}=ANY(pg_blocking_pids(pid))`))[0]?.n;if(!blocked)await new Promise(r=>setTimeout(r,20));}expect(blocked).toBe(true);}finally{release();await holding;}
    const r=await pending;expect(r.statusCode,r.body).toBe(mode==='READ'?200:403);if(mode==='READ')expect(r.json().intake.value).toBeNull();expect(r.body).not.toContain('1991-01-02');expect(await db.patientMedicalIntakeRevision.count({where:{intakeId:f.intake.id}})).toBe(1);
  },15000);
  it.each(['READ','CORRECT'])('retired policy committed during observed %s policy-lock wait cannot authorize a snapshot',async mode=>{
    const f=await fixture();let ready!:()=>void,release!:()=>void,pid=0;const locked=new Promise<void>(r=>{ready=r;}),gate=new Promise<void>(r=>{release=r;});
    const holding=db.$transaction(async tx=>{pid=(await tx.$queryRaw<{id:number}[]>(Prisma.sql`SELECT pg_backend_pid() AS id`))[0]!.id;await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${f.legal.id}::uuid FOR UPDATE`);ready();await gate;await tx.consentPolicyVersion.update({where:{id:f.legal.id},data:{status:'RETIRED',retiredAt:new Date()}});},{timeout:15000});await locked;
    const pending=mode==='READ'?req('GET',detail(f)):req('PATCH',`${detail(f)}/medical-intake`,admin,correction);
    try{let blocked=false;for(let n=0;n<60&&!blocked;n++){blocked=!!(await db.$queryRaw<{n:number}[]>(Prisma.sql`SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted AND ${pid}=ANY(pg_blocking_pids(pid))`))[0]?.n;if(!blocked)await new Promise(r=>setTimeout(r,20));}expect(blocked).toBe(true);}finally{release();await holding;}
    const r=await pending;expect(r.statusCode,r.body).toBe(mode==='READ'?200:403);if(mode==='READ')expect(r.json().intake.value).toBeNull();expect(r.body).not.toContain('1991-01-02');expect(await db.patientMedicalIntakeRevision.count({where:{intakeId:f.intake.id}})).toBe(1);
  },15000);
  it('concurrent identical corrections retain one canonical revision without a duplicate write',async()=>{
    const f=await fixture(),key=randomUUID(),path=`${detail(f)}/medical-intake`,rows=await Promise.all(Array.from({length:4},()=>req('PATCH',path,admin,correction,key)));expect(rows.map(r=>r.statusCode)).toEqual([200,200,200,200]);expect(rows.map(r=>r.json().revisionNumber)).toEqual([2,2,2,2]);expect(await db.patientMedicalIntakeRevision.count({where:{intakeId:f.intake.id}})).toBe(2);expect((await req('PATCH',path,admin,correction)).statusCode).toBe(409);
  });
  it('audit failure withholds medical reads and rolls back corrected revision and parent',async()=>{
    const f=await fixture();await db.$executeRawUnsafe("CREATE FUNCTION medical_purpose_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action IN('ADMIN_PATIENT_MEDICAL_INTAKE_READ','ADMIN_PATIENT_MEDICAL_INTAKE_CORRECTED') THEN RAISE EXCEPTION 'Synthetic medical purpose audit unavailable'; END IF; RETURN NEW; END $$");await db.$executeRawUnsafe('CREATE TRIGGER medical_purpose_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION medical_purpose_test_audit_fail()');
    try{const read=await req('GET',detail(f));expect(read.statusCode,read.body).toBeGreaterThanOrEqual(500);expect(read.body).not.toContain('1991-01-02');const write=await req('PATCH',`${detail(f)}/medical-intake`,admin,correction);expect(write.statusCode,write.body).toBeGreaterThanOrEqual(500);expect(await db.patientMedicalIntakeRevision.count({where:{intakeId:f.intake.id}})).toBe(1);expect((await db.patientMedicalIntake.findUniqueOrThrow({where:{id:f.intake.id}})).currentRevisionNumber).toBe(1);}finally{await db.$executeRawUnsafe('DROP TRIGGER medical_purpose_test_audit_fail ON audit_events');await db.$executeRawUnsafe('DROP FUNCTION medical_purpose_test_audit_fail()');}
  });
});
