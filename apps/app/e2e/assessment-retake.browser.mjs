import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const id='81111111-1111-4111-8111-111111111111',grant='82222222-2222-4222-8222-222222222222',intent='83333333-3333-4333-8333-333333333333';
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];let purchases=0;page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'http://localhost:3001','access-control-allow-credentials':'true'};const send=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
 if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,phone:'+989000000000',roles:['PATIENT']}});
 if(path==='/v1/patients/me/entry')return send({required:false});
 if(path===`/v1/patients/me/educational-assessment-offerings/${id}`)return send({id,title:'آزمون خرید مجدد',kind:'INDIVIDUAL',priceMode:'PAID',amountRial:'100000',publicationHash:'a'.repeat(64),processingPolicy:{id,title:'پردازش',body:'متن پردازش',contentHash:'b'.repeat(64)},termsPolicy:{id:grant,title:'شرایط خرید',body:'شرایط',contentHash:'c'.repeat(64)},processingConsentId:id,termsConsentId:grant,accessGrantId:grant,submissionId:grant,accessSupported:true,publicPurchaseAvailable:true,pendingIntentId:null,blockers:[]});
 if(path==='/v1/patients/me/billing/assessment-intents'){purchases++;assert.ok(req.headers()['idempotency-key']);assert.equal(req.postDataJSON().publicationId,id);return send({id:intent},201);}
 if(path===`/v1/patients/me/billing/intents/${intent}`)return send({id:intent,purpose:'ASSESSMENT',status:'PENDING',amountRial:'100000',methods:[],attempts:[],refunds:[]});
 return send({items:[],total:0,page:1,pageSize:20});
 });
 await page.goto(`http://localhost:3001/assessment/educational/${id}`);await page.getByRole('button',{name:'باز کردن آزمون من',exact:true}).waitFor();assert.equal(purchases,0);
 await page.getByRole('button',{name:'خرید و انجام دوبارهٔ آزمون',exact:true}).click();await page.getByRole('button',{name:'ثبت رضایت و ادامه به پرداخت',exact:true}).click();await page.waitForURL(`**/profile/wallet/pay?intentId=${intent}`);assert.equal(purchases,1);assert.deepEqual(errors,[]);
 console.log(`PASS completed result retained and explicit new paid attempt ${width}`);await page.close();
}}finally{await browser.close();}
