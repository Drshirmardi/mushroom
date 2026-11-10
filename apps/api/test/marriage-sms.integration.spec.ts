import { createHash, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { SmsCredentialCryptoService } from '../src/modules/communications/sms/sms-credential-crypto.service';
import { SmsProviderRegistry } from '../src/modules/communications/sms/sms-provider.registry';
import { SmsRuntimeService } from '../src/modules/communications/sms/sms-runtime.service';
import { MarriageSmsService } from '../src/modules/assessments/couples/marriage-sms.service';
import { MarriageRequestService } from '../src/modules/assessments/couples/marriage-request.service';
import { WalletService } from '../src/modules/billing/wallet.service';
import { assertPatientJourneyTestDatabase, createTestAccessToken } from './auth-test-support';
import { createCompleteTestPatient } from './patient-entry-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('marriage SMS queue with PostgreSQL and actual SDK loopback transport',()=>{
  let app:NestFastifyApplication,db:PrismaService,server:Server,origin:string;
  let admin:Awaited<ReturnType<typeof createTestAccessToken>>,sender:typeof admin,publicationId:string,policyId:string;
  let sms:MarriageSmsService,ctx:{actorUserId:string;actorSessionId:string;requestId:string;ipAddress:string};
  const nativeFetch=globalThis.fetch,calls:{body:Record<string,unknown>;path:string}[]=[];
  let responseMode='success',release:()=>void=()=>{},observed:()=>void=()=>{};
  const phone=()=>`+989${Math.floor(Math.random()*900000000+100000000)}`;
  const http=(actor:typeof admin,method:'GET'|'POST'|'PATCH',path:string,payload?:object,key=randomUUID())=>app.inject({method,url:`/v1${path}`,headers:{authorization:`Bearer ${actor.token}`,origin:'http://localhost:3000','idempotency-key':key},...(payload?{payload}:{})});
  const createRequest=async(recipientPhone=phone(),actor=sender)=>{
    const settingsRes=await http(actor,'GET',`/patients/me/marriage-requests/settings/${publicationId}`);expect(settingsRes.statusCode,settingsRes.body).toBe(200);
    if(settingsRes.json().prepayment?.status!=='PAID'){
      const terms=settingsRes.json().termsPolicy as {id:string;contentHash:string};
      const termsConsent=await http(actor,'POST','/patients/me/assessment-consents',{policyVersionId:terms.id,contentHash:terms.contentHash,accepted:true});expect(termsConsent.statusCode,termsConsent.body).toBe(201);
      const profile=await db.patientProfile.findUniqueOrThrow({where:{userId:actor.userId}});
      const wallet=app.get(WalletService),summary=await wallet.summary(profile);
      await wallet.adjust({actorUserId:admin.userId,actorSessionId:admin.sessionId,requestId:randomUUID(),ipAddress:'127.0.0.1'},profile.id,{type:'CREDIT',amountToman:'20000',expectedVersion:summary.version,reason:'Marriage SMS fixture prepay'},randomUUID());
      const intentRes=await http(actor,'POST',`/patients/me/marriage-requests/settings/${publicationId}/billing-intents`,{termsConsentRecordId:termsConsent.json().id});expect(intentRes.statusCode,intentRes.body).toBe(201);
      const paidRes=await http(actor,'POST',`/patients/me/billing/intents/${intentRes.json().id}/wallet-payment`);expect(paidRes.statusCode,paidRes.body).toBe(201);
    }
    const r=await http(actor,'POST','/patients/me/marriage-requests',{publicationId,initiatorRole:'FIRST',recipientPhone,consentPolicyVersionId:policyId,consentAccepted:true});expect(r.statusCode,r.body).toBe(201);return r.json().id as string;
  };
  beforeAll(async()=>{
    assertPatientJourneyTestDatabase();Logger.overrideLogger(false);
    app=await createApiApplication();await app.init();db=app.get(PrismaService);sms=app.get(MarriageSmsService);
    const clinicId=(await db.clinic.findFirstOrThrow({where:{status:'ACTIVE'}})).id;
    const actor=async(role:'ADMIN'|'PATIENT')=>{const a=await createTestAccessToken(db,app.get(AccessTokenService),[role]);await db.userRole.create({data:{userId:a.userId,roleId:(await db.role.findUniqueOrThrow({where:{code:role}})).id}});if(role==='ADMIN')await db.clinicalClinicAccess.create({data:{userId:a.userId,clinicId}});else{await createCompleteTestPatient(db,{data:{userId:a.userId,clinicId}});await db.userProfile.update({where:{userId:a.userId},data:{gender:'MALE'}});}return a;};
    admin=await actor('ADMIN');sender=await actor('PATIENT');ctx={actorUserId:sender.userId,actorSessionId:sender.sessionId,requestId:randomUUID(),ipAddress:'127.0.0.1'};
    const policy=await db.consentPolicyVersion.findFirst({where:{clinicId,policyKey:'COUPLES_ACCOUNT_LINKING',status:'ACTIVE'}})??await db.consentPolicyVersion.create({data:{clinicId,policyKey:'COUPLES_ACCOUNT_LINKING',locale:'fa-IR',versionNumber:1,title:'Synthetic',body:'Synthetic only',contentHash:createHash('sha256').update('Synthetic only').digest('hex'),status:'ACTIVE',activatedAt:new Date()}});policyId=policy.id;
    const source=await db.assessmentVersion.create({data:{clinicId,assessmentKey:`SMS_${randomUUID()}`,locale:'fa-IR',versionNumber:1,title:'Synthetic marriage',contentHash:'a'.repeat(64),status:'PUBLISHED',publishedAt:new Date(),structure:{schemaVersion:1,sections:[{id:'main',questions:[{id:'q',type:'BOOLEAN',required:true,trueScore:1,falseScore:0}]}]}}});
    const offer=await http(admin,'POST','/admin/assessment-offerings/inline-versions',{assessmentVersionId:source.id,title:'Synthetic marriage',kind:'COUPLES',priceMode:'PAID',amountRial:'100000',texts:{processing:'Synthetic',retention:'Synthetic',visibility:'Synthetic',terms:'Synthetic',disclosure:'Synthetic',marriage:{version:1,purpose:'MARRIAGE',roles:[{id:'FIRST',title:'First',genders:['MALE'],minimumAgeYears:18},{id:'SECOND',title:'Second',genders:['FEMALE'],minimumAgeYears:18}],genericJointText:'Synthetic'}}});expect(offer.statusCode,offer.body).toBe(201);publicationId=offer.json().adminPublicationId;
    const config=await http(admin,'POST','/admin/sms/providers/farazsms/revisions',{config:{patternCode:'otp-retained',invitationMode:'TEXT',invitationSenderLine:'90000000'},credential:{apiToken:'synthetic-only-not-live'}});expect(config.statusCode,config.body).toBe(201);
    expect((await http(admin,'PATCH','/admin/sms/providers/farazsms',{enabled:true,isDefault:true})).statusCode).toBe(200);
    server=createServer((req,res)=>{void(async()=>{let body='';for await(const chunk of req)body+=chunk;expect(req.headers['api-key']).toBe('synthetic-only-not-live');calls.push({path:req.url!,body:JSON.parse(body)});observed();if(responseMode==='hold')await new Promise<void>(resolve=>{release=resolve;});if(responseMode==='failure'){res.statusCode=503;res.end('{}');return;}res.setHeader('Content-Type','application/json');res.end('{"status":"success","data":{"id":99}}');})();});
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
    vi.stubGlobal('fetch',(value:string|URL,options?:RequestInit)=>{const url=new URL(String(value));if(url.origin!=='https://api.iranpayamak.com')throw new Error('Unexpected network request during isolated SMS proof');return nativeFetch(new URL(url.pathname,origin),options);});
  },30000);
  afterAll(async()=>{if(db && sender){const patient=await db.patientProfile.findUnique({where:{userId:sender.userId}});if(patient)await db.marriageInvitationDelivery.updateMany({where:{status:'QUEUED',request:{initiatorPatientId:patient.id}},data:{status:'FAILED',resolvedAt:new Date()}});}vi.unstubAllGlobals();if(server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}await app?.close();});
  it('keeps one pinned message across concurrent enqueue/replay, cooldown and changed provider config',async()=>{
    const id=await createRequest(),key=randomUUID();
    const queued=await Promise.all([http(sender,'POST',`/patients/me/marriage-requests/${id}/sms`,undefined,key),http(sender,'POST',`/patients/me/marriage-requests/${id}/sms`,undefined,key)]);
    expect(queued.map(r=>r.statusCode),queued.map(r=>r.body).join('\n')).toEqual([201,201]);expect(await db.marriageInvitationDelivery.count({where:{requestId:id}})).toBe(1);expect(calls).toHaveLength(0);
    const pinned=await db.marriageInvitationDelivery.findFirstOrThrow({where:{requestId:id}});expect(pinned.providerRevisionId).toBeTruthy();
    expect((await http(sender,'POST',`/patients/me/marriage-requests/${id}/sms`)).statusCode).toBe(429);
    const changed=await http(admin,'POST','/admin/sms/providers/farazsms/revisions',{config:{patternCode:'otp-retained',invitationMode:'TEXT',invitationSenderLine:'90000001'}});expect(changed.statusCode,changed.body).toBe(201);
    await sms.tick();await sms.tick();expect(calls).toHaveLength(1);expect(calls[0]).toMatchObject({path:'/ws/v1/sms/simple',body:{line_number:'90000000'}});expect(String(calls[0]!.body.text)).toContain(`/assessment/marriage/requests/${id}`);
    expect((await db.marriageInvitationDelivery.findUniqueOrThrow({where:{id:pinned.id}})).status).toBe('ACCEPTED');
    await expect(db.marriageInvitationDelivery.update({where:{id:pinned.id},data:{status:'QUEUED'}})).rejects.toThrow(/immutable/);
    const config=await http(admin,'GET','/admin/sms/providers');expect(config.json().find((p:{code:string})=>p.code==='farazsms').config.patternCode).toBe('otp-retained');
  },30000);
  it('does not send cancelled/replaced or uncertain messages and measures leases from claim time',async()=>{
    const cancelled=await createRequest();await sms.enqueue(cancelled,randomUUID(),ctx);await http(sender,'POST',`/patients/me/marriage-requests/${cancelled}/cancel`);const before=calls.length;await sms.tick();expect(calls).toHaveLength(before);expect((await db.marriageInvitationDelivery.findFirstOrThrow({where:{requestId:cancelled}})).status).toBe('FAILED');
    const uncertain=await createRequest();await sms.enqueue(uncertain,randomUUID(),ctx);responseMode='failure';await sms.tick();await sms.tick();expect(calls).toHaveLength(before+1);expect((await db.marriageInvitationDelivery.findFirstOrThrow({where:{requestId:uncertain}})).status).toBe('UNKNOWN');responseMode='success';
    const crashed=await createRequest();await sms.enqueue(crashed,randomUUID(),ctx);const record=await db.marriageInvitationDelivery.findFirstOrThrow({where:{requestId:crashed}});await db.marriageInvitationDelivery.update({where:{id:record.id},data:{status:'SENDING',startedAt:new Date(Date.now()-360000)}});await sms.tick();expect((await db.marriageInvitationDelivery.findUniqueOrThrow({where:{id:record.id}})).status).toBe('UNKNOWN');expect(calls).toHaveLength(before+1);
    const old=await createRequest(),oldRecord=await db.marriageInvitationDelivery.create({data:{requestId:old,idempotencyKey:randomUUID(),providerRevisionId:record.providerRevisionId,createdAt:new Date(Date.now()-3600000)}});
    const observedCall=new Promise<void>(resolve=>{observed=resolve;});responseMode='hold';const sending=sms.tick();await observedCall;
    const other=new MarriageSmsService(db,app.get(MarriageRequestService),app.get(SmsCredentialCryptoService),app.get(SmsProviderRegistry),app.get(SmsRuntimeService),app.get(ConfigService));await other.tick();expect((await db.marriageInvitationDelivery.findUniqueOrThrow({where:{id:oldRecord.id}})).status).toBe('SENDING');release();await sending;responseMode='success';observed=()=>{};expect((await db.marriageInvitationDelivery.findUniqueOrThrow({where:{id:oldRecord.id}})).status).toBe('ACCEPTED');
  },30000);
  it('uses an independent approved invitation pattern and rejects incomplete configuration without losing the link',async()=>{
    const invalid=await http(admin,'POST','/admin/sms/providers/farazsms/revisions',{config:{patternCode:'otp-retained',invitationMode:'PATTERN'}});
    expect(invalid.statusCode).toBe(422);
    const configured=await http(admin,'POST','/admin/sms/providers/farazsms/revisions',{config:{patternCode:'otp-retained',invitationMode:'PATTERN',invitationPatternCode:'invite-only'}});
    expect(configured.statusCode,configured.body).toBe(201);
    const id=await createRequest(),before=calls.length;
    await sms.enqueue(id,randomUUID(),ctx);await sms.tick();
    expect(calls).toHaveLength(before+1);
    expect(calls.at(-1)).toMatchObject({path:'/ws/v1/sms/pattern',body:{code:'invite-only',attributes:{link:`http://localhost:3001/assessment/marriage/requests/${id}`}}});
    expect(calls.at(-1)!.body.attributes).not.toHaveProperty('code');
    expect((await http(sender,'GET',`/patients/me/marriage-requests/${id}`)).json().invitationPath).toBe(`/assessment/marriage/requests/${id}`);
    const config=await http(admin,'GET','/admin/sms/providers');
    expect(config.json().find((p:{code:string})=>p.code==='farazsms').config.patternCode).toBe('otp-retained');
  },30000);
  it('enforces lifetime and daily quotas across separate requests without contacting the provider',async()=>{
    const id=await createRequest();await sms.enqueue(id,randomUUID(),ctx);const first=await db.marriageInvitationDelivery.findFirstOrThrow({where:{requestId:id}});
    for(let i=0;i<2;i++)await db.marriageInvitationDelivery.create({data:{requestId:id,idempotencyKey:randomUUID(),providerRevisionId:first.providerRevisionId,createdAt:new Date(Date.now()-120000)}});
    await expect(sms.enqueue(id,randomUUID(),ctx)).rejects.toMatchObject({status:429});expect(await db.marriageInvitationDelivery.count({where:{requestId:id}})).toBe(3);
    const recipient=phone();for(let i=0;i<5;i++){const requestId=await createRequest(recipient);await db.marriageInvitationDelivery.create({data:{requestId,idempotencyKey:randomUUID(),providerRevisionId:first.providerRevisionId}});}
    const quotaUser=await createTestAccessToken(db,app.get(AccessTokenService),['PATIENT']);const quotaClinic=(await db.patientProfile.findUniqueOrThrow({where:{userId:sender.userId}})).clinicId;await db.userRole.create({data:{userId:quotaUser.userId,roleId:(await db.role.findUniqueOrThrow({where:{code:'PATIENT'}})).id}});await createCompleteTestPatient(db,{data:{userId:quotaUser.userId,clinicId:quotaClinic}});await db.userProfile.update({where:{userId:quotaUser.userId},data:{gender:'MALE'}});
    const quotaContext={...ctx,actorUserId:quotaUser.userId,actorSessionId:quotaUser.sessionId};
    const extra=await createRequest(recipient,quotaUser);await expect(sms.enqueue(extra,randomUUID(),quotaContext)).rejects.toMatchObject({status:429});
    const all=await db.marriageInvitationDelivery.count({where:{request:{initiatorPatientId:(await db.patientProfile.findUniqueOrThrow({where:{userId:sender.userId}})).id}}});expect(all).toBeGreaterThanOrEqual(10);
    await expect(sms.enqueue(await createRequest(),randomUUID(),ctx)).rejects.toMatchObject({status:429});
  },30000);
});
