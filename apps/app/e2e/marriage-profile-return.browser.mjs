import {chromium} from '@playwright/test';
const base='http://127.0.0.1:3017',id='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:375,height:812}});let patches=0,settingsReads=0;
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/v1/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname;const headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
if(p==='/v1/auth/refresh')return send({accessToken:'fixture',expiresIn:600,user:{id,roles:['PATIENT']}});
if(p.endsWith('/entry'))return send({required:false});
if(p==='/v1/patients/me'){if(req.method()==='PATCH')patches++;return send({firstName:'آزمایش',lastName:'کاربر',gender:'MALE',phone:'09120000000'});}
if(p.includes('/settings/')){settingsReads++;return send({title:'خدمت آزمایشی',amountRial:'100000',eligibleRoles:[],definition:{roles:[]}});}
return send({items:[],total:0});});
try {for(const suffix of ['', '?replaceRequestId='+id]){const destination='/assessment/marriage/new/'+id+suffix;
await page.goto(base+destination);await page.getByRole('link',{name:'تکمیل مشخصات و بازگشت به دعوت'}).click();await page.getByRole('button',{name:'بدون تغییر',exact:true}).waitFor();await page.screenshot({path:'.local/mz13-profile-before.png'});
await page.getByRole('button',{name:'بازگشت',exact:true}).click();await page.waitForURL(base+destination);
await page.getByRole('link',{name:'تکمیل مشخصات و بازگشت به دعوت'}).click();await page.getByRole('button',{name:'تغییر نام',exact:true}).click();await page.locator('#firstName').fill('نام جدید');await page.getByRole('button',{name:'ذخیره تغییرات',exact:true}).click();await page.waitForURL(base+destination);await page.screenshot({path:'.local/mz13-profile-after.png'});
}
if(patches!==2||settingsReads<4||errors.length)throw new Error(JSON.stringify({patches,settingsReads,errors}));console.log(JSON.stringify({PASS:true,patches,settingsReads,errors}));}finally{await browser.close();}
