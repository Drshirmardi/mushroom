import { createCompleteTestPatient } from './patient-entry-test-support';
import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { AssessmentProtocolService } from '../src/modules/assessments/protocol/assessment-protocol.service';
import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { TIEBREAK_ALGORITHM, type TieBreakDraft } from '../src/modules/assessments/domain/assessment-tiebreak-draft';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('exact assessment protocol review (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication, db: PrismaService, clinicId: string, roleId: string;
  let originalGrant = true;
  let admin: Awaited<ReturnType<typeof actor>>, doctor: Awaited<ReturnType<typeof actor>>;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? ''); if (!['127.0.0.1','localhost'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test:55419 required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService); clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    roleId = (await db.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } })).id; originalGrant = !!await db.clinicalRolePermission.findUnique({ where: { roleId_permission: { roleId, permission: 'CLINICAL_RECORD_SIGN' } } }); await grant();
    admin = await actor('ADMIN'); doctor = await actor('DOCTOR'); await retire();
  }, 30_000);
  afterAll(async () => { if (db && !originalGrant) await db.clinicalRolePermission.deleteMany({ where: { roleId, permission: 'CLINICAL_RECORD_SIGN' } }); await app?.close(); });
  async function grant() { await db.clinicalRolePermission.upsert({ where: { roleId_permission: { roleId, permission: 'CLINICAL_RECORD_SIGN' } }, create: { roleId, permission: 'CLINICAL_RECORD_SIGN' }, update: {} }); }
  async function actor(role: 'ADMIN'|'DOCTOR'|'PATIENT', membership = true, liveRole = true, profile = true) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]); if (liveRole) await db.userRole.create({ data: { userId: auth.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } });
    if (membership && role !== 'PATIENT') await db.clinicalClinicAccess.create({ data: { userId: auth.userId, clinicId } });
    if (role === 'DOCTOR' && profile) { const key = randomUUID(); const s = await db.specialty.create({ data: { clinicId, name: key, canonicalName: key, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }); const d = await db.doctorProfile.create({ data: { clinicId, userId: auth.userId, displayName: 'Synthetic protocol reviewer' } }); await db.doctorSpecialty.create({ data: { clinicId, doctorId: d.id, specialtyId: s.id } }); await db.doctorProfile.update({ where: { id: d.id }, data: { isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }); }
    return auth;
  }
  const req = (method:'GET'|'POST'|'PUT'|'PATCH', path:string, who = doctor, payload?:object, key:string|null = randomUUID()) => app.inject({ method, url:`/v1/${path}`, headers:{ authorization:`Bearer ${who.token}`, origin:'http://localhost:3000', ...(key ? {'idempotency-key':key}:{}), ...(payload ? {'content-type':'application/json'}:{}) }, ...(payload ? {payload:JSON.stringify(payload)}:{}) });
  const structure = { schemaVersion:1, sections:[{id:'one',questions:[{id:'q',type:'BOOLEAN',required:true,trueScore:1,falseScore:0}]}], resultBands:[{id:'one',title:'Synthetic',minInclusive:0,maxExclusive:2,riskLevel:'NONE',requiresReview:false}] };
  async function source(publish = true) { const created = await req('POST','admin/assessments',admin,{ assessmentKey:`TEST_${randomUUID()}`,locale:'fa-IR',title:'Synthetic protocol questionnaire',structure }); expect(created.statusCode).toBe(201); if (!publish) return created.json() as {id:string;assessmentKey:string;contentHash:string}; const r = await req('POST',`admin/assessments/${created.json().id}/publish`,admin); expect(r.statusCode).toBe(201); return r.json() as {id:string;assessmentKey:string;contentHash:string}; }
  async function retire(locale='fa-IR') { await db.consentPolicyVersion.updateMany({ where:{clinicId,policyKey:'ASSESSMENT_PROCESSING',locale,status:'ACTIVE'},data:{status:'RETIRED',retiredAt:new Date()} }); }
  async function policy(locale='fa-IR', scope=clinicId, purpose='ASSESSMENT_PROCESSING') {
    if(scope===clinicId && purpose==='ASSESSMENT_PROCESSING') await retire(locale);
    const previous = await db.consentPolicyVersion.findFirst({where:{clinicId:scope,policyKey:purpose,locale},orderBy:{versionNumber:'desc'}});
    const body='Synthetic assessment-processing fixture only. Not approved legal text.';
    return db.consentPolicyVersion.create({data:{clinicId:scope,policyKey:purpose,locale,versionNumber:(previous?.versionNumber??0)+1,title:'Synthetic protocol consent',body,contentHash:createHash('sha256').update(body).digest('hex'),status:'ACTIVE',activatedAt:new Date()}});
  }
  const preview = (id:string, who=doctor, policyId?:string) => req('GET',`clinical/assessment-protocols/${id}${policyId ? '?consentPolicyVersionId='+policyId:''}`,who);
  async function prepared() { const v=await source(); const p=await policy(); const r=await preview(v.id,doctor,p.id); expect(r.statusCode).toBe(200); return {v,p,body:{consentPolicyVersionId:p.id,protocolHash:r.json().protocolHash as string,expectedReviewNumber:r.json().currentReviewNumber as number,reviewedQuestionnaireAndScoring:true,educationalOnly:true,noDiagnosisOrTherapeuticDiet:true}}; }
  const approve = (f:Awaited<ReturnType<typeof prepared>>, who=doctor, key:string|null=randomUUID(), patch={}) => req('POST',`clinical/assessment-protocols/${f.v.id}/reviews`,who,{...f.body,...patch},key);
  const withdrawal = (id:string, review:{id:string;protocolHash:string;reviewNumber:number}, who=doctor, key=randomUUID()) => req('POST',`clinical/assessment-protocols/${id}/reviews/${review.id}/withdrawal`,who,{protocolHash:review.protocolHash,expectedReviewNumber:review.reviewNumber,withdrawalReason:'Synthetic safety withdrawal'},key);
  const usable = (id:string) => db.$transaction(tx=>app.get(AssessmentProtocolService).usableApproval(tx,clinicId,id));

  it('lets ADMIN publish complete11+1 without physician review or processing policy and preserves patient progression', async () => {
    const base = structuredClone(MIZAJ_DRAFT_PRESET.structure);
    for (const section of base.sections) for (const question of section.questions) question.options.forEach((option, index) => { option.scores = { [base.scoring.dimensions[index]!.id]: 1 }; });
    const definition: TieBreakDraft = { ...base, schemaVersion: 3, scoring: { ...base.scoring, ...TIEBREAK_ALGORITHM, minInformativeAnswers: 1 }, followUps: [] };
    for (let first = 0; first < 4; first++) for (let second = first + 1; second < 4; second++) {
      const tiedDimensions = [first, second].map(index => base.scoring.dimensions[index]!.id);
      definition.followUps.push({ id: `clarify${first}${second}`, title: 'Synthetic test distinction', tiedDimensions, options: tiedDimensions.map((dimensionId, index) => ({ id: `choice${index}`, title: `Synthetic choice ${index}`, dimensionId })) });
    }
    await retire();
    const created = await req('POST', 'admin/assessments', admin, { assessmentKey: `TEST_${randomUUID()}`, locale: 'fa-IR', title: 'Synthetic adaptive fixture', structure: { ...definition, followUps: [] } });
    expect(created.statusCode).toBe(201); const v = created.json();
    expect((await req('POST', `admin/assessments/${v.id}/publish`, admin)).json().code).toBe('ASSESSMENT_STRUCTURE_INVALID');
    expect((await req('PATCH', `admin/assessments/${v.id}`, admin, { structure: definition })).statusCode).toBe(200);
    expect((await req('POST', `admin/assessments/${v.id}/publish`, doctor)).statusCode).toBe(403);
    const published = await req('POST', `admin/assessments/${v.id}/publish`, admin);
    expect(published.statusCode).toBe(201); expect(published.json().publishedByUserId).toBe(admin.userId);
    expect(await db.assessmentProtocolReview.count({ where: { assessmentVersionId: v.id } })).toBe(0);
    const patient = await actor('PATIENT'); await createCompleteTestPatient(db, { data: { userId: patient.userId, clinicId } });
    const started = await req('POST', `assessments/${v.id}/submissions`, patient); expect(started.statusCode).toBe(201); const attempt = started.json();
    const choices = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3];
    const answers = Object.fromEntries(definition.sections.flatMap(s => s.questions).map((q, index) => [q.id, q.options[choices[index]!]!.id]));
    const premature = await req('PUT', `assessment-submissions/${attempt.id}`, patient, { answers: { clarify01: 'choice0' }, expectedRevision: attempt.revision }); expect(premature.statusCode).toBe(422);
    const saved = await req('PUT', `assessment-submissions/${attempt.id}`, patient, { answers, expectedRevision: attempt.revision }); expect(saved.statusCode).toBe(200);
    const questionnaire = (await req('GET', `assessment-submissions/${attempt.id}/questionnaire`, patient)).json();
    expect(questionnaire.structure).not.toHaveProperty('scoring'); expect(questionnaire.structure).not.toHaveProperty('resultProfiles');
    const projected = questionnaire.structure.sections.flatMap((s: { questions: { id: string }[] }) => s.questions);
    expect(projected).toHaveLength(12); expect(projected[11].id).toBe('clarify01');
    expect((await req('POST', `assessment-submissions/${attempt.id}/submit`, patient, { expectedRevision: saved.json().revision })).json().code).toBe('ASSESSMENT_FOLLOW_UP_REQUIRED');
    const finalSave = await req('PUT', `assessment-submissions/${attempt.id}`, patient, { answers: { ...answers, clarify01: 'choice0' }, expectedRevision: saved.json().revision }); expect(finalSave.statusCode).toBe(200);
    const key = randomUUID(), body = { expectedRevision: finalSave.json().revision };
    const completed = await req('POST', `assessment-submissions/${attempt.id}/submit`, patient, body, key); expect(completed.statusCode).toBe(201);
    expect(completed.json()).toMatchObject({ state: 'COMPLETE', score: null, resultSnapshot: { algorithmId: 'DIMENSION_TIEBREAK', primary: definition.scoring.dimensions[0]!.id, secondary: definition.scoring.dimensions[1]!.id, followUpUsed: true, reviewState: 'ADMIN_PUBLISHED' } });
    expect((await req('POST', `assessment-submissions/${attempt.id}/submit`, patient, body, key)).json()).toEqual(completed.json());
    const pending = await req('POST', `assessments/${v.id}/submissions`, patient); expect(pending.statusCode).toBe(201);
    expect((await req('POST', `admin/assessments/${v.id}/archive`, admin)).statusCode).toBe(201);
    expect((await req('GET', `assessment-submissions/${pending.json().id}/questionnaire`, patient)).json().resumeAvailable).toBe(true);
    expect((await req('PUT', `assessment-submissions/${pending.json().id}`, patient, { answers, expectedRevision: pending.json().revision })).statusCode).toBe(200);
    expect(completed.json().resultSnapshot).not.toHaveProperty('protocolReviewId');
    expect(completed.json().resultSnapshot).not.toHaveProperty('publishedByUserId');
    expect((await req('GET', `assessment-submissions/${attempt.id}/result`, patient)).statusCode).toBe(200);
  });

  it('persists version-two secondary elimination, resume and idempotent completion without changing primary or main scores', async () => {
    const base = structuredClone(MIZAJ_DRAFT_PRESET.structure);
    const ids = base.scoring.dimensions.map(item => item.id);
    const questions = base.sections.flatMap(section => section.questions);
    for (const question of questions) question.options.forEach((option, index) => { option.scores = { [ids[index]!]: 1 }; });
    questions[10]!.options[0]!.scores = {};
    const definition: TieBreakDraft = { ...base, schemaVersion: 3, scoring: { ...base.scoring, algorithmId: 'DIMENSION_TIEBREAK', algorithmVersion: 2, minInformativeAnswers: 1 }, followUps: [] };
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) definition.followUps.push({ id: `pair${a}${b}`, title: 'Synthetic pair', tiedDimensions: [ids[a]!, ids[b]!], options: [a,b].map(index => ({ id: `pick${index}`, title: 'Synthetic', dimensionId: ids[index]! })) });
    definition.followUps.push({ id: 'firstTie', title: 'Synthetic first', tiedDimensions: ids.slice(1), options: [{ id: 'yes', title: 'Direct', dimensionId: ids[1]! }, { id: 'no', title: 'Continue', dimensionId: null }], steps: [{ id: 'lastTie', title: 'Synthetic second', tiedDimensions: ids.slice(2), options: [{ id: 'left', title: 'Left', dimensionId: ids[2]! }, { id: 'right', title: 'Right', dimensionId: ids[3]! }] }] });
    const created = await req('POST', 'admin/assessments', admin, { assessmentKey: `TEST_${randomUUID()}`, locale: 'fa-IR', title: 'Synthetic sequential fixture', structure: definition });
    expect(created.statusCode).toBe(201); const sourceId = created.json().id as string;
    expect((await req('POST', `admin/assessments/${sourceId}/publish`, admin)).statusCode).toBe(201);
    const patient = await actor('PATIENT'); await createCompleteTestPatient(db, { data: { userId: patient.userId, clinicId } });
    const indices = [0,0,0,0,1,1,2,2,3,3,0];
    const main = Object.fromEntries(questions.map((question, index) => [question.id, question.options[indices[index]!]!.id]));
    for (const direct of [true, false]) {
      const start = await req('POST', `assessments/${sourceId}/submissions`, patient); expect(start.statusCode).toBe(201); const attempt = start.json();
      const path = `assessment-submissions/${attempt.id}`;
      const save = (answers: object, revision: number) => req('PUT', path, patient, { answers, expectedRevision: revision });
      const saved = await save(main, attempt.revision); expect(saved.statusCode).toBe(200);
      expect((await req('POST', `${path}/submit`, patient, { expectedRevision: saved.json().revision })).json().code).toBe('ASSESSMENT_FOLLOW_UP_REQUIRED');
      const offPath = await save({ ...main, lastTie: 'right' }, saved.json().revision); expect(offPath.statusCode).toBe(422);
      let final = await save({ ...main, firstTie: direct ? 'yes' : 'no' }, saved.json().revision); expect(final.statusCode).toBe(200);
      if (!direct) {
        expect((await req('GET', path, patient)).json().answers.firstTie).toBe('no');
        const projected = (await req('GET', `${path}/questionnaire`, patient)).json().structure;
        expect(projected).not.toHaveProperty('scoring'); expect(projected).not.toHaveProperty('followUps');
        const visible = projected.sections.flatMap((section: { questions: { id: string; options: object[] }[] }) => section.questions);
        expect(visible.map((q: { id: string }) => q.id).slice(-2)).toEqual(['firstTie', 'lastTie']);
        expect(visible.at(-1).options[0]).not.toHaveProperty('dimensionId');
        expect((await req('POST', `${path}/submit`, patient, { expectedRevision: final.json().revision })).json().code).toBe('ASSESSMENT_FOLLOW_UP_REQUIRED');
        final = await save({ ...main, firstTie: 'no', lastTie: 'right' }, final.json().revision); expect(final.statusCode).toBe(200);
      }
      const key = randomUUID(), body = { expectedRevision: final.json().revision };
      const complete = await req('POST', `${path}/submit`, patient, body, key); expect(complete.statusCode).toBe(201);
      const snapshot = complete.json().resultSnapshot;
      expect(snapshot).toMatchObject({ algorithmVersion: 2, status: 'PAIR', primary: ids[0], secondary: direct ? ids[1] : ids[3], scores: { [ids[0]!]: 4, [ids[1]!]: 2, [ids[2]!]: 2, [ids[3]!]: 2 } });
      expect((await req('POST', `${path}/submit`, patient, body, key)).json()).toEqual(complete.json());
      const persisted = await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: attempt.id } });
      expect(persisted.state).toBe('COMPLETE'); expect(persisted.resultSnapshot).toEqual(snapshot);
      expect((await req('GET', `${path}/result`, patient)).json().resultSnapshot).toEqual(snapshot);
    }
  });

  it('exposes exact source with explicit missing consent/review blockers and no fabricated policy',async()=>{
    const v=await source(); const r=await preview(v.id); expect(r.statusCode).toBe(200); expect(r.json()).toMatchObject({consentPolicy:null,protocolHash:null,currentReviewNumber:0,approvalUsable:false,educationalOnly:true}); expect(r.json().blockers).toContain('ASSESSMENT_PROCESSING_CONSENT_MISSING'); expect(await usable(v.id)).toBeNull();
  });
  it('reuses real authoring hashes and records exact educational questionnaire/scoring/consent review',async()=>{
    const f=await prepared(); const r=await approve(f); expect(r.statusCode).toBe(201); expect(r.json()).toMatchObject({decision:'APPROVED',reviewNumber:1,questionnaireContentHash:f.v.contentHash,consentPolicyVersionId:f.p.id,consentContentHash:f.p.contentHash,protocolHash:f.body.protocolHash,algorithmId:'WEIGHTED_SUM',algorithmVersion:1});
    const p=await preview(f.v.id); expect(p.json()).toMatchObject({approvalUsable:true,currentReviewNumber:1,blockers:[],questionnaire:{structure},consentPolicy:{body:f.p.body}}); expect((await usable(f.v.id))?.id).toBe(r.json().id);
    for(const field of ['actorUserId','actorSessionId','doctorProfileId','idempotencyKey','payloadHash']) expect(r.json()).not.toHaveProperty(field); expect(r.headers['cache-control']).toBe('private, no-store');
    expect(await db.assessmentOfferingVersion.count({where:{assessmentVersionId:f.v.id,status:'PUBLISHED'}})).toBe(0);
  });
  it('canonical command retries append once while changed payload reuse conflicts',async()=>{
    const f=await prepared(); const key=randomUUID(); const rs=await Promise.all(Array.from({length:8},(_,i)=>req('POST',`clinical/assessment-protocols/${f.v.id}/reviews`,doctor,i%2 ? f.body:Object.fromEntries(Object.entries(f.body).reverse()),key)));
    expect(rs.map(r=>r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(rs.map(r=>r.json().id)).size).toBe(1); expect(await db.assessmentProtocolReview.count({where:{assessmentVersionId:f.v.id}})).toBe(1);
    const changed=await approve(f,doctor,key,{expectedReviewNumber:1}); expect(changed.statusCode).toBe(409); expect(changed.json().code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
  it('concurrent distinct stale approvals append once and require an explicit refreshed revision',async()=>{
    const f=await prepared(); const rs=await Promise.all(Array.from({length:8},()=>approve(f))); expect(rs.filter(r=>r.statusCode===201)).toHaveLength(1); expect(rs.filter(r=>r.statusCode===409)).toHaveLength(7);
    expect((await approve(f,doctor,randomUUID(),{expectedReviewNumber:1})).json()).toMatchObject({decision:'APPROVED',reviewNumber:2});
  });
  it('binds protocol hash and all explicit attestations; rejects unknown or malformed fields',async()=>{
    const f=await prepared(); expect((await approve(f,doctor,randomUUID(),{protocolHash:'f'.repeat(64)})).statusCode).toBe(409);
    for(const patch of [{reviewedQuestionnaireAndScoring:false},{educationalOnly:false},{noDiagnosisOrTherapeuticDiet:false},{expectedReviewNumber:-1},{expectedReviewNumber:0.5},{algorithmId:'INVENTED'},{actorUserId:admin.userId}]) expect((await approve(f,doctor,randomUUID(),patch)).statusCode).toBe(400);
    expect((await approve(f,doctor,null)).statusCode).toBe(422);
  });
  it('enforces physician profile, live role, scope, clinical-sign and ordinary ADMIN denial on commands and reads',async()=>{
    const f=await prepared(); const row=(await approve(f)).json();
    for(const who of [admin,await actor('PATIENT'),await actor('DOCTOR',false),await actor('DOCTOR',true,false),await actor('DOCTOR',true,true,false)]) {
      for(const [method,path,payload] of [['GET','clinical/assessment-protocols',undefined],['GET',`clinical/assessment-protocols/${f.v.id}`,undefined],['GET',`clinical/assessment-protocols/${f.v.id}/reviews`,undefined],['POST',`clinical/assessment-protocols/${f.v.id}/reviews`,f.body],['POST',`clinical/assessment-protocols/${f.v.id}/reviews/${row.id}/withdrawal`,{protocolHash:row.protocolHash,expectedReviewNumber:1,withdrawalReason:'Synthetic'}]] as const) expect((await req(method,path,who,payload)).statusCode).toBe(403);
    }
    const inactive=await actor('DOCTOR'); await db.doctorProfile.update({where:{userId:inactive.userId},data:{isActive:false}}); expect((await approve(f,inactive)).statusCode).toBe(403);
    await db.clinicalRolePermission.delete({where:{roleId_permission:{roleId,permission:'CLINICAL_RECORD_SIGN'}}}); try{expect((await approve(f)).statusCode).toBe(403);expect(await usable(f.v.id)).toBeNull();}finally{await grant();}
    expect((await app.inject({method:'GET',url:'/v1/clinical/assessment-protocols'})).statusCode).toBe(401);
  });
  it('permits scoped admin preview/history but no unsigned medical approval endpoint',async()=>{
    const f=await prepared(); await approve(f);
    for(const suffix of ['', '/reviews']) expect((await req('GET',`admin/assessment-protocols/${f.v.id}${suffix}`,admin)).statusCode).toBe(200);
    expect((await req('POST',`admin/assessment-protocols/${f.v.id}/reviews`,admin,f.body)).statusCode).toBe(404);
    for(const who of [doctor,await actor('PATIENT'),await actor('ADMIN',false),await actor('ADMIN',true,false)]) expect((await req('GET',`admin/assessment-protocols/${f.v.id}`,who)).statusCode).toBe(403);
  });
  it('conceals draft/foreign clinic sources and wrong consent purpose/locale/scope',async()=>{
    const f=await prepared(); const draft=await source(false); expect((await preview(draft.id)).statusCode).toBe(404);
    const other=await db.clinic.create({data:{name:'Synthetic foreign protocol',status:'INACTIVE'}}); const foreign=await db.assessmentVersion.create({data:{clinicId:other.id,assessmentKey:'TEST',locale:'fa-IR',versionNumber:1,title:'Synthetic',structure,contentHash:'a'.repeat(64),status:'PUBLISHED',publishedAt:new Date()}});
    expect((await preview(foreign.id)).statusCode).toBe(404);
    const wrongPurpose=await policy('fa-IR',clinicId,`TEST_PROTOCOL_OTHER_${randomUUID()}`), wrongLocale=await policy('en-US'), wrongClinic=await policy('fa-IR',other.id);
    for(const p of [wrongPurpose,wrongLocale,wrongClinic]) { expect((await preview(f.v.id,doctor,p.id)).statusCode).toBe(404); expect((await approve(f,doctor,randomUUID(),{consentPolicyVersionId:p.id})).statusCode).toBe(404); }
  });
  it('requires exact actual questionnaire hash/structure without rewriting legacy source',async()=>{
    const p=await policy(); const v=await db.assessmentVersion.create({data:{clinicId,assessmentKey:`BAD_${randomUUID()}`,locale:'fa-IR',versionNumber:1,title:'Synthetic invalid hash',structure,contentHash:'a'.repeat(64),status:'PUBLISHED',publishedAt:new Date()}});
    const r=await preview(v.id,doctor,p.id); expect(r.json().blockers).toContain('QUESTIONNAIRE_HASH_OR_STRUCTURE_INVALID'); expect((await req('POST',`clinical/assessment-protocols/${v.id}/reviews`,doctor,{consentPolicyVersionId:p.id,protocolHash:r.json().protocolHash,expectedReviewNumber:0,reviewedQuestionnaireAndScoring:true,educationalOnly:true,noDiagnosisOrTherapeuticDiet:true})).statusCode).toBe(422); expect((await db.assessmentVersion.findUniqueOrThrow({where:{id:v.id}})).contentHash).toBe('a'.repeat(64));
  });
  it('policy retirement/change removes usable approval; explicit review of new consent has new hash',async()=>{
    const f=await prepared(); const old=(await approve(f)).json(); const next=await policy(); expect(await usable(f.v.id)).toBeNull(); const p=await preview(f.v.id); expect(p.json()).toMatchObject({approvalUsable:false,currentReviewNumber:1}); expect(p.json().protocolHash).not.toBe(old.protocolHash);
    expect((await approve(f,doctor,randomUUID(),{expectedReviewNumber:1})).statusCode).toBe(409);
    expect((await approve(f,doctor,randomUUID(),{consentPolicyVersionId:next.id,protocolHash:p.json().protocolHash,expectedReviewNumber:1})).statusCode).toBe(201); expect(await usable(f.v.id)).not.toBeNull();
  });
  it('withdraws by appending immutable evidence and never falls back to an earlier approval',async()=>{
    const f=await prepared(); const first=(await approve(f)).json(); const second=(await approve(f,doctor,randomUUID(),{expectedReviewNumber:1})).json();
    expect((await withdrawal(f.v.id,first)).statusCode).toBe(409); const key=randomUUID(); const rs=await Promise.all(Array.from({length:8},()=>withdrawal(f.v.id,second,doctor,key))); expect(rs.map(r=>r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(rs.map(r=>r.json().id)).size).toBe(1);
    expect(await usable(f.v.id)).toBeNull(); expect((await preview(f.v.id)).json()).toMatchObject({approvalUsable:false,currentReviewNumber:3,latestReview:{decision:'WITHDRAWN',withdrawalOfId:second.id}});
    expect((await db.assessmentProtocolReview.findUniqueOrThrow({where:{id:second.id}})).decision).toBe('APPROVED');
    const later=await approve(f,doctor,randomUUID(),{expectedReviewNumber:3}); expect(later.statusCode).toBe(201); expect(later.json().reviewNumber).toBe(4); expect((await usable(f.v.id))?.id).toBe(later.json().id);
  });
  it('replay returns retained approval evidence after withdrawal without restoring usability',async()=>{
    const f=await prepared(); const key=randomUUID(); const row=(await approve(f,doctor,key)).json(); await withdrawal(f.v.id,row);
    const replay=await approve(f,doctor,key); expect(replay.json()).toMatchObject({id:row.id,decision:'APPROVED'}); expect(await usable(f.v.id)).toBeNull();
  });
  it('can withdraw after source or consent retirement but cannot newly approve a retired source',async()=>{
    const f=await prepared(); const row=(await approve(f)).json(); await db.assessmentVersion.update({where:{id:f.v.id},data:{status:'RETIRED',retiredAt:new Date()}}); await retire();
    expect((await preview(f.v.id)).statusCode).toBe(200); expect(await usable(f.v.id)).toBeNull(); expect((await withdrawal(f.v.id,row)).statusCode).toBe(201); expect((await approve(f,doctor,randomUUID(),{expectedReviewNumber:2})).statusCode).toBe(409);
  });
  it('suppresses usability when reviewer loses active profile or explicit clinic access',async()=>{
    const f=await prepared(); const reviewer=await actor('DOCTOR'); await approve(f,reviewer); expect(await usable(f.v.id)).not.toBeNull();
    await db.doctorProfile.update({where:{userId:reviewer.userId},data:{isActive:false}}); expect(await usable(f.v.id)).toBeNull(); await db.doctorProfile.update({where:{userId:reviewer.userId},data:{isActive:true}});
    await db.clinicalClinicAccess.delete({where:{userId_clinicId:{userId:reviewer.userId,clinicId}}}); expect(await usable(f.v.id)).toBeNull();
  });
  it('paginates exact source queue and retained history without patient or private reviewer data',async()=>{
    const f=await prepared(); await approve(f); await approve(f,doctor,randomUUID(),{expectedReviewNumber:1}); await approve(f,doctor,randomUUID(),{expectedReviewNumber:2});
    const history=await req('GET',`clinical/assessment-protocols/${f.v.id}/reviews?pageSize=2`); expect(history.json().items.map((r:{reviewNumber:number})=>r.reviewNumber)).toEqual([3,2]); expect(history.json().total).toBe(3);
    const list=await req('GET',`clinical/assessment-protocols?assessmentKey=${f.v.assessmentKey}&pageSize=1`); expect(list.json().items).toHaveLength(1); expect(list.json().items[0]).toMatchObject({id:f.v.id,currentReviewNumber:3,latestRecordedDecision:'APPROVED'});
    for(const field of ['answers','actorUserId','actorSessionId','doctorProfileId']) { expect(list.body).not.toContain(`"${field}"`);expect(history.body).not.toContain(`"${field}"`); }
    expect((await req('GET','clinical/assessment-protocols?pageSize=51')).statusCode).toBe(400);
  });
  it('database enforces retained immutable history, consecutive numbers, scope/session and valid predecessor',async()=>{
    const f=await prepared(); const row=(await approve(f)).json(); const stored=await db.assessmentProtocolReview.findUniqueOrThrow({where:{id:row.id}});
    await expect(db.assessmentProtocolReview.update({where:{id:row.id},data:{decision:'WITHDRAWN'}})).rejects.toThrow(/immutable retained/); await expect(db.assessmentProtocolReview.delete({where:{id:row.id}})).rejects.toThrow(/immutable retained/);
    await expect(db.assessmentProtocolReview.create({data:{...stored,id:randomUUID(),reviewNumber:8,idempotencyKey:randomUUID()}})).rejects.toThrow(/consecutive/);
    await expect(db.assessmentProtocolReview.create({data:{...stored,id:randomUUID(),reviewNumber:2,idempotencyKey:randomUUID(),actorUserId:admin.userId,actorSessionId:admin.sessionId}})).rejects.toThrow(/Qualified/);
    await expect(db.assessmentProtocolReview.create({data:{...stored,id:randomUUID(),reviewNumber:2,idempotencyKey:randomUUID(),actorSessionId:admin.sessionId}})).rejects.toThrow(/owned physician session/);
    await expect(db.assessmentProtocolReview.create({data:{...stored,id:randomUUID(),reviewNumber:2,idempotencyKey:randomUUID(),decision:'WITHDRAWN',withdrawalOfId:row.id,withdrawalReason:null}})).rejects.toThrow();
  });
  it('monotonic review time tolerates a backwards clock step and preserves final withdrawal evidence',async()=>{
    const f=await prepared(); const row=(await approve(f)).json(); const stored=await db.assessmentProtocolReview.findUniqueOrThrow({where:{id:row.id}});
    const future=await db.assessmentProtocolReview.create({data:{...stored,id:randomUUID(),reviewNumber:2,idempotencyKey:randomUUID(),createdAt:new Date(Date.now()+60_000)}});
    const r=await withdrawal(f.v.id,future); expect(r.statusCode).toBe(201); expect(new Date(r.json().createdAt).getTime()).toBeGreaterThanOrEqual(future.createdAt.getTime());
  });
  it('audit failure rolls back approvals/withdrawal and denies source/history/queue reads',async()=>{
    const reviewer=await actor('DOCTOR'); const f=await prepared(); const initial=(await approve(f)).json(); const fresh=await prepared();
    if(!/^[a-f0-9-]{36}$/.test(reviewer.userId)) throw new Error('Invalid synthetic UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION protocol_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id='${reviewer.userId}'::uuid THEN RAISE EXCEPTION 'synthetic protocol audit failure'; END IF; RETURN NEW; END $$`); await db.$executeRaw(Prisma.sql`CREATE TRIGGER protocol_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION protocol_test_audit_fail()`);
    try {
      for(const r of [await approve(fresh,reviewer),await withdrawal(f.v.id,initial,reviewer),await preview(fresh.v.id,reviewer),await req('GET',`clinical/assessment-protocols/${f.v.id}/reviews`,reviewer),await req('GET','clinical/assessment-protocols',reviewer)]) {expect(r.statusCode).toBe(500);expect(r.body).not.toContain('synthetic protocol audit failure');}
      expect(await db.assessmentProtocolReview.count({where:{assessmentVersionId:fresh.v.id}})).toBe(0); expect(await db.assessmentProtocolReview.count({where:{assessmentVersionId:f.v.id}})).toBe(1);
    }finally{await db.$executeRaw(Prisma.sql`DROP TRIGGER protocol_test_audit_fail ON audit_events`);await db.$executeRaw(Prisma.sql`DROP FUNCTION protocol_test_audit_fail()`);}
  });
  it('rejects revoked sessions and keeps audit metadata free of scoring text and withdrawal reasons',async()=>{
    const f=await prepared(); const row=(await approve(f)).json(); await withdrawal(f.v.id,row); const who=await actor('DOCTOR'); await db.session.update({where:{id:who.sessionId},data:{revokedAt:new Date(),revokedReason:'LOGOUT'}}); expect((await preview(f.v.id,who)).statusCode).toBe(401);
    const events=await db.auditEvent.findMany({where:{subjectType:'ASSESSMENT_PROTOCOL',subjectId:{in:[f.v.id,row.id]}}}); expect(events.length).toBeGreaterThan(0); expect(events.every(e=>JSON.stringify(e.metadata)==='{}')).toBe(true);
  });
});
