import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dashboardUrl, installProgramFixture, assertNoOverflow } from './program-management-fixture.mjs';
await mkdir('.local/program-draft-publication',{recursive:true});
const browser=await chromium.launch();
try{
  for(const width of [320,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:850}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));const state=await installProgramFixture(page);
    state.root.publishedDefinitionId=null;state.root.sellingEnabled=false;
    delete state.root.draft.safety;delete state.root.draft.eligibilityDescription;
    let captured=null,applied=null;
    await page.route('**/v1/admin/program-service-publications/**',async route=>{
      const req=route.request();
      const headers={'access-control-allow-origin':req.headers().origin??dashboardUrl,'access-control-allow-credentials':'true','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'POST,OPTIONS'};
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
      if(new URL(req.url()).pathname.endsWith('/preview')){captured=req.postDataJSON();return route.fulfill({status:201,headers,contentType:'application/json',body:JSON.stringify({id:'77777777-7777-4777-8777-777777777777',expiresAt:new Date(Date.now()+1800000).toISOString(),items:captured.items.map(i=>({serviceId:i.serviceId,title:state.root.draft.title,summary:state.root.draft.summary,ready:true,configuration:i.configuration,termsBody:state.terms.body}))})});}
      applied=req.postDataJSON();return route.fulfill({status:201,headers,contentType:'application/json',body:JSON.stringify({items:applied.serviceIds.map(serviceId=>({serviceId,title:state.root.draft.title,ready:true,published:true}))})});
    });
    await page.goto(`${dashboardUrl}/programs`);
    await page.getByRole('button',{name:'کاتالوگ منابع',exact:true}).click();await page.getByRole('button',{name:'انتخاب همهٔ نتایج'}).click();await page.getByRole('button',{name:/پیش‌نمایش ورود/}).click();
    await page.getByRole('combobox',{name:/^متن کامل/}).selectOption('SOURCE');await page.getByRole('button',{name:'اعمال موارد معتبر',exact:true}).click();await page.getByText('وارد شد',{exact:true}).waitFor();
    await page.getByRole('button',{name:'پیش‌نمایش انتشار خدمات واردشده',exact:true}).click();
    const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'بررسی و پیش‌نمایش گروه'}).click();await dialog.getByText('آمادهٔ ثبت نسخه و انتشار',{exact:true}).waitFor();
    assert.equal(captured.items[0].serviceId,state.root.id);assert.equal(captured.items[0].expectedRevision,state.root.revision);assert.equal(captured.items[0].configuration.amountRial,state.root.baseAmountRial);
    const publish=dialog.getByRole('button',{name:/ثبت نسخه و انتشار .* خدمت/});assert.equal(await publish.isDisabled(),true);
    await dialog.getByRole('checkbox').check();await publish.click();await dialog.getByText('منتشر شد',{exact:true}).waitFor();assert.deepEqual(applied.serviceIds,[state.root.id]);
    await assertNoOverflow(page);await page.screenshot({path:`.local/program-draft-publication/published-${width}.png`});assert.deepEqual(errors,[]);await context.close();
    console.log(`PASS ${width}: catalog import to draft preview to explicit batch publication, no physician or required safety fields, no overflow`);
  }
}finally{await browser.close();}
