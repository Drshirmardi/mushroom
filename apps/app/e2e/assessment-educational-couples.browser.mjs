import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const id='91111111-1111-4111-8111-111111111111', processingId='92222222-2222-4222-8222-222222222222', consent='93333333-3333-4333-8333-333333333333', grant='94444444-4444-4444-8444-444444444444';
const base='/v1/patients/me/educational-couple-assessments';
const browser=await chromium.launch();
try {
 for(const width of [390,1440]) for(const mode of ['PAID']) {
  const page=await browser.newPage({viewport:{width,height:1000}}), errors=[], writes=[]; let accepted=false;
  page.on('pageerror',e=>errors.push(e.message));
  const data=()=>({id,coupleSessionId:id,publicationId:id,contextHash:'a'.repeat(64),title:'آزمون آموزشی مشترک آزمایشی',priceMode:mode,amountRial:mode==='FREE'?'0':'500000',currency:'IRR',participants:[{slot:'INITIATOR',isSelf:true,consentState:accepted?'ACCEPTED':'PENDING'},{slot:'PARTNER',isSelf:false,consentState:'ACCEPTED'}],ownAccessGrantId:null,ownSubmissionId:null,ownProcessingConsentRecordId:accepted?consent:null,ownPendingIntentId:null,paymentPending:false,newAccessAvailable:true,mutualConsentComplete:accepted,jointResultAvailable:false,processingPolicy:{id:processingId,title:'رضایت پردازش همین آزمون',body:'پردازش و نگهداری و نمایش برای همین نسخه',contentHash:'b'.repeat(64),status:'ACTIVE'},disclosurePolicy:{id,title:'اشتراک با همین همراه',body:'اجازه نمایش دو نتیجه فقط پس از تکمیل هر دو نفر',contentHash:'c'.repeat(64),status:'ACTIVE'},termsPolicy:mode==='PAID'?{id:grant,title:'شرایط خرید هر دو نفر',body:'هزینه کامل برای دو دسترسی مستقل',contentHash:'d'.repeat(64),status:'ACTIVE'}:null});
  await page.route('**/v1/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'http://localhost:3001','access-control-allow-credentials':'true'};
   const send=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
   if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,phone:'+989000000000',roles:['PATIENT']}});
   if(path==='/v1/patients/me/entry')return send({required:false});
   if(path===`${base}/${id}`)return send(data());
   if(path==='/v1/patients/me/assessment-consents'){const body=req.postDataJSON(),isTerms=body.policyVersionId===grant;assert.ok(req.headers()['idempotency-key']);assert.deepEqual(body,{policyVersionId:isTerms?grant:processingId,contentHash:(isTerms?'d':'b').repeat(64),accepted:true});writes.push(isTerms?'terms':'processing');return send({id:isTerms?grant:consent,withdrawnAt:null},201);}
   if(path===`${base}/${id}/consent`){assert.deepEqual(req.postDataJSON(),{contextHash:'a'.repeat(64),processingConsentRecordId:consent,disclosureContentHash:'c'.repeat(64),disclosureAccepted:true,linkedPartnerAcknowledged:true});assert.ok(req.headers()['idempotency-key']);writes.push('sharing');accepted=true;return send(data(),201);}
   if(path===`${base}/${id}/free-access`){assert.equal(mode,'FREE');assert.equal(accepted,true);assert.ok(req.headers()['idempotency-key']);writes.push('free');return send({id:grant,accessMode:'FREE',publicationId:id,grantedAt:new Date().toISOString()},201);}
   if(path===`${base}/${id}/billing-intents`){assert.equal(mode,'PAID');assert.equal(accepted,true);assert.ok(req.headers()['idempotency-key']);assert.deepEqual(req.postDataJSON(),{contextHash:'a'.repeat(64),termsConsentRecordId:grant});writes.push('billing');return send({id:grant},201);}
   if(path.includes('/billing/')||path.includes('/wallet/'))assert.equal(mode,'PAID');
   return send({items:[],total:0,unreadCount:0});
  });
  await page.goto(`http://localhost:3001/assessment/couples/educational/${id}`);
  const accept=page.getByRole('button',{name:'ثبت رضایت من و ادامه',exact:true});
  await accept.waitFor();assert.equal(await accept.isDisabled(),true);assert.deepEqual(writes,[]);
  for(const checkbox of await page.getByRole('checkbox').all())await checkbox.check();
  await accept.click();
  if(mode==='FREE'){await page.getByRole('button',{name:'شروع تست رایگان من',exact:true}).click();await page.waitForURL(`**/assessment/resume?grantId=${grant}`);assert.deepEqual(writes,['processing','sharing','free']);}
  else{await page.getByRole('heading',{name:'شرایط خرید هر دو نفر',exact:true}).waitFor();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'پرداخت هزینهٔ ارزیابی هر دو نفر',exact:true}).click();await page.waitForURL(`**/profile/wallet/pay?intentId=${grant}`);assert.deepEqual(writes,['processing','sharing','terms','billing']);}
  assert.deepEqual(errors,[]);console.log('PASS independent couple processing/disclosure and owned access or existing billing',mode,width);await page.close();
 }
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];let revoked=false,reads=0;page.on('pageerror',e=>errors.push(e.message));
  const dimensions=[{id:'A',title:'دموی'},{id:'B',title:'صفراوی'},{id:'C',title:'بلغمی'},{id:'D',title:'سوداوی'}];
  const snapshot={algorithmId:'DIMENSION_TIEBREAK',algorithmVersion:2,status:'PAIR',primary:'A',secondary:'B',scores:{A:4,B:3,C:2,D:2},dimensionTitles:dimensions,profile:{id:'AB',title:'الگوی آموزشی نفر اول'},tiedDimensions:[]};
  await page.route('**/v1/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'http://localhost:3001','access-control-allow-credentials':'true'};const send=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
   if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,phone:'+989000000000',roles:['PATIENT']}});
   if(path==='/v1/patients/me/entry')return send({required:false});
   if(path===`${base}/${id}/result`){reads++;return revoked?send({code:'COUPLE_ASSESSMENT_NOT_FOUND',message:'Unavailable',requestId:'synthetic',details:{}},404):send({results:[{slot:'INITIATOR',isSelf:true,resultSnapshot:snapshot},{slot:'PARTNER',isSelf:false,resultSnapshot:{...snapshot,status:'PRIMARY_TIE',profile:null,primary:null,secondary:null,tiedDimensions:['A','B']}}],jointText:'توضیح مشترک اختیاری این ترکیب'});}
   return send({items:[],total:0,unreadCount:0});});
  await page.goto(`http://localhost:3001/assessment/couples/educational/result/${id}`);
  await page.getByRole('heading',{name:'نتیجهٔ شما',exact:true}).waitFor();const partner=page.getByRole('heading',{name:'نتیجه نفر دوم',exact:true});await partner.waitFor();await page.getByText('پاسخ‌ها هنوز گرایش غالب مشخصی نشان نمی‌دهند.',{exact:true}).waitFor();await page.getByText('توضیح مشترک اختیاری این ترکیب',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  revoked=true;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await partner.waitFor({state:'detached'});assert.ok(reads>=2);assert.deepEqual(errors,[]);
  console.log('PASS two actual charts, explicit ambiguity and removal after sharing revocation',width);await page.close();
 }
}finally{await browser.close();}
