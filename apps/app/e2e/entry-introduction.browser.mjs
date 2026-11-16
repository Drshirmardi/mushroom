import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const id='81111111-1111-4111-8111-111111111111';
const introduction='این متن اختصاصی مدیر است.\nابتدا توضیحات را بخوانید و سپس ادامه دهید. <b>متن ساده</b>';
try {
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}});let starts=0;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=()=>({required:true,assessmentRequired:true,phase:starts?'UNAVAILABLE':'ASSESSMENT',assessmentVersionId:id,assessmentTitle:'آزمون ورود اولیه',submissionId:null,introduction});
  await page.route('**/v1/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'http://localhost:3001','access-control-allow-credentials':'true'};
   const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
   if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',expiresIn:600,user:{id,roles:['PATIENT']}});
   if(path==='/v1/patients/me/entry')return send(state());
   if(path==='/v1/patients/me/entry/start'){starts++;return send(state());}
   return send({});
  });
  await page.goto('http://localhost:3001/welcome');
  await page.getByText(introduction,{exact:true}).waitFor();assert.equal(starts,0);
  assert.equal(await page.locator('.entry-start b').count(),0);
  await page.getByRole('button',{name:'ادامه و شروع آزمون',exact:true}).click();
  await page.getByRole('heading',{name:'آزمون فعلاً در دسترس نیست'}).waitFor();assert.equal(starts,1);assert.deepEqual(errors,[]);
  console.log(`PASS custom introduction before explicit start, plain text and unavailable recovery ${width}`);await page.close();
 }
}finally{await browser.close();}
