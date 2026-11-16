import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch(),id='81111111-1111-4111-8111-111111111111';
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'http://localhost:3001','access-control-allow-credentials':'true'};const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
 if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,phone:'+989000000000',roles:['PATIENT']}});
 if(path==='/v1/patients/me/commerce/addresses')return send([]);
 if(path==='/v1/patients/me/entry')return send({required:false});
 if(path==='/v1/patients/me')return send({id,userId:id,firstName:'آزمایشی',lastName:'کاربر',phone:'+989000000000',accountStatus:'ACTIVE',gender:'FEMALE'});
 if(path==='/v1/patients/me/onboarding-status')return send({isComplete:false,requiredCount:10,answeredRequiredCount:0,completionPercent:0});
 if(path==='/v1/patients/me/mezaj')return send({id,assessmentSubmissionId:id,assessmentVersionId:id,resultBand:{id:'pair',title:'گرایش معتبر ثبت‌شده'},assessedAt:'2026-10-31T00:00:00Z'});
 return send({items:[],total:0,page:1,pageSize:20});
 });
 await page.goto('http://localhost:3001/profile');await page.getByText('گرایش معتبر ثبت‌شده',{exact:true}).waitFor();await page.getByRole('button',{name:'مشاهدهٔ نتیجهٔ آزمون',exact:true}).waitFor();assert.deepEqual(errors,[]);
 console.log(`PASS profile displays latest valid Mizaj and result action ${width}`);await page.close();
}}finally{await browser.close();}
