import { createHash, randomUUID } from 'node:crypto';
import { WalletService } from '../src/modules/billing/wallet.service';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { previewTieBreakDraft, type TieBreakDraft } from '../src/modules/assessments/domain/assessment-tiebreak-draft';
import { assertPatientJourneyTestDatabase, createTestAccessToken } from './auth-test-support';
import { createCompleteTestPatient } from './patient-entry-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('ADMIN paid public access and entry-only free boundary (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication, db: PrismaService, clinicId: string, admin: Awaited<ReturnType<typeof actor>>;
  beforeAll(async () => {
    assertPatientJourneyTestDatabase();
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    admin = await actor('ADMIN');
    await db.clinicalClinicAccess.create({ data: { userId: admin.userId, clinicId } });
    const entryPolicy=(await request(admin,'GET','/admin/assessment-entry-policy')).json();
    expect((await request(admin,'PUT','/admin/assessment-entry-policy',{enabled:false,assessmentVersionId:null,expectedRevision:entryPolicy.revision,amountRial:'0',allowDeferral:false})).statusCode).toBe(200);
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  async function actor(role: 'ADMIN' | 'PATIENT') {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    const record = await db.role.upsert({ where: { code: role }, create: { code: role }, update: {} });
    await db.userRole.create({ data: { userId: auth.userId, roleId: record.id } }); return auth;
  }
  async function patient(adult = true, complete = true) {
    const auth = await actor('PATIENT');
    const profile = complete ? await createCompleteTestPatient(db, { data: { userId: auth.userId, clinicId } }) : await db.patientProfile.create({ data: { userId: auth.userId, clinicId } });
    if (!complete) {
      await db.userProfile.upsert({ where: { userId:auth.userId }, create: { userId:auth.userId,firstName:'Synthetic',lastName:'Invitee',gender:'FEMALE' }, update: { firstName:'Synthetic',lastName:'Invitee',gender:'FEMALE' } });
      await db.patientEntry.create({ data: { patientId:profile.id,clinicId,birthDate:new Date('1990-01-01') } });
    }
    const intake = await db.patientMedicalIntake.create({ data: { patientId: profile.id, clinicId, currentRevisionNumber: 1 } });
    await db.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: 1, assignedSchemaVersion: 1, revisionState: 'DRAFT', birthDate: new Date(adult ? '1990-01-01' : '2020-01-01'), recordingMode: 'PATIENT_ENTRY', reportedPatientId: profile.id, payloadHash: 'a'.repeat(64) } });
    return { ...auth, profile };
  }
  const invitationContexts = new Map<string,string>();
  function request(who: Awaited<ReturnType<typeof actor>>, method: 'GET' | 'POST' | 'PUT', path: string, payload?: object, key = randomUUID()) {
    return app.inject({ method, url: `/v1${path}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(invitationContexts.has(who.userId) ? { 'x-marriage-request-id': invitationContexts.get(who.userId)! } : {}), 'idempotency-key': key, ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  }
  async function offering(algorithmVersion = 1, priceMode = 'FREE', kind = 'INDIVIDUAL', pairText = false, marriage = false) {
    const base = structuredClone(MIZAJ_DRAFT_PRESET.structure), dimensions = base.scoring.dimensions;
    const structure = { ...base, schemaVersion: 3, scoring: { ...base.scoring, algorithmId: 'DIMENSION_TIEBREAK', algorithmVersion }, followUps: dimensions.flatMap((a, i) => dimensions.slice(i + 1).map(b => ({ id: `tie_${a.id}_${b.id}`, title: 'Synthetic distinction', tiedDimensions: [a.id, b.id], options: [a, b].map(d => ({ id: `o_${d.id}`, title: d.title, dimensionId: d.id })) }))) };
    const createdSource = await request(admin, 'POST', '/admin/assessments', { assessmentKey: `FREE_${randomUUID()}`, locale: 'fa-IR', title: 'Synthetic free Mizaj', structure });
    expect(createdSource.statusCode, createdSource.body).toBe(201);
    const source = createdSource.json();
    const profile = pairText ? previewTieBreakDraft(structure as unknown as TieBreakDraft, Object.fromEntries(structure.sections.flatMap(section => section.questions.map(q => [q.id, q.options[0]!.id])))).profile : null;
    const created = await request(admin, 'POST', '/admin/assessment-offerings/inline-versions', { assessmentVersionId: source.id, expectedQuestionnaireHash: source.contentHash, title: source.title, kind, priceMode, ...(priceMode === 'PAID' ? { amountRial: '100000' } : {}), texts: { ...(marriage ? { marriage: { version:1,purpose:'MARRIAGE',roles:[{id:'FIRST',title:'Woman',genders:['FEMALE'],minimumAgeYears:18},{id:'SECOND',title:'Man',genders:['MALE'],minimumAgeYears:18}],genericJointText:'Synthetic role-aware fallback' } } : {}), processing: 'پردازش', retention: 'نگهداری', visibility: 'نمایش', terms: 'خرید', disclosure: 'اشتراک مستقل', ...(profile ? { pairTexts: [{ firstProfileId: profile.id, secondProfileId: profile.id, text: 'متن مشترک اختیاری همین ترکیب' }] } : {}) } });
    expect(created.statusCode, created.body).toBe(201);
    const policy = await db.consentPolicyVersion.findFirstOrThrow({ where: { assessmentOfferingVersionId: created.json().id, policyKey: 'ASSESSMENT_PROCESSING' } });
    return { source, structure, row: created.json(), policy };
  }
  async function accept(who: Awaited<ReturnType<typeof actor>>, offer: Awaited<ReturnType<typeof offering>>) {
    const result = await request(who, 'POST', '/patients/me/assessment-consents', { policyVersionId: offer.policy.id, contentHash: offer.policy.contentHash, accepted: true });
    expect(result.statusCode, result.body).toBe(201); return result.json().id as string;
  }
  async function claim(who: Awaited<ReturnType<typeof actor>>, offer: Awaited<ReturnType<typeof offering>>, consent: string) {
    return request(who, 'POST', '/patients/me/educational-assessment-access', { publicationId: offer.row.adminPublicationId, processingConsentRecordId: consent });
  }
  it.each([1,2])('does not expose or grant a new public FREE attempt for algorithm version %s',async version=>{
    const offer=await offering(version),who=await patient(),consent=await accept(who,offer);
    const catalog=await request(who,'GET',`/patients/me/educational-assessment-offerings?offeringKey=${offer.row.offeringKey}`);expect(catalog.json().items).toEqual([]);
    expect((await request(who,'GET',`/patients/me/educational-assessment-offerings/${offer.row.adminPublicationId}`)).statusCode).toBe(404);
    const key=randomUUID();for(let retry=0;retry<2;retry++)expect((await request(who,'POST','/patients/me/educational-assessment-access',{publicationId:offer.row.adminPublicationId,processingConsentRecordId:consent},key)).statusCode).toBe(409);
    expect(await db.assessmentAccessGrant.count({where:{patientId:who.profile.id}})).toBe(0);expect(await db.billingIntent.count({where:{patientId:who.profile.id}})).toBe(0);
    expect((await request(who,'POST',`/assessments/${offer.source.id}/submissions`)).statusCode).toBe(409);
    await expect(db.assessmentAccessGrant.create({data:{clinicId,patientId:who.profile.id,freeAdminPublicationId:offer.row.adminPublicationId,assessmentVersionId:offer.source.id,processingConsentRecordId:consent,method:'FREE'}})).rejects.toThrow(/initial entry/);
  });
  it('does not turn another person or offer acceptance into free access',async()=>{
    const a=await offering(),b=await offering(),who=await patient(),minor=await patient(false),consent=await accept(who,a);
    expect((await claim(who,b,consent)).statusCode).toBe(409);expect((await claim(minor,a,consent)).statusCode).toBe(409);
    await expect(db.patientAssessmentSubmission.create({data:{patientId:who.profile.id,assessmentVersionId:a.source.id,answers:{}}})).rejects.toThrow(/entry or paid/);
  });
  async function linkedPair() {
    const a=await patient(), b=await patient();
    const policyResponse=await request(a,'GET','/patients/me/couple-link-policy');expect(policyResponse.statusCode,policyResponse.body).toBe(200);const policy=policyResponse.json();
    const consent={consentPolicyVersionId:policy.id,consentAccepted:true};
    const created=await request(a,'POST','/patients/me/couple-sessions',consent);expect(created.statusCode,created.body).toBe(201);const id=created.json().id;
    const peer=await db.user.findUniqueOrThrow({where:{id:b.userId}});
    const invited=await request(a,'POST',`/patients/me/couple-sessions/${id}/invitations`,{recipientPhone:peer.phone,recipientPatientId:b.profile.id});expect(invited.statusCode,invited.body).toBe(201);
    const accepted=await request(b,'POST','/patients/me/couple-invitations/accept',{...consent,invitationToken:invited.json().invitationToken});expect(accepted.statusCode,accepted.body).toBe(201);
    return {a,b,id};
  }
  it('marriage request completes two real independent assessments with one wallet payment and role-aware fallback', async () => {
    const algorithmVersion=2,offer=await offering(2,'PAID','COUPLES',false,true);
    const a=await patient(),b=await patient(true,false),stranger=await patient();
    await db.userProfile.update({where:{userId:a.userId},data:{gender:'MALE'}});
    const peer=await db.user.findUniqueOrThrow({where:{id:b.userId}});await db.session.update({where:{id:b.sessionId},data:{verifiedPhone:peer.phone}});
    const linking=await request(a,'GET','/patients/me/couple-link-policy');expect(linking.statusCode,linking.body).toBe(200);
    const invited=await request(a,'POST','/patients/me/marriage-requests',{publicationId:offer.row.adminPublicationId,initiatorRole:'SECOND',recipientPhone:peer.phone,consentPolicyVersionId:linking.json().id,consentAccepted:true});expect(invited.statusCode,invited.body).toBe(201);
    const requestId = invited.json().id as string;
    invitationContexts.set(b.userId,requestId);
    await db.patientEntryPolicy.upsert({ where: { clinicId }, create: { clinicId, enabled:true, assessmentVersionId:offer.source.id, enforcedFrom:new Date('2000-01-01') }, update: { enabled:true, assessmentVersionId:offer.source.id, enforcedFrom:new Date('2000-01-01') } });
    const entry=await request(b,'GET','/patients/me/entry');expect(entry.json().required).toBe(true);
    for (const path of ['/patients/me/wallet','/patients/me/marriage-requests','/patients/me/educational-couple-assessments']) expect((await request(b,'GET',path)).statusCode).toBe(403);
    const noContext=await app.inject({method:'GET',url:`/v1/patients/me/marriage-requests/${requestId}`,headers:{authorization:`Bearer ${b.token}`}});expect(noContext.statusCode).toBe(403);
    invitationContexts.set(b.userId,randomUUID());expect((await request(b,'GET',`/patients/me/marriage-requests/${requestId}`)).statusCode).toBe(403);invitationContexts.set(b.userId,requestId);
    await db.session.update({where:{id:b.sessionId},data:{verifiedPhone:null}});expect((await request(b,'GET',`/patients/me/marriage-requests/${requestId}`)).statusCode).toBe(403);await db.session.update({where:{id:b.sessionId},data:{verifiedPhone:peer.phone}});
    await db.userProfile.update({where:{userId:b.userId},data:{lastName:''}});
    expect((await request(b,'GET',`/patients/me/marriage-requests/${requestId}`)).json().continuation.profileRequired).toBe(true);
    expect((await request(b,'POST',`/patients/me/marriage-requests/${requestId}/accept`,{consentPolicyVersionId:linking.json().id,consentAccepted:true})).statusCode).toBe(403);
    const completedProfile=await request(b,'POST','/patients/me/entry/profile',{firstName:'Synthetic',lastName:'Invitee',gender:'FEMALE',birthDate:'1990-01-01'});expect(completedProfile.statusCode,completedProfile.body).toBe(200);expect(completedProfile.json().required).toBe(true);
    const preview=await request(b,'GET',`/patients/me/marriage-requests/${requestId}`);expect(preview.statusCode,preview.body).toBe(200);expect(preview.json().continuation.profileRequired).toBe(false);
    const accepted=await request(b,'POST',`/patients/me/marriage-requests/${invited.json().id}/accept`,{consentPolicyVersionId:linking.json().id,consentAccepted:true});expect(accepted.statusCode,accepted.body).toBe(201);
    const id=accepted.json().educationalId as string,base='/patients/me/educational-couple-assessments',pair={a,b};
    const pub=await request(a,'GET',`/patients/me/educational-assessment-offerings/${offer.row.adminPublicationId}`);expect(pub.statusCode,pub.body).toBe(200);
    const history=await request(pair.a,'GET',base);expect(history.statusCode,history.body).toBe(200);expect(history.json().items.some((item:{id:string})=>item.id===id)).toBe(true);
    expect((await request(stranger,'GET',`${base}/${id}`)).statusCode).toBe(404);
    expect((await request(pair.a,'GET',`${base}/${id}/result`)).statusCode).toBe(404);
    const detail=await request(pair.a,'GET',`${base}/${id}`);expect(detail.statusCode,detail.body).toBe(200);const d=detail.json();
    const aConsent=await accept(pair.a,offer), bConsent=await accept(pair.b,offer);
    const agreement=(processingConsentRecordId:string)=>({contextHash:d.contextHash,processingConsentRecordId,disclosureContentHash:d.disclosurePolicy.contentHash,disclosureAccepted:true,linkedPartnerAcknowledged:true});
    expect((await request(pair.b,'POST',`${base}/${id}/consent`,agreement(aConsent))).statusCode).toBe(409);
    const first=await request(pair.a,'POST',`${base}/${id}/consent`,agreement(aConsent));expect(first.statusCode,first.body).toBe(201);expect(first.json().mutualConsentComplete).toBe(false);
    expect((await request(pair.a,'POST',`${base}/${id}/free-access`)).statusCode).toBe(409);
    const second=await request(pair.b,'POST',`${base}/${id}/consent`,agreement(bConsent));expect(second.statusCode,second.body).toBe(201);expect(second.json().mutualConsentComplete).toBe(true);
    let grantIds:string[];
    {
      expect((await request(pair.b,'POST',`${base}/${id}/free-access`)).statusCode).toBe(409);
      const terms=pub.json().termsPolicy, acceptedTerms=await request(pair.b,'POST','/patients/me/assessment-consents',{policyVersionId:terms.id,contentHash:terms.contentHash,accepted:true});expect(acceptedTerms.statusCode,acceptedTerms.body).toBe(201);
      const key=randomUUID(), body={contextHash:d.contextHash,termsConsentRecordId:acceptedTerms.json().id};
      const intents=await Promise.all([request(pair.b,'POST',`${base}/${id}/billing-intents`,body,key),request(pair.b,'POST',`${base}/${id}/billing-intents`,body,key)]);expect(intents.map(r=>r.statusCode),intents.map(r=>r.body).join('\n')).toEqual([201,201]);expect(intents[0].json().id).toBe(intents[1].json().id);const intent=intents[0].json();
      const receipt=await request(pair.b,'GET',`/patients/me/assessment-purchases/${intent.assessmentPurchaseId}`);expect(receipt.statusCode,receipt.body).toBe(200);expect(receipt.json().managementHref).toBe(`/assessment/couples/educational/${id}`);
      expect(await db.assessmentAccessGrant.count({where:{purchaseId:intent.assessmentPurchaseId}})).toBe(0);
      const wallet=app.get(WalletService), balance=await wallet.summary(pair.b.profile);
      await wallet.adjust({actorUserId:admin.userId,actorSessionId:admin.sessionId,requestId:randomUUID(),ipAddress:'127.0.0.1'},pair.b.profile.id,{type:'CREDIT',amountToman:'100000',expectedVersion:balance.version,reason:'Synthetic educational couple fixture'},randomUUID());
      const payKey=randomUUID(),pays=await Promise.all([request(pair.b,'POST',`/patients/me/billing/intents/${intent.id}/wallet-payment`,undefined,payKey),request(pair.b,'POST',`/patients/me/billing/intents/${intent.id}/wallet-payment`,undefined,payKey)]);expect(pays.map(r=>r.statusCode),pays.map(r=>r.body).join('\n')).toEqual([201,201]);
      expect((await wallet.summary(pair.b.profile)).balanceRial).toBe('900000');expect(await db.assessmentAccessGrant.count({where:{purchaseId:intent.assessmentPurchaseId}})).toBe(2);
      grantIds=[];for(const who of [pair.a,pair.b]){const state=await request(who,'GET',`${base}/${id}`);expect(state.statusCode,state.body).toBe(200);grantIds.push(state.json().ownAccessGrantId);}
    }
    const submissions=[];
    for(const [index,who] of [pair.a,pair.b].entries()){
      const grant=grantIds[index];
      const started=await request(who,'POST',`/patients/me/assessment-access-grants/${grant}/submission`);expect(started.statusCode,started.body).toBe(201);const sid=started.json().id;
      const answers=Object.fromEntries(offer.structure.sections.flatMap(s=>s.questions.map(q=>[q.id,q.options[0]!.id])));
      const saved=await request(who,'PUT',`/assessment-submissions/${sid}`,{answers,expectedRevision:started.json().revision});expect(saved.statusCode,saved.body).toBe(200);
      const completed=await request(who,'POST',`/assessment-submissions/${sid}/submit`,{expectedRevision:saved.json().revision});expect(completed.statusCode,completed.body).toBe(201);submissions.push(sid);
      if(index===0)expect((await request(who,'GET',`${base}/${id}/result`)).statusCode).toBe(404);
    }
    expect((await request(b,'GET','/patients/me/entry')).json().required).toBe(true);
    expect((await db.patientEntry.findUniqueOrThrow({where:{patientId:b.profile.id}})).completedAt).toBeNull();
    const unrelated=await request(b,'GET',`/assessment-submissions/${submissions[0]}`);expect(unrelated.statusCode).toBe(403);
    const recipientJoint=await request(b,'GET',`${base}/${id}/result`);expect(recipientJoint.statusCode,recipientJoint.body).toBe(200);
    const joint=await request(pair.a,'GET',`${base}/${id}/result`);expect(joint.statusCode,joint.body).toBe(200);expect(joint.json().results).toHaveLength(2);expect(joint.json().jointText).toBe('Synthetic role-aware fallback');
    for(const result of joint.json().results){expect(result.resultSnapshot.algorithmVersion).toBe(algorithmVersion);expect(result.resultSnapshot.scores).toBeTruthy();expect(result.resultSnapshot.answers).toBeUndefined();}
    for(const privateValue of [pair.a.profile.id,pair.b.profile.id,'compatibilityScore','answerPayloadHash']) expect(joint.body).not.toContain(privateValue);

    expect(joint.json().results.map((result:{roleId:string;isSelf:boolean})=>[result.roleId,result.isSelf])).toEqual([['FIRST',false],['SECOND',true]]);
    const withdrawal=await request(pair.a,'POST',`${base}/${id}/sharing-withdrawal`);expect(withdrawal.statusCode,withdrawal.body).toBe(201);
    expect((await request(pair.b,'GET',`${base}/${id}/result`)).statusCode).toBe(404);
    // Once accepted, a later holder of the same number never becomes this recipient.
    await db.user.update({where:{id:b.userId},data:{phone:`+989${Math.floor(Math.random()*900000000+100000000)}`}});
    const laterHolder=stranger;await db.user.update({where:{id:laterHolder.userId},data:{phone:peer.phone}});await db.session.update({where:{id:laterHolder.sessionId},data:{verifiedPhone:peer.phone}});
    expect((await request(laterHolder,'GET',`/patients/me/marriage-requests/${requestId}`)).statusCode).toBe(404);
    expect((await request(laterHolder,'GET','/patients/me/marriage-requests')).json().items.some((item:{id:string})=>item.id===requestId)).toBe(false);
    const moved=await db.user.findUniqueOrThrow({where:{id:b.userId}});await db.session.update({where:{id:b.sessionId},data:{verifiedPhone:moved.phone}});expect((await request(b,'GET',`/patients/me/marriage-requests/${requestId}`)).statusCode).toBe(200);
  }, 30000);

  it.each([[1,'PAID'],[2,'PAID']] as [number,string][])('couple v%s %s retains two real charts and independent disclosure without a complete text matrix',async (algorithmVersion,priceMode)=>{
    const offer=await offering(algorithmVersion,priceMode,'COUPLES',algorithmVersion===2),pair=await linkedPair(),stranger=await patient();
    const pub=await request(pair.a,'GET',`/patients/me/educational-assessment-offerings/${offer.row.adminPublicationId}`);expect(pub.statusCode,pub.body).toBe(200);
    const base='/patients/me/educational-couple-assessments';
    const created=await request(pair.a,'POST',base,{coupleSessionId:pair.id,publicationId:offer.row.adminPublicationId,publicationHash:pub.json().publicationHash});expect(created.statusCode,created.body).toBe(201);const id=created.json().id;
    const history=await request(pair.a,'GET',base);expect(history.statusCode,history.body).toBe(200);expect(history.json().items.some((item:{id:string})=>item.id===id)).toBe(true);
    expect((await request(stranger,'GET',`${base}/${id}`)).statusCode).toBe(404);
    expect((await request(pair.a,'GET',`${base}/${id}/result`)).statusCode).toBe(404);
    const detail=await request(pair.a,'GET',`${base}/${id}`);expect(detail.statusCode,detail.body).toBe(200);const d=detail.json();
    const aConsent=await accept(pair.a,offer), bConsent=await accept(pair.b,offer);
    const agreement=(processingConsentRecordId:string)=>({contextHash:d.contextHash,processingConsentRecordId,disclosureContentHash:d.disclosurePolicy.contentHash,disclosureAccepted:true,linkedPartnerAcknowledged:true});
    expect((await request(pair.b,'POST',`${base}/${id}/consent`,agreement(aConsent))).statusCode).toBe(409);
    const first=await request(pair.a,'POST',`${base}/${id}/consent`,agreement(aConsent));expect(first.statusCode,first.body).toBe(201);expect(first.json().mutualConsentComplete).toBe(false);
    expect((await request(pair.a,'POST',`${base}/${id}/free-access`)).statusCode).toBe(409);
    const second=await request(pair.b,'POST',`${base}/${id}/consent`,agreement(bConsent));expect(second.statusCode,second.body).toBe(201);expect(second.json().mutualConsentComplete).toBe(true);
    let grantIds:string[];
    if(priceMode==='FREE'){
      const key=randomUUID(),grants=await Promise.all([request(pair.a,'POST',`${base}/${id}/free-access`,undefined,key),request(pair.a,'POST',`${base}/${id}/free-access`,undefined,key)]);expect(grants.map(r=>r.statusCode),grants.map(r=>r.body).join('\n')).toEqual([201,201]);expect(grants[0].json().id).toBe(grants[1].json().id);
      const peerGrant=await request(pair.b,'POST',`${base}/${id}/free-access`);expect(peerGrant.statusCode,peerGrant.body).toBe(201);grantIds=[grants[0].json().id,peerGrant.json().id];
    }else{
      expect((await request(pair.a,'POST',`${base}/${id}/free-access`)).statusCode).toBe(409);
      const terms=pub.json().termsPolicy, acceptedTerms=await request(pair.a,'POST','/patients/me/assessment-consents',{policyVersionId:terms.id,contentHash:terms.contentHash,accepted:true});expect(acceptedTerms.statusCode,acceptedTerms.body).toBe(201);
      const key=randomUUID(), body={contextHash:d.contextHash,termsConsentRecordId:acceptedTerms.json().id};
      const intents=await Promise.all([request(pair.a,'POST',`${base}/${id}/billing-intents`,body,key),request(pair.a,'POST',`${base}/${id}/billing-intents`,body,key)]);expect(intents.map(r=>r.statusCode),intents.map(r=>r.body).join('\n')).toEqual([201,201]);expect(intents[0].json().id).toBe(intents[1].json().id);const intent=intents[0].json();
      const receipt=await request(pair.a,'GET',`/patients/me/assessment-purchases/${intent.assessmentPurchaseId}`);expect(receipt.statusCode,receipt.body).toBe(200);expect(receipt.json().managementHref).toBe(`/assessment/couples/educational/${id}`);
      if(algorithmVersion===2){
        const transaction=db.$transaction.bind(db);
        const clock=vi.spyOn(db,'$transaction').mockImplementation(((work:any,options:any)=>transaction((tx:any)=>work(new Proxy(tx,{get(target,key){if(key==='$queryRaw')return (sql:Prisma.Sql)=>sql.sql.includes('CURRENT_TIMESTAMP AS now')?Promise.resolve([{now:new Date('2100-01-01')}]):target.$queryRaw(sql);return Reflect.get(target,key);}})),options)) as typeof db.$transaction);
        try{for(const who of [pair.a,pair.b]){const expired=await request(who,'GET',`${base}/${id}`);expect(expired.statusCode,expired.body).toBe(200);expect(expired.json()).toMatchObject({ownPendingIntentId:null,paymentPending:false});}}finally{clock.mockRestore();}
        const current=await request(pair.a,'GET',`${base}/${id}`);expect(current.json()).toMatchObject({ownPendingIntentId:intent.id,paymentPending:true});
      }
      expect(await db.assessmentAccessGrant.count({where:{purchaseId:intent.assessmentPurchaseId}})).toBe(0);
      const wallet=app.get(WalletService), balance=await wallet.summary(pair.a.profile);
      await wallet.adjust({actorUserId:admin.userId,actorSessionId:admin.sessionId,requestId:randomUUID(),ipAddress:'127.0.0.1'},pair.a.profile.id,{type:'CREDIT',amountToman:'100000',expectedVersion:balance.version,reason:'Synthetic educational couple fixture'},randomUUID());
      const payKey=randomUUID(),pays=await Promise.all([request(pair.a,'POST',`/patients/me/billing/intents/${intent.id}/wallet-payment`,undefined,payKey),request(pair.a,'POST',`/patients/me/billing/intents/${intent.id}/wallet-payment`,undefined,payKey)]);expect(pays.map(r=>r.statusCode),pays.map(r=>r.body).join('\n')).toEqual([201,201]);
      expect((await wallet.summary(pair.a.profile)).balanceRial).toBe('900000');expect(await db.assessmentAccessGrant.count({where:{purchaseId:intent.assessmentPurchaseId}})).toBe(2);
      grantIds=[];for(const who of [pair.a,pair.b]){const state=await request(who,'GET',`${base}/${id}`);expect(state.statusCode,state.body).toBe(200);grantIds.push(state.json().ownAccessGrantId);}
    }
    const submissions=[];
    for(const [index,who] of [pair.a,pair.b].entries()){
      const grant=grantIds[index];
      const started=await request(who,'POST',`/patients/me/assessment-access-grants/${grant}/submission`);expect(started.statusCode,started.body).toBe(201);const sid=started.json().id;
      const answers=Object.fromEntries(offer.structure.sections.flatMap(s=>s.questions.map(q=>[q.id,q.options[0]!.id])));
      const saved=await request(who,'PUT',`/assessment-submissions/${sid}`,{answers,expectedRevision:started.json().revision});expect(saved.statusCode,saved.body).toBe(200);
      const completed=await request(who,'POST',`/assessment-submissions/${sid}/submit`,{expectedRevision:saved.json().revision});expect(completed.statusCode,completed.body).toBe(201);submissions.push(sid);
      if(index===0)expect((await request(who,'GET',`${base}/${id}/result`)).statusCode).toBe(404);
    }
    const joint=await request(pair.a,'GET',`${base}/${id}/result`);expect(joint.statusCode,joint.body).toBe(200);expect(joint.json().results).toHaveLength(2);expect(joint.json().jointText).toBe(algorithmVersion===2?'متن مشترک اختیاری همین ترکیب':null);
    for(const result of joint.json().results){expect(result.resultSnapshot.algorithmVersion).toBe(algorithmVersion);expect(result.resultSnapshot.scores).toBeTruthy();expect(result.resultSnapshot.answers).toBeUndefined();}
    for(const privateValue of [pair.a.profile.id,pair.b.profile.id,'compatibilityScore','answerPayloadHash']) expect(joint.body).not.toContain(privateValue);
    if(priceMode==='FREE'&&algorithmVersion===2){
      const auditWhere={resourceType:'EDUCATIONAL_COUPLE_RESULT',resourceId:id},before=await db.patientAccessAudit.count({where:auditWhere});
      await db.$executeRawUnsafe(`CREATE FUNCTION mz05_joint_read_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.patient_id='${pair.b.profile.id}'::uuid AND NEW.resource_type='EDUCATIONAL_COUPLE_RESULT' THEN RAISE EXCEPTION 'synthetic joint audit failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRaw(Prisma.sql`CREATE TRIGGER mz05_joint_read_fail BEFORE INSERT ON patient_access_audits FOR EACH ROW EXECUTE FUNCTION mz05_joint_read_fail()`);
      try{const failed=await request(pair.a,'GET',`${base}/${id}/result`);expect(failed.statusCode,failed.body).toBe(503);expect(failed.body).not.toContain('resultSnapshot');expect(await db.patientAccessAudit.count({where:auditWhere})).toBe(before);}finally{await db.$executeRaw(Prisma.sql`DROP TRIGGER mz05_joint_read_fail ON patient_access_audits`);await db.$executeRaw(Prisma.sql`DROP FUNCTION mz05_joint_read_fail()`);}
    }

    expect((await request(stranger,'GET',`${base}/${id}/result`)).statusCode).toBe(404);
    const retake=await request(pair.a,'POST',base,{coupleSessionId:pair.id,publicationId:offer.row.adminPublicationId,publicationHash:pub.json().publicationHash});expect(retake.statusCode,retake.body).toBe(201);expect(retake.json().id).not.toBe(id);expect(retake.json().mutualConsentComplete).toBe(false);expect(retake.json().ownAccessGrantId).toBeNull();
    const repeat=await request(pair.b,'POST',base,{coupleSessionId:pair.id,publicationId:offer.row.adminPublicationId,publicationHash:pub.json().publicationHash});expect(repeat.statusCode,repeat.body).toBe(201);expect(repeat.json().id).toBe(retake.json().id);
    expect((await request(pair.a,'POST',`${base}/${id}/sharing-withdrawal`)).statusCode).toBe(201);
    for(const who of [pair.a,pair.b])expect((await request(who,'GET',`${base}/${id}/result`)).statusCode).toBe(404);
    expect((await request(pair.a,'GET',`/assessment-submissions/${submissions[0]}/result`)).statusCode).toBe(200);
    expect(await db.assessmentProtocolReview.count({where:{assessmentVersionId:offer.source.id}})).toBe(0);
    expect(await db.assessmentPurchase.count({where:{patientId:{in:[pair.a.profile.id,pair.b.profile.id]}}})).toBe(priceMode==='FREE'?0:1);
    expect(await db.billingIntent.count({where:{patientId:{in:[pair.a.profile.id,pair.b.profile.id]}}})).toBe(priceMode==='FREE'?0:1);
  },30000);

  it('replaces the public paid price/documents without rewriting old versions or reviving a retired price',async()=>{
    const old=await offering(1,'PAID'),who=await patient();
    const documents=await db.consentPolicyVersion.findMany({where:{assessmentOfferingVersionId:old.row.id},orderBy:{id:'asc'}});
    const replacement=await request(admin,'POST','/admin/assessment-offerings/inline-versions',{assessmentVersionId:old.source.id,expectedQuestionnaireHash:old.source.contentHash,title:'New public price',kind:'INDIVIDUAL',priceMode:'PAID',amountRial:'200000',texts:{processing:'New processing',terms:'New terms',retention:'New retention',visibility:'New visibility'}});expect(replacement.statusCode,replacement.body).toBe(201);
    const catalog=await request(who,'GET',`/patients/me/educational-assessment-offerings?offeringKey=${old.row.offeringKey}`);expect(catalog.json().items.map((item:{id:string})=>item.id)).toEqual([replacement.json().adminPublicationId]);expect(catalog.json().items[0].amountRial).toBe('200000');
    expect(await db.consentPolicyVersion.findMany({where:{assessmentOfferingVersionId:old.row.id},orderBy:{id:'asc'}})).toEqual(documents);
    expect((await request(admin,'POST',`/admin/assessment-offerings/${replacement.json().id}/retire`)).statusCode).toBe(201);
    expect((await request(who,'GET',`/patients/me/educational-assessment-offerings?offeringKey=${old.row.offeringKey}`)).json().items).toEqual([]);
  });
  it('returns precise inline field errors before a questionnaire can be published',async()=>{
    const sourceResponse=await request(admin,'POST','/admin/assessments',{assessmentKey:`FIELDS_${randomUUID()}`,locale:'fa-IR',title:'Synthetic field errors',structure:{schemaVersion:1,sections:[{id:'s',questions:[{id:'q',type:'BOOLEAN',required:true,trueScore:1,falseScore:0}]}]}});expect(sourceResponse.statusCode,sourceResponse.body).toBe(201);const source=sourceResponse.json();
    const body={assessmentVersionId:source.id,expectedQuestionnaireHash:source.contentHash,title:'Fields',kind:'COUPLES',priceMode:'PAID',amountRial:'100000',texts:{processing:'Processing',retention:'Retention',visibility:'Visibility'}};
    const noTerms=await request(admin,'POST','/admin/assessment-offerings/inline-versions',body);expect(noTerms.statusCode,noTerms.body).toBe(422);expect(noTerms.json().details.field).toBe('texts.terms');
    const noSharing=await request(admin,'POST','/admin/assessment-offerings/inline-versions',{...body,texts:{...body.texts,terms:'Terms'}});expect(noSharing.statusCode,noSharing.body).toBe(422);expect(noSharing.json().details.field).toBe('texts.disclosure');
    expect((await db.assessmentVersion.findUniqueOrThrow({where:{id:source.id}})).status).toBe('DRAFT');expect(await db.assessmentOfferingVersion.count({where:{assessmentVersionId:source.id}})).toBe(0);
  });

});
