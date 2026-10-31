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

const { projectTieBreakQuestionnaire, validateTieBreakAnswers } = require('../../api/dist/modules/assessments/domain/assessment-tiebreak-draft.js');
const browser=await chromium.launch();
try {for(const width of [320,390,1440]) {
 const page=await browser.newPage({viewport:{width,height:900}}); const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const main=Object.fromEntries(questions.map((q,index)=>[q.id,q.options[[0,0,0,0,1,1,2,2,3,3,0][index]].id]));
 let submission={id,assessmentVersionId:id,attemptNumber:1,revision:1,state:'IN_PROGRESS',answers:main};let submitted=0;
 await page.route('**/v1/**', async route=>{const req=route.request(),path=new URL(req.url()).pathname;const headers={'access-control-allow-origin':req.headers().origin || 'http://localhost:3001','access-control-allow-credentials':'true'};const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'}});
 if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,phone:'+989000000000',roles:['PATIENT']}});
 if(path==='/v1/patients/me/entry')return send({required:false});
 if(path.endsWith('/questionnaire'))return send({...version,submissionId:id,resumeAvailable:submission.state==='IN_PROGRESS',structure:projectTieBreakQuestionnaire(structure,submission.answers)});
 if(path.endsWith('/submit')){assert.ok(req.headers()['idempotency-key']);const result=previewTieBreakDraft(structure,submission.answers);assert.equal(result.status,'PAIR');submitted++;submission={...submission,state:'COMPLETE',resultSnapshot:{...result,dimensionTitles:structure.scoring.dimensions},score:null};return send(submission);}
 if(path==='/v1/assessment-submissions/'+id && req.method()==='PUT'){const body=req.postDataJSON();assert.equal(body.expectedRevision,submission.revision);validateTieBreakAnswers(structure,body.answers);submission={...submission,answers:body.answers,revision:submission.revision+1};return send(submission);}
 if(path==='/v1/assessment-submissions/'+id || path.endsWith('/result'))return send(submission);
 if(path.endsWith('/guidance'))return send({status:'UNAVAILABLE',content:[],services:[]});
 return send({items:[],total:0,unreadCount:0});});
 const url='http://localhost:3001/assessment/resume?submissionId='+id;
 await page.goto(url);await page.getByText('سؤال اول آزمایشی',{exact:true}).waitFor();
 await page.getByRole('button',{name:/ادامه به سؤال دوم/}).click();await page.getByRole('button',{name:'ثبت نهایی و مشاهده نتیجه',exact:true}).click();
 await page.getByText('سؤال دوم آزمایشی',{exact:true}).waitFor();assert.equal(submitted,0);
 await page.reload();await page.getByText('سؤال دوم آزمایشی',{exact:true}).waitFor();
 await page.getByRole('button',{name:'بازگشت',exact:true}).click();await page.getByText('سؤال اول آزمایشی',{exact:true}).waitFor();
 await page.getByRole('button',{name:/پاسخ قطعی اول/}).click();await page.getByRole('button',{name:'ذخیره و ادامه',exact:true}).click();
 await page.waitForURL('**/assessment/result?submissionId=*');await page.getByText('ترکیب گرایش‌های شما',{exact:true}).waitFor();assert.equal(submitted,1);assert.equal(submission.resultSnapshot.primary,ids[0]);assert.equal(submission.resultSnapshot.secondary,ids[1]);assert.equal(submission.answers.secondTie,undefined);
 assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'.local/mizaj-patient-'+width+'.png',fullPage:true});console.log('PASS patient dynamic follow-up, resume/back and early completion',width);await page.close();
}}finally{await browser.close();}
