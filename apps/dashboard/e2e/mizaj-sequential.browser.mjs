import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { MIZAJ_DRAFT_PRESET } = require('../../api/dist/modules/assessments/domain/mizaj-draft-preset.js');
const { previewTieBreakDraft } = require('../../api/dist/modules/assessments/domain/assessment-tiebreak-draft.js');
const structure = structuredClone(MIZAJ_DRAFT_PRESET.structure);
structure.schemaVersion = 3; structure.scoring.algorithmId = 'DIMENSION_TIEBREAK'; structure.scoring.algorithmVersion = 2; structure.scoring.minInformativeAnswers = 1;
const ids = structure.scoring.dimensions.map(item => item.id);
const questions = structure.sections.flatMap(section => section.questions);
questions.forEach(q => q.options.forEach((option,index) => option.scores = {[ids[index]]:1}));
questions[10].options[0].scores = {};
structure.followUps = [{id:'firstTie',title:'سؤال اول آزمایشی',tiedDimensions:ids.slice(1),options:[{id:'yes',title:'پاسخ قطعی اول',dimensionId:ids[1]},{id:'no',title:'ادامه به سؤال دوم',dimensionId:null}],steps:[{id:'secondTie',title:'سؤال دوم آزمایشی',tiedDimensions:ids.slice(2),options:[{id:'left',title:'پاسخ نهایی چپ',dimensionId:ids[2]},{id:'right',title:'پاسخ نهایی راست',dimensionId:ids[3]}]}]}];
const id = '11111111-1111-4111-8111-111111111111';
const version = {id, assessmentKey:'MIZAJ',locale:'fa-IR',versionNumber:1,status:'DRAFT',title:'آزمون مرحله‌ای آزمایشی',contentHash:'a'.repeat(64),structure};
const browser = await chromium.launch();
try {
for (const width of [390,1440]) {
 const page=await browser.newPage({viewport:{width,height:900}}); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/v1/**', async route => {const req=route.request(), path=new URL(req.url()).pathname; const headers={'access-control-allow-origin':req.headers().origin || 'http://localhost:3002','access-control-allow-credentials':'true'};
 const send=data=>route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
 if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,phone:'+989000000000',roles:['ADMIN']}});
 if(path.endsWith('/scoring-preview'))return send({...previewTieBreakDraft(structure,req.postDataJSON().answers),assessmentVersionId:id,questionnaireContentHash:version.contentHash});
 if(path==='/v1/admin/assessments/'+id)return send(version);
 if(path==='/v1/admin/assessments')return send({items:[version],total:1,page:1,pageSize:12});
 return send({items:[],total:0,unreadCount:0}); });
 await page.goto('http://localhost:3002/assessments');
 await page.getByRole('button',{name:'ویرایش و مدیریت',exact:true}).click();
 await page.getByRole('button',{name:'پیش‌نمایش',exact:true}).click();
 const selected=[0,0,0,0,1,1,2,2,3,3,0];
 for(let i=0;i<11;i++){await page.getByRole('radio').nth(selected[i]).check();if(i<10)await page.getByRole('dialog').getByRole('button',{name:'بعدی',exact:true}).click();}
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'بررسی ۱۱ پاسخ اصلی',exact:true}).click();
 await page.getByText('سؤال اول آزمایشی',{exact:true}).waitFor();
 await page.getByText('ادامه به سؤال دوم',{exact:true}).click();
 await page.getByRole('button',{name:'نتیجه‌گیری پس از سؤال تکمیلی'}).click();
 await page.getByText('سؤال دوم آزمایشی',{exact:true}).waitFor();
 await page.getByText('پاسخ نهایی راست',{exact:true}).click();
 await page.getByRole('button',{name:'نتیجه‌گیری پس از سؤال تکمیلی'}).click();
 await page.getByText('گرایش غالب و همراه مشخص‌اند',{exact:true}).waitFor();
 await page.getByText('ترکیب گرایش‌های شما',{exact:true}).waitFor();
 assert.deepEqual(errors,[]); await page.screenshot({path:'.local/mizaj-result-'+width+'.png',fullPage:true});
 console.log('PASS dashboard sequential preview and chart',width); await page.close();
}
} finally {await browser.close();}
