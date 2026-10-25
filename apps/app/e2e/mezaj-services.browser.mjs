import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('.local/mezaj-review',{recursive:true});
const id='11111111-1111-4111-8111-111111111111', grant='22222222-2222-4222-8222-222222222222';
const safety={intendedAudience:'عموم بزرگسالان',limitations:'محتوای آموزشی',contraindications:[],seekProfessionalCare:'در صورت نیاز به متخصص مراجعه کنید.'};
const def={id,programKey:'TEXT_TEST',locale:'fa-IR',versionNumber:1,kind:'READY_EDUCATION',title:'شناخت ویژگی‌های شخصیتی',summary:'راهنمای آموزشی برای شناخت بهتر الگوی پاسخ‌های شما',category:'شناخت خود',body:'متن کامل خریداری‌شده',safety,eligibilityDescription:'مطالعهٔ آموزشی',contentHash:'a'.repeat(64),status:'APPROVED',contentReferences:[]};
const card={programDefinitionId:id,publicationId:id,title:def.title,summary:def.summary,icon:'compass',amountRial:'500000',currency:'IRR',state:'BUY',accessGrantId:null,purchaseId:null};
const product={id,title:'محصول مرتبط آزمایشی',slug:'test',status:'ACTIVE',category:{id,name:'مراقبت',slug:'care',isActive:true},image:null,content:{status:'LEGACY_UNREVIEWED',contentRevision:0},skus:[{id,code:'TEST',title:null,currentPriceToman:'125000',currentTaxToman:'0',isActive:true,onHandQuantity:5,reservedQuantity:0}]};
const browser=await chromium.launch();
try {for(const width of [320,390,1440]){
 const context=await browser.newContext({viewport:{width,height:850}});const page=await context.newPage();const errors=[];let mode='result',conflict=true,saved=null,finished=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**',async route=>{
 const req=route.request(),url=new URL(req.url()),p=url.pathname;const origin=req.headers().origin??'http://localhost:3001';
 const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-methods':'GET,POST,PUT,PATCH,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
 if(p==='/v1/auth/refresh')return send({accessToken:'synthetic',tokenType:'Bearer',expiresIn:600,user:{id,phone:'+989000000000',roles:mode==='dashboard'?['ADMIN']:['PATIENT']}});
 if(p==='/v1/patients/me/entry')return send({required:mode==='welcome'&&!finished,phase:mode==='welcome'&&!finished?'RESULT':'COMPLETE',assessmentRequired:true,firstName:'سارا',lastName:'رضایی',gender:'FEMALE',birthDate:'1990-01-02',submissionId:id,assessmentTitle:'مزاج‌شناسی'});
 if(p==='/v1/patients/me/entry/complete'){finished=true;return send({});}
 if(p==='/v1/patients/me/program-recommendations'){assert.equal(url.searchParams.get('submissionId'),id);return send({status:'READY',primary:'damavi',secondary:'safravi',submissionId:id,items:[card,{...card,programDefinitionId:grant,title:'خدمت خریداری‌شده',state:'OWNED',accessGrantId:grant,purchaseId:grant}]});}
 if(p==='/v1/patients/me/commerce/recommendations'){assert.equal(url.searchParams.get('submissionId'),id);return send({status:'READY',primary:'damavi',secondary:'safravi',items:[product]});}
 if(p.includes('program-access-grants'))return send({id:grant,title:'خدمت خریداری‌شده',body:'متن کامل خریداری‌شده',safety,contentReferences:[],endsAt:null});
 if(p==='/v1/patients/me/program-library')return send({items:[{accessGrantId:grant,purchaseId:grant,title:def.title,icon:'compass',accessAvailable:true,endsAt:null}],total:1,page:1,pageSize:6});
 if(p==='/v1/patients/me/journey')return send({code:'UNAVAILABLE'},503);
 if(p.endsWith('/questionnaire'))return send({assessmentKey:'MIZAJ',title:'مزاج‌شناسی',versionNumber:1,structure:{}});
 if(p.endsWith('/result'))return send({resultSnapshot:{algorithmId:'DIMENSION_TIEBREAK',status:'PAIR',reviewState:'ADMIN_PUBLISHED',primary:'DAMAVI',secondary:'SAFRAVI',dimensionTitles:[{id:'DAMAVI',title:'دموی'},{id:'SAFRAVI',title:'صفراوی'}],profile:{title:'دموی و صفراوی',summary:'نتیجهٔ آموزشی شما',strengths:[],attentionPoints:[]}},completedAt:'2026-10-24T12:00:00Z'});
 if(p.endsWith('/provenance'))return send({provenanceStatus:'RECORDED'});
 if(p.endsWith('/guidance'))return send({status:'NOT_AVAILABLE',content:[],services:[]});
 if(p==='/v1/admin/program-definitions')return send({items:[def],total:1,page:1,pageSize:12});
 if(p.endsWith('/mezaj')){if(req.method()==='PUT'){saved=req.postDataJSON();if(conflict){conflict=false;return send({code:'PROGRAM_MEZAJ_CONFLICT'},409);}return send({programDefinitionId:id,revision:2,...saved});}return send({programDefinitionId:id,revision:1,enabled:true,icon:'compass',pairs:['damavi/safravi']});}
 if(p==='/v1/admin/guidance-content')return send({items:[],total:0,page:1,pageSize:50});
 return send({items:[],total:0,unreadCount:0});
 });
 await page.goto(`http://localhost:3001/assessment/result?submissionId=${id}`);await page.getByRole('heading',{name:'شناخت بیشتر از خودتان'}).waitFor();await page.getByText('محصول مرتبط آزمایشی',{exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'مطالعهٔ محتوا'}).getAttribute('href'),`/programs/content/${grant}`);assert.equal(await page.getByRole('link',{name:'جزئیات و خرید'}).getAttribute('href'),`/programs/offerings/${id}`);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.getByRole('heading',{name:'شناخت بیشتر از خودتان'}).scrollIntoViewIfNeeded();await page.screenshot({path:`.local/mezaj-review/result-${width}.png`,fullPage:true});
 await page.getByRole('link',{name:'مطالعهٔ محتوا'}).click();await page.getByText('متن کامل خریداری‌شده',{exact:true}).waitFor();
 mode='welcome';await page.goto('http://localhost:3001/welcome');await page.getByRole('link',{name:'مطالعهٔ محتوا'}).click();await page.waitForURL('**/programs/content/*');assert.equal(finished,true);
 mode='home';await page.goto('http://localhost:3001/');await page.getByRole('heading',{name:'خدمات من',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`.local/mezaj-review/home-${width}.png`,fullPage:true});
 mode='dashboard';await page.goto('http://localhost:3002/programs');await page.getByRole('button',{name:/شناخت ویژگی‌های شخصیتی/}).click();await page.getByRole('button',{name:'مزاج و نمایش',exact:true}).click();await page.getByText('پیشنهاد برای کدام مزاج‌ها؟',{exact:true}).waitFor();
 assert.equal(await page.locator('.program-pair-grid label').count(),16);await page.getByRole('button',{name:'ذخیرهٔ مزاج‌ها و آیکون'}).click();await page.getByText(/نوشته‌های شما حفظ شده/).waitFor();assert.deepEqual(saved.pairs,['damavi/safravi']);assert.equal(saved.icon,'compass');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`.local/mezaj-review/dashboard-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}: result/service/product, purchased read, welcome finish+navigation, Home library, dashboard16 pairs and conflict retention/no overflow`);
}}finally{await browser.close();}
