import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const id='81111111-1111-4111-8111-111111111111';
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let deferred=false,resumed=0;
 const state=()=>({required:!deferred,assessmentRequired:true,phase:deferred?'COMPLETE':'PAYMENT',reminder:deferred,amountRial:'100000',allowDeferral:true,intentId:null,assessmentVersionId:id,assessmentTitle:'آزمون آغاز همراهی',introduction:'توضیحات اختصاصی آزمون پیش از پرداخت',submissionId:null});
 await page.route('**/v1/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'http://localhost:3001','access-control-allow-credentials':'true'};const send=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
  if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,roles:['PATIENT']}});
  if(path==='/v1/patients/me/entry')return send(state());
  if(path==='/v1/patients/me/entry/defer'){deferred=true;return send(state());}
  if(path==='/v1/patients/me/entry/resume'){deferred=false;resumed++;return send(state());}
  if(path==='/v1/patients/me/journey')return send({code:'SYNTHETIC_UNAVAILABLE'},503);
  return send({items:[],total:0,page:1,pageSize:20});
 });
 await page.goto('http://localhost:3001/welcome');await page.getByRole('button',{name:'ادامه به پرداخت',exact:true}).waitFor();await page.getByText('توضیحات اختصاصی آزمون پیش از پرداخت',{exact:true}).waitFor();
 assert.equal(await page.getByRole('checkbox').count(),0);
 await page.getByRole('button',{name:'فعلاً رد می‌کنم و وارد خانه می‌شوم',exact:true}).click();await page.getByRole('heading',{name:'آزمون ورود اولیهٔ شما هنوز کامل نشده است'}).waitFor();
 await page.getByRole('button',{name:'ادامهٔ آزمون من',exact:true}).click();await page.getByRole('button',{name:'ادامه به پرداخت',exact:true}).waitFor();assert.equal(resumed,1);assert.deepEqual(errors,[]);
 console.log(`PASS entry payment introduction, no extra acceptance, defer/Home reminder/resume ${width}`);await page.close();
}}finally{await browser.close();}
