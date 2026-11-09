async (page) => {
 const publication='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',replacement='33333333-3333-4333-8333-333333333333';
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const definition={version:1,purpose:'MARRIAGE',roles:[{id:'FIRST',title:'آقا',genders:['MALE'],minimumAgeYears:18},{id:'SECOND',title:'خانم',genders:['FEMALE'],minimumAgeYears:18}],genericJointText:'تفسیر عمومی'};
 const settings={publicationId:publication,title:'شناخت پیش از ازدواج',amountRial:'100000',definition,eligibleRoles:['FIRST'],linkingPolicy:{id:publication,title:'اتصال حساب‌ها',body:'شرایط اتصال برای همین خدمت',contentHash:'a'.repeat(64),versionNumber:1,policyKey:'COUPLES_ACCOUNT_LINKING',locale:'fa-IR'}};


 let profile=false,status='PENDING',starts=0,scopeChecks=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname;
  const headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};
  const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,x-marriage-request-id'}});
  if(p==='/v1/auth/refresh')return send({accessToken:'test',expiresIn:600,user:{id:publication,roles:['PATIENT']}});
  if(p==='/v1/patients/me/entry/profile'){profile=true;return send({required:true,phase:'ASSESSMENT',assessmentRequired:true});}
  if(p==='/v1/patients/me/entry')return send({required:true,phase:profile?'ASSESSMENT':'PROFILE',assessmentRequired:true,firstName:'آزمایش',lastName:'کاربر',gender:'FEMALE',birthDate:'1990-01-01',assessmentTitle:'آزمون عمومی',introduction:'آزمون عمومی هنوز انجام نشده است.'});
  if(p.endsWith('/entry/start')){starts++;return send({});}
  if(p.includes('marriage-requests')){
   assert(req.headers()['x-marriage-request-id']===id,'missing invitation header');scopeChecks++;
   if(p.endsWith('/accept'))status='ACCEPTED';
   return send({id,status,isInitiator:false,ownEligible:profile,ownRole:'SECOND',service:settings,invitationPath:`/assessment/marriage/requests/${id}`,educationalId:replacement,continuation:{profileRequired:!profile,nextPath:!profile?`/welcome?marriageRequestId=${id}`:status==='ACCEPTED'?`/assessment/couples/educational/${replacement}?marriageRequestId=${id}`:`/assessment/marriage/requests/${id}`}});
  }
  if(p.includes('educational-couple-assessments'))return send({id:replacement,title:'خدمت اختصاصی',priceMode:'PAID',amountRial:'100000',participants:[{isSelf:true,slot:'SECOND',consentState:'ACCEPTED'}],contextHash:'a'.repeat(64),ownPendingIntentId:replacement,processingPolicy:settings.linkingPolicy,disclosurePolicy:settings.linkingPolicy});
  if(p.includes('/billing/intents/')){assert(req.headers()['x-marriage-request-id']===id,'lost bank-return context');scopeChecks++;return send({id:replacement,purpose:'ASSESSMENT',status:'PAID',amountRial:'100000',methods:[],attempts:[],refunds:[]});}
  return send({});
 });
 await page.goto(`http://127.0.0.1:3017/assessment/marriage/requests/${id}`);
 await page.getByRole('link',{name:'تکمیل مشخصات و ادامه',exact:true}).click();
 await page.getByRole('button',{name:'ثبت و ادامه به آزمون',exact:true}).click();
 await page.getByRole('heading',{name:'پذیرش نقش و دعوت'}).waitFor();
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'پذیرش دعوت و ادامه',exact:true}).click();
 await page.getByRole('link',{name:'ادامهٔ پرداخت',exact:true}).click();
 await page.getByRole('heading',{name:'پرداخت',exact:true}).waitFor();
 await page.goto(`http://127.0.0.1:3017/profile/wallet/payment-result?intentId=${replacement}`);
 await page.getByRole('button',{name:'ادامه خدمت دعوت‌شده'}).waitFor();
 assert(scopeChecks>=3,'context checks not exercised');assert(starts===0,'general entry started');assert(errors.length===0,JSON.stringify(errors));
 await page.goto('http://127.0.0.1:3017/');await page.getByRole('button',{name:'ادامه و شروع آزمون',exact:true}).waitFor();assert(starts===0,'entry auto-started');
 return {PASS:true,scopeChecks,starts};
}