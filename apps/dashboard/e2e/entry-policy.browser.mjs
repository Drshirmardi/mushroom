import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const id='81111111-1111-4111-8111-111111111111';
try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let saves=0;
 let policy={enabled:true,assessmentVersionId:id,assessmentTitle:'آزمون ورود',introduction:'معرفی اولیه',amountRial:'0',allowDeferral:false,revision:1,enforcedFrom:'2026-10-01T00:00:00Z'};
 await page.route('**/v1/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'http://localhost:3002','access-control-allow-credentials':'true'};const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,PUT,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
  if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,phone:'+989000000000',roles:['ADMIN']}});
  if(path==='/v1/admin/assessment-entry-policy'){if(req.method()==='PUT'){const body=req.postDataJSON();assert.equal(body.amountRial,'100000');assert.equal(body.allowDeferral,true);assert.equal(body.introduction,'متن اختصاصی پیش از شروع');policy={...policy,...body,revision:policy.revision+1};saves++;}return send(policy);}
  if(path==='/v1/admin/assessments')return send({items:[{id,title:'آزمون ورود',assessmentKey:'ENTRY',status:'PUBLISHED',versionNumber:1,locale:'fa-IR',contentHash:'a'.repeat(64),structure:{schemaVersion:1,sections:[]}}],total:1,page:1,pageSize:20});
  return send({items:[],total:0,page:1,pageSize:20,unreadCount:0});
 });
 await page.goto('http://localhost:3002/assessments');await page.getByRole('button',{name:'ورود اولیه',exact:true}).click();
 const amount=page.getByLabel('مبلغ ورود اولیه به ریال؛ صفر یعنی رایگان',{exact:true});await amount.fill('100000');await page.getByRole('checkbox',{name:'کاربر بتواند پرداخت و آزمون را فعلاً رد کند و وارد خانه شود',exact:true}).check();await page.getByLabel(/متن معرفی آزمون الزامی/).fill('متن اختصاصی پیش از شروع');
 await page.getByRole('button',{name:'ذخیرهٔ تنظیمات',exact:true}).click();await page.getByText('تنظیمات ورود اولیه ذخیره شد.',{exact:true}).waitFor();assert.equal(saves,1);assert.deepEqual(errors,[]);
 console.log(`PASS entry price/introduction/optional deferral admin save ${width}`);await page.close();
}}finally{await browser.close();}
