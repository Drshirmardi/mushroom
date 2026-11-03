// Scoped UI fixtures only: all API calls are intercepted; no real SMS or payment.
// PATIENT_APP_TEST_URL selects a local app; AXE_SOURCE optionally uses a local axe bundle.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const baseUrl = process.env.PATIENT_APP_TEST_URL || 'http://localhost:3001';
if (!['localhost','127.0.0.1'].includes(new URL(baseUrl).hostname)) throw new Error('Local test app required');
const axeAsset = process.env.AXE_SOURCE ? {path:process.env.AXE_SOURCE} : {url:'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js'};
await mkdir('.local',{recursive:true});
const scenarios = [
{ name: 'assessment', run: async page => {
 const id='11111111-1111-4111-8111-111111111111';
 const assert=(condition,message)=>{if(!condition)throw new Error(message);};
 const long='وقتی در شرایط متفاوت قرار می‌گیرید، کدام توصیف به تجربه شما نزدیک‌تر است؟ '.repeat(3);
 const option='این گزینه برای بررسی خوانایی متن بلند و فضای کافی هنگام انتخاب پاسخ نوشته شده است. '.repeat(3);
 const questions=[{id:'q1',type:'SINGLE_CHOICE',text:long,required:true,options:[{id:'a',label:option},{id:'b',label:'گزینه دوم با توضیح کوتاه‌تر'},{id:'c',label:'گزینه سوم'}]}, {id:'q2',type:'MULTIPLE_CHOICE',text:'دو پاسخ مرتبط را انتخاب کنید.',required:true,options:[{id:'a',label:'پاسخ اول'},{id:'b',label:'پاسخ دوم'}]}, {id:'q3',type:'BOOLEAN',text:'آیا این توضیح به شما نزدیک است؟',required:true}, {id:'q4',type:'NUMBER',text:'یک مقدار معتبر وارد کنید.',required:true,min:1,max:120}, {id:'q5',type:'TEXT',text:'تجربه خود را کوتاه بنویسید.',required:true}];
 let answers={},revision=1,phase='ASSESSMENT',required=true,puts=0,submits=0;
 const dimensions=['دموی با عنوان نسبتاً بلند','صفراوی','بلغمی','سوداوی'].map((title,i)=>({id:'d'+i,title}));
 const snapshot={algorithmId:'DIMENSION_TIEBREAK',status:'PAIR',primary:'d0',secondary:'d1',scores:{d0:4,d1:3,d2:3,d3:0},dimensionTitles:dimensions,profile:{title:'الگوی ثبت‌شده',summary:'این نتیجه برای بررسی نمایش رابط است.'}};
 const attempt=()=>({id,assessmentVersionId:id,attemptNumber:1,revision,state:phase==='RESULT'?'COMPLETE':'IN_PROGRESS',answers,resultSnapshot:snapshot});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};
  const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
  if(p==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,roles:['PATIENT']}});
  if(p==='/v1/patients/me/entry')return send({required,phase,assessmentRequired:true,submissionId:id,assessmentTitle:'آزمون خوانایی و پاسخ‌گویی'});
  if(p.endsWith('/questionnaire'))return send({id,assessmentKey:'OTHER',title:'آزمون خوانایی و پاسخ‌گویی',resumeAvailable:true,structure:{schemaVersion:1,sections:[{id:'main',questions}]}});
  if(p==='/v1/assessment-submissions/'+id && req.method()==='PUT'){
   const body=req.postDataJSON();assert(body.expectedRevision===revision,'wrong revision');answers=body.answers;revision++;puts++;await new Promise(resolve=>setTimeout(resolve,100));return send(attempt());
  }
  if(p.endsWith('/submit')){submits++;phase='RESULT';return send(attempt());}
  if(p==='/v1/assessment-submissions/'+id || p.endsWith('/result'))return send(attempt());
  return send({status:'UNAVAILABLE',items:[],content:[],services:[]});
 });

 const audit=async()=>{await page.addScriptTag(axeAsset);const violations=await page.evaluate(async()=>{const r=await window.axe.run();return r.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert(!violations.length,JSON.stringify(violations));};
 const widths=[320,375,414,768,1024,1280,1440];
 for(const width of widths){
  await page.setViewportSize({width,height:812});await page.goto(baseUrl+'/welcome');
  await page.getByRole('heading',{name:long,exact:true}).waitFor();
  assert(await page.locator('.entry-progress').count()===0,'entry stepper still visible');
  assert(await page.locator('button[aria-pressed]').count()===3,'missing options');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);
  assert(await page.locator('.entry-card--quiz').evaluate(el=>getComputedStyle(el).borderTopWidth)==='0px','outer quiz frame remains');
  await page.getByRole('button',{name:'ذخیره و ادامه',exact:true}).click();await page.locator('#assessment-answer-error').waitFor();
  await page.getByRole('button',{name:/الف.*این گزینه/}).click();
  assert(await page.locator('button[aria-pressed=true]').count()===1,'selection unclear');
  await audit();
  if(width===375||width===1440)await page.screenshot({path:`.local/mz11-quiz-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:375,height:812});
 await page.getByRole('button',{name:'ذخیره و ادامه',exact:true}).dblclick();
 await page.getByRole('heading',{name:'دو پاسخ مرتبط را انتخاب کنید.'}).waitFor();assert(puts===1,'double save');
 await page.getByRole('button',{name:/الف.*پاسخ اول/}).click();await page.getByRole('button',{name:/ب.*پاسخ دوم/}).click();
 await page.getByRole('button',{name:'سؤال قبل',exact:true}).click();await page.getByRole('heading',{name:long,exact:true}).waitFor();assert(await page.locator('button[aria-pressed=true]').count()===1,'previous selection lost');
 await page.getByRole('button',{name:'ذخیره و ادامه',exact:true}).click();await page.getByRole('heading',{name:'دو پاسخ مرتبط را انتخاب کنید.'}).waitFor();assert(await page.locator('button[aria-pressed=true]').count()===2,'multiple choices lost');
 await page.getByRole('button',{name:'ذخیره و ادامه',exact:true}).click();await page.getByRole('button',{name:/ب.*خیر/}).click();await page.getByRole('button',{name:'ذخیره و ادامه',exact:true}).click();
 await page.getByRole('spinbutton').fill('19');await page.getByRole('button',{name:'ذخیره و ادامه',exact:true}).click();
 await page.getByRole('textbox').fill('پاسخ آزمایشی با متن فارسی و خط دوم.\nاین متن ذخیره می‌شود.');await page.setViewportSize({width:375,height:440});
 await page.getByRole('button',{name:'ثبت نهایی و مشاهده نتیجه',exact:true}).click();
 await page.getByText('ترکیب گرایش‌های شما',{exact:true}).waitFor();assert(submits===1,'duplicate final submission');assert(answers.q3===false && answers.q4===19 && answers.q2.length===2,'input types changed');
 for(const width of widths){await page.setViewportSize({width,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'result overflow '+width);}
 await audit();assert(await page.getByText('۰٫۰٪',{exact:true}).count()===1,'zero dimension hidden');
 await page.screenshot({path:'.local/mz11-result-mobile.png',fullPage:true});
 // Standard paid/individual attempt still saves and exits into its own service context.
 phase='ASSESSMENT';required=false;answers={};revision=1;
 await page.goto(baseUrl+'/assessment/resume?submissionId='+id);
 await page.getByRole('heading',{name:long,exact:true}).waitFor();await page.getByRole('button',{name:/ب.*گزینه دوم/}).click();await page.getByRole('button',{name:'ذخیره و خروج',exact:true}).click();await page.waitForURL('**/assessment');assert(answers.q1==='b','save/exit lost answer');
 await page.goto(baseUrl+'/assessment/resume?submissionId='+id);await page.getByRole('heading',{name:'دو پاسخ مرتبط را انتخاب کنید.'}).waitFor();
 assert(errors.length===0,JSON.stringify(errors));return {PASS:true,widths,axeCriticalSerious:0,puts,submits,types:5};
} },
{ name: 'result', run: async page => {
 const id='11111111-1111-4111-8111-111111111111';let zero=false;
 const dimensions=['عنوان بسیار بلند برای گرایش دموی بدون بریدگی','صفراوی','بلغمی','سوداوی'].map((title,i)=>({id:'d'+i,title}));
 await page.route('**/v1/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};
 const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
 if(p==='/v1/auth/refresh')return send({accessToken:'test',expiresIn:600,user:{id,roles:['PATIENT']}});
 if(p==='/v1/patients/me/entry')return send({required:true,phase:'RESULT',assessmentRequired:true,submissionId:id});
 if(p.endsWith('/result'))return send({id,resultSnapshot:{algorithmId:'DIMENSION_TIEBREAK',status:'PAIR',primary:'d0',secondary:'d1',scores:zero?{d0:0,d1:0,d2:0,d3:0}:{d0:4,d1:3,d2:3,d3:0},dimensionTitles:dimensions,profile:{title:'الگوی ثبت‌شده',summary:'نمایش نتیجهٔ همین پاسخ‌ها'}}});
 return send({status:'UNAVAILABLE',items:[],content:[],services:[]});});
 for(const width of [375,1440]){
  await page.setViewportSize({width,height:812});await page.goto(baseUrl+'/welcome');await page.getByText('ترکیب گرایش‌های شما',{exact:true}).waitFor();
  await page.addScriptTag(axeAsset);
  const violations=await page.evaluate(async()=>{const r=await window.axe.run();return r.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>v.id);});if(violations.length)throw new Error(JSON.stringify(violations));
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw new Error('result overflow');
  await page.screenshot({path:`.local/mz11-result-${width}.png`,fullPage:true});
 }
 zero=true;await page.reload();await page.getByText('پاسخ مؤثر کافی برای نمایش درصد گرایش‌ها ثبت نشده است.',{exact:true}).waitFor();if(await page.locator('figure').count())throw new Error('fabricated chart');
 return {PASS:true,widths:[375,1440],zeroChartAbsent:true,axeCriticalSerious:0};
} },
{ name: 'consent', run: async (page) => {
 const publication='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',replacement='33333333-3333-4333-8333-333333333333';
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const definition={version:1,purpose:'MARRIAGE',roles:[{id:'FIRST',title:'آقا',genders:['MALE'],minimumAgeYears:18},{id:'SECOND',title:'خانم',genders:['FEMALE'],minimumAgeYears:18}],genericJointText:'تفسیر عمومی'};
 const settings={publicationId:publication,title:'شناخت پیش از ازدواج',amountRial:'100000',definition,eligibleRoles:['FIRST'],linkingPolicy:{id:publication,title:'اتصال حساب‌ها',body:'شرایط اتصال برای همین خدمت',contentHash:'a'.repeat(64),versionNumber:1,policyKey:'COUPLES_ACCOUNT_LINKING',locale:'fa-IR'}};



 settings.linkingPolicy.body=('شرایط مشارکت در همین خدمت باید پیش از پذیرش خوانده شود.\n\n').repeat(25);
 let reviews=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,x-marriage-request-id'}});
 if(p==='/v1/auth/refresh')return send({accessToken:'test',expiresIn:600,user:{id:publication,roles:['PATIENT']}});
 if(p==='/v1/patients/me/entry')return send({required:false});
 if(p.includes('/marriage-requests/settings/'))return send(settings);
 if(p.endsWith('/review'))reviews++;
 return send({id,status:'PENDING',isInitiator:false,ownEligible:true,ownRole:'SECOND',service:settings,invitationPath:`/assessment/marriage/requests/${id}`,continuation:{profileRequired:false,nextPath:`/assessment/marriage/requests/${id}`}});
 });
 await page.setViewportSize({width:375,height:812});await page.goto(`${baseUrl}/assessment/marriage/requests/${id}`);
 const accept=page.getByRole('button',{name:'پذیرش دعوت و ادامه',exact:true});await accept.waitFor();assert(!await accept.isEnabled(),'consent auto accepted');
 const region=page.getByRole('region',{name:'پذیرش نقش و دعوت'});const body=region.getByText(settings.linkingPolicy.body,{exact:true});assert(await body.evaluate(el=>getComputedStyle(el).maxHeight)==='none','nested consent scroller');
 await region.getByRole('checkbox').check();assert(await accept.isEnabled(),'consent not actionable');
 await page.addScriptTag(axeAsset);
 const violations=await page.evaluate(async()=>{const r=await window.axe.run();return r.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>v.id);});assert(!violations.length,JSON.stringify(violations));
 await accept.scrollIntoViewIfNeeded();const button=await accept.boundingBox(), nav=await page.getByRole('navigation',{name:'ناوبری اصلی'}).boundingBox();assert(button.y+button.height<=nav.y+1,'button under navigation');
 for(const width of [320,375,414,768,1024,1280,1440]){await page.setViewportSize({width,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'consent overflow '+width);}
 assert(reviews===1,'review loop');
 await page.setViewportSize({width:320,height:812});await page.goto(`${baseUrl}/assessment/marriage/new/${publication}`);
 const create=page.getByRole('button',{name:'ساخت دعوت و دریافت لینک',exact:true});await create.waitFor();
 const ownConsent=page.getByRole('region',{name:'شرایط اتصال حساب‌ها'});
 await ownConsent.getByText(settings.linkingPolicy.body,{exact:true}).waitFor();
 assert(await page.locator('details').count()===0,'required initiator consent hidden');
 assert(!await create.isEnabled(),'initiator consent auto accepted');
 await page.getByLabel('شماره همراه شخص موردنظر').fill('09120000000');
 await ownConsent.getByRole('checkbox').check();assert(await create.isEnabled(),'initiator consent not actionable');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'initiator consent overflow');
 assert(errors.length===0,JSON.stringify(errors));return {PASS:true,reviews,initiatorConsentVisible:true,axeCriticalSerious:0};
} },
{ name: 'zoom', run: async page => {
 const id='11111111-1111-4111-8111-111111111111';
 const assert=(condition,message)=>{if(!condition)throw new Error(message);};
 const long='وقتی در شرایط متفاوت قرار می‌گیرید، کدام توصیف به تجربه شما نزدیک‌تر است؟ '.repeat(3);
 const option='این گزینه برای بررسی خوانایی متن بلند و فضای کافی هنگام انتخاب پاسخ نوشته شده است. '.repeat(3);
 const questions=[{id:'q1',type:'SINGLE_CHOICE',text:long,required:true,options:[{id:'a',label:option},{id:'b',label:'گزینه دوم با توضیح کوتاه‌تر'},{id:'c',label:'گزینه سوم'}]}, {id:'q2',type:'MULTIPLE_CHOICE',text:'دو پاسخ مرتبط را انتخاب کنید.',required:true,options:[{id:'a',label:'پاسخ اول'},{id:'b',label:'پاسخ دوم'}]}, {id:'q3',type:'BOOLEAN',text:'آیا این توضیح به شما نزدیک است؟',required:true}, {id:'q4',type:'NUMBER',text:'یک مقدار معتبر وارد کنید.',required:true,min:1,max:120}, {id:'q5',type:'TEXT',text:'تجربه خود را کوتاه بنویسید.',required:true}];
 let answers={},revision=1,phase='ASSESSMENT',required=true,puts=0,submits=0;
 const dimensions=['دموی با عنوان نسبتاً بلند','صفراوی','بلغمی','سوداوی'].map((title,i)=>({id:'d'+i,title}));
 const snapshot={algorithmId:'DIMENSION_TIEBREAK',status:'PAIR',primary:'d0',secondary:'d1',scores:{d0:4,d1:3,d2:3,d3:0},dimensionTitles:dimensions,profile:{title:'الگوی ثبت‌شده',summary:'این نتیجه برای بررسی نمایش رابط است.'}};
 const attempt=()=>({id,assessmentVersionId:id,attemptNumber:1,revision,state:phase==='RESULT'?'COMPLETE':'IN_PROGRESS',answers,resultSnapshot:snapshot});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};
  const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
  if(p==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,roles:['PATIENT']}});
  if(p==='/v1/patients/me/entry')return send({required,phase,assessmentRequired:true,submissionId:id,assessmentTitle:'آزمون خوانایی و پاسخ‌گویی'});
  if(p.endsWith('/questionnaire'))return send({id,assessmentKey:'OTHER',title:'آزمون خوانایی و پاسخ‌گویی',resumeAvailable:true,structure:{schemaVersion:1,sections:[{id:'main',questions}]}});
  if(p==='/v1/assessment-submissions/'+id && req.method()==='PUT'){
   const body=req.postDataJSON();assert(body.expectedRevision===revision,'wrong revision');answers=body.answers;revision++;puts++;await new Promise(resolve=>setTimeout(resolve,100));return send(attempt());
  }
  if(p.endsWith('/submit')){submits++;phase='RESULT';return send(attempt());}
  if(p==='/v1/assessment-submissions/'+id || p.endsWith('/result'))return send(attempt());
  return send({status:'UNAVAILABLE',items:[],content:[],services:[]});
 });

 const audit=async()=>{await page.addScriptTag(axeAsset);const violations=await page.evaluate(async()=>{const r=await window.axe.run();return r.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert(!violations.length,JSON.stringify(violations));};

 required=false;
 await page.setViewportSize({width:320,height:812});await page.goto(baseUrl+'/assessment/resume?submissionId='+id);await page.getByRole('heading',{name:long,exact:true}).waitFor();
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'zoom overflow');
 await page.getByRole('button',{name:/ب.*گزینه دوم/}).click();await page.getByRole('button',{name:'ذخیره و ادامه',exact:true}).click();
 const heading=page.getByRole('heading',{name:'دو پاسخ مرتبط را انتخاب کنید.'});await heading.waitFor();
 const rect=await heading.boundingBox(),nav=await page.getByRole('navigation',{name:'ناوبری اصلی'}).boundingBox();assert(rect.y>=0&&rect.y+rect.height<nav.y,'focused question obscured');
 await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement.tagName)==='BUTTON','keyboard focus order');
 assert(errors.length===0,JSON.stringify(errors));return {PASS:true,textScale:'200%',questionFocusVisible:true};
} }
];
if (process.env.UX_SCENARIO && !scenarios.some(item => item.name === process.env.UX_SCENARIO)) throw new Error('Unknown UX_SCENARIO');
const browser = await chromium.launch();
try {
 for (const scenario of scenarios.filter(item => !process.env.UX_SCENARIO || item.name === process.env.UX_SCENARIO)) {
  const page = await browser.newPage(); const consoleErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  try {const result=await scenario.run(page);if(consoleErrors.length)throw new Error(JSON.stringify(consoleErrors));console.log(JSON.stringify({scenario:scenario.name,...result}));}
  finally {await page.close();}
 }
} finally { await browser.close(); }
