import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:375,height:812}});
const base='http://127.0.0.1:3017',id='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
let mode='full',writes=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
const request=(key,title)=>({id:key,service:{title},status:'PENDING',isInitiator:false,invitationPath:'/assessment/marriage/requests/'+key,createdAt:'2026-11-01T10:00:00Z'});
const attempt={id,title:'مزاج‌شناسی من',assessmentVersionId:id,state:'IN_PROGRESS',resumeAvailable:true,versionNumber:1,attemptNumber:1,marriageRequestId:second};
await page.route('**/v1/**',async route=>{
 const req=route.request(),url=new URL(req.url()),p=url.pathname,headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true'};
 const send=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,x-marriage-request-id'}});
 if(p.endsWith('/auth/refresh'))return send({accessToken:'fixture',expiresIn:3600,user:{id,roles:['PATIENT']}});
 if(req.method()!=='GET'){writes++;throw Error('Unexpected mutation');}
 if(p.endsWith('/entry'))return send({required:false});
 if(p.endsWith('/marriage-requests'))return send({items:mode==='empty'?[]:[request(id,'دعوت من'),request(second,'دعوت دوم')],total:mode==='empty'?0:2});
 if(p==='/v1/patients/me/assessment-submissions')return send({items:mode==='empty'?[]:url.searchParams.get('state')==='IN_PROGRESS'?[attempt]:[attempt,{...attempt,id:second,title:'نتیجه من',state:'COMPLETE',resumeAvailable:false}],total:mode==='empty'?0:url.searchParams.get('state')?1:2});
 if(p.endsWith('/educational-assessment-offerings')){
  if(mode==='error')return send({code:'UNAVAILABLE'},503);
  const couple=url.searchParams.get('kind')==='COUPLES';
  return send({items:mode==='empty'?[]:[{id:couple?second:id,title:mode==='long'?'عنوانطولانی'.repeat(18):couple?'شناخت پیش از ازدواج':'مزاج‌شناسی تازه',kind:couple?'COUPLES':'INDIVIDUAL',servicePurpose:couple?'MARRIAGE':null,priceMode:'PAID',amountRial:couple?'20000':'10001'}],total:mode==='empty'?0:1});
 }
 if(p.endsWith('/assessment-purchases'))return send({items:mode==='empty'?[]:[{id,title:'خرید من',amountRial:'30000',intent:{status:'CREATED'},grants:[]}],total:mode==='empty'?0:1});
 if(p.endsWith('/assessments'))return send({items:mode==='empty'?[]:[{id,assessmentKey:'OLD',locale:'fa-IR',title:'نسخه قدیمی',versionNumber:1}]});
 if(p.endsWith('/questionnaire'))return send({id,resumeAvailable:true,structure:{schemaVersion:1,sections:[{questions:[{id:'q',type:'TEXT',required:true,text:'سؤال من'}]}]}});
 if(p.includes('/assessment-submissions/'))return send({id,assessmentVersionId:id,answers:{},revision:1,state:'IN_PROGRESS'});
 return send({items:[],total:0});
});
try{
 await page.goto(base+'/assessment');await page.getByRole('link',{name:'بررسی دعوت',exact:true}).waitFor();
 await expect(page.getByRole('heading',{name:'تست‌ها',exact:true})).toBeVisible();
 await expect(page.getByText('پیگیری دعوت‌های ازدواج',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'ادامه',exact:true})).toHaveAttribute('href',`/assessment/resume?submissionId=${id}&marriageRequestId=${second}`);
 await expect(page.getByText('۱٬۰۰۰ تومان و ۱ ریال',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'۱ دعوت دیگر',exact:true}).click();await expect(page).toHaveURL(/section=incoming/);await page.getByRole('link',{name:/دعوت دوم/}).waitFor();
 await expect(page.getByRole('heading',{name:'دعوت من',exact:true})).toHaveCount(1);
 await page.getByRole('tab',{name:'تست جدید',exact:true}).click();await expect(page).toHaveURL(/view=start/);await page.goBack();await expect(page).toHaveURL(/section=incoming/);await expect(page.getByRole('tab',{name:'تست‌های من',exact:true})).toHaveAttribute('aria-selected','true');
 await page.goto(base+'/assessment?view=purchases');await page.getByRole('link',{name:/خرید من/}).waitFor();
 await page.getByRole('heading',{name:'نتیجه من',exact:true}).waitFor();
 await expect(page.getByRole('link',{name:'مشاهده نتیجه',exact:true})).toHaveAttribute('href',`/assessment/result?submissionId=${second}&marriageRequestId=${second}`);
 for(const width of [320,375,414,768,1024,1280,1440]){await page.setViewportSize({width,height:812});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:375,height:812});await page.goto(base+'/assessment');await page.getByRole('link',{name:/مزاج‌شناسی تازه/}).waitFor();await page.getByText('سایر تست‌ها و نسخه‌ها',{exact:true}).click();await page.getByText('نسخه قدیمی',{exact:true}).click();await expect(page.getByRole('link',{name:'شروع تست',exact:true})).toHaveAttribute('href','/assessment/'+id);await page.getByText('سایر تست‌ها و نسخه‌ها',{exact:true}).click();await page.screenshot({path:'.local/ah02-new.png'});
 await page.getByRole('tab',{name:'تست‌های من',exact:true}).click();await page.getByRole('heading',{name:'نتیجه من'}).waitFor();await page.screenshot({path:'.local/ah02-mine.png'});
 await page.getByRole('tab',{name:'تست‌های من',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'تست جدید',exact:true})).toHaveAttribute('aria-selected','true');await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'تست‌های من',exact:true})).toHaveAttribute('aria-selected','true');await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>document.documentElement.style.fontSize='');
 await page.getByRole('link',{name:'ادامه',exact:true}).click();await expect(page).toHaveURL(new RegExp('marriageRequestId='+second));await page.getByRole('textbox').waitFor();
 mode='long';await page.goto(base+'/assessment');await page.getByRole('link',{name:/عنوانطولانی/}).first().waitFor();for(const width of [320,375,414,768,1024,1280,1440]){await page.setViewportSize({width,height:812});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 mode='empty';await page.goto(base+'/assessment');await page.getByText('فعلاً تستی برای شروع در دسترس نیست.',{exact:true}).waitFor();await expect(page.getByRole('link',{name:'بررسی دعوت',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'ادامه',exact:true})).toHaveCount(0);
 mode='error';await page.reload();await page.locator('main').getByRole('alert').first().waitFor();await expect(page.getByText('فعلاً تستی برای شروع در دسترس نیست.',{exact:true})).toHaveCount(0);
 expect(writes).toBe(0);expect(errors).toEqual([]);console.log(JSON.stringify({PASS:true,invitation:true,counts:true,dedup:true,realPrices:true,legacyViews:true,back:true,context:true,widths:7,empty:true,error:true,writes}));
}finally{await browser.close();}
