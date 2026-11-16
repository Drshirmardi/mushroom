// Local intercepted API verification only; no real invitation, consent, SMS or payment.
import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:375,height:812}});
const id='11111111-1111-4111-8111-111111111111',base=process.env.APP_TEST_URL||'http://127.0.0.1:3017',mask='09•••••7750';let receiver=false,mutations=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
const policy={id,title:'شرایط آزمون',body:'شرایط بلند همین آزمون برای مطالعه و ثبت رضایت آگاهانه. '.repeat(300),contentHash:'a'.repeat(64)};
const termsPolicy={...policy,title:'شرایط خرید آزمون',body:'متن شرایط خرید همین نسخه.'};
const widths=[320,375,414,768,1024,1280,1440];
async function checkWidths(label){for(const width of widths){await page.setViewportSize({width,height:812});if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error(label+' overflow '+width);}}
const request={id,createdAt:'2026-11-01T10:00:00Z',recipientPhoneMasked:mask,status:'PENDING',isInitiator:true,ownEligible:true,ownRole:'FIRST',service:{title:'شناخت پیش از ازدواج',amountRial:'100000',definition:{roles:[{id:'FIRST',title:'آقا',genders:['MALE'],minimumAgeYears:18}]},linkingPolicy:policy},invitationPath:'/assessment/marriage/requests/'+id};
await page.route('**/v1/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};const send=data=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,x-marriage-request-id'}});
if(p==='/v1/auth/refresh')return send({accessToken:'fixture',expiresIn:3600,user:{id,roles:['PATIENT']}});if(p.endsWith('/entry'))return send({required:false});
if(p.endsWith('/review'))return send({...request,isInitiator:false,recipientPhoneMasked:null});
if(req.method()!=='GET'){mutations++;throw Error('Unexpected mutation '+p);}
if(p.includes('/educational-assessment-offerings/'))return send({id,title:'آزمون خریداری‌شده',priceMode:'PAID',amountRial:'100000',accessSupported:true,publicPurchaseAvailable:true,accessGrantId:id,processingConsentId:id,termsConsentId:id,processingPolicy:policy,termsPolicy,blockers:[]});
if(p.endsWith('/marriage-requests'))return send({items:[request],total:1});
if(p.includes('/marriage-requests/'))return send(receiver?{...request,status:'ACCEPTED',isInitiator:false,recipientPhoneMasked:null}:request);
return send({items:[],total:0});});
try {
await page.goto(base+'/assessment/marriage');const invites=page.getByRole('region',{name:'تست‌ها و دعوت‌های من'});await invites.getByText(mask,{exact:true}).waitFor();await invites.getByRole('link',{name:/شناخت پیش از ازدواج/}).click();await page.getByText('شماره نفر دوم',{exact:true}).waitFor();await checkWidths('invitation');await page.setViewportSize({width:375,height:812});await page.screenshot({path:'.local/mz16-invitation.png'});
receiver=true;await page.reload();await page.getByText('دعوت پذیرفته شد',{exact:true}).first().waitFor();await expect(page.getByText(mask,{exact:true})).toHaveCount(0);
await page.goto(base+'/assessment/educational/'+id);await expect(page.getByText('رضایت این شرایط قبلاً ثبت شده است.',{exact:true})).toHaveCount(2);await expect(page.getByRole('checkbox')).toHaveCount(0);
for(const width of [320,375,414,768,1024,1280,1440]){await page.setViewportSize({width,height:812});if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('historical overflow '+width);}
await page.setViewportSize({width:375,height:812});await page.screenshot({path:'.local/mz16-historical.png'});await page.getByRole('button',{name:'خرید و انجام دوبارهٔ آزمون',exact:true}).click();await expect(page.getByRole('checkbox')).toHaveCount(1);await expect(page.getByRole('checkbox')).not.toBeChecked();await checkWidths('new consent');await expect(page.getByRole('button',{name:'ثبت رضایت و ادامه به پرداخت'})).toBeDisabled();
await page.setViewportSize({width:320,height:600});
const trigger=page.getByRole('button',{name:'شرایط و قوانین',exact:true});
await trigger.click();
const sheet=page.getByRole('dialog',{name:'قوانین و شرایط'});
await expect(sheet.getByRole('heading',{name:policy.title,exact:true})).toBeVisible();
const termsHeading=sheet.getByRole('heading',{name:termsPolicy.title,exact:true});
await termsHeading.scrollIntoViewIfNeeded();
await expect(termsHeading).toBeInViewport();
const close=sheet.getByRole('button',{name:'متوجه شدم'});
const closeBounds=await close.boundingBox();
if(!closeBounds||closeBounds.y+closeBounds.height>600)throw Error('Sheet footer outside viewport');
await close.click();
await expect(sheet).toHaveCount(0);
await expect(trigger).toBeFocused();
await expect(page.getByRole('checkbox')).not.toBeChecked();
await page.getByRole('checkbox').check();await expect(page.getByRole('button',{name:'ثبت رضایت و ادامه به پرداخت'})).toBeEnabled();await page.getByRole('button',{name:'بازگشت به نتیجهٔ قبلی'}).click();await expect(page.getByRole('checkbox')).toHaveCount(0);await expect(page.getByText('رضایت این شرایط قبلاً ثبت شده است.',{exact:true})).toHaveCount(2);await page.reload();await expect(page.getByRole('checkbox')).toHaveCount(0);await page.getByRole('button',{name:'خرید و انجام دوبارهٔ آزمون'}).click();await expect(page.getByRole('checkbox').first()).not.toBeChecked();
await page.setViewportSize({width:320,height:812});await page.evaluate(()=>{const list=[...document.querySelectorAll('main *')].map(el=>[el,getComputedStyle(el).fontSize]);for(const [el,size] of list)el.style.fontSize=(parseFloat(size)*2)+'px';});if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('200% overflow');const back=page.getByRole('button',{name:'بازگشت به نتیجهٔ قبلی'});await back.scrollIntoViewIfNeeded();await back.focus();await page.keyboard.press('Tab');await page.screenshot({path:'.local/mz16-text-200.png'});
await page.addScriptTag({path:process.env.AXE_SOURCE||'node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.min.js'});const violations=await page.evaluate(async()=>{const r=await window.axe.run();return r.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>v.id);});if(violations.length||errors.length||mutations)throw Error(JSON.stringify({violations,errors,mutations}));console.log(JSON.stringify({PASS:true,widths:7,historyStable:true,newConsentUnchecked:true,mutations,axeCriticalSerious:0}));
}finally{await browser.close();}
