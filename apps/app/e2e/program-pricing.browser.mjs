import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { installProgramFixture, openProgramEditor, assertNoOverflow } from './program-management-fixture.mjs';

await mkdir('.local/program-pricing',{recursive:true});
const browser=await chromium.launch();
try {
  for(const width of [320,390,1440]) {
    const context=await browser.newContext({viewport:{width,height:850}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const state=await installProgramFixture(page);
    await openProgramEditor(page);
    await page.getByRole('button',{name:'قیمت و تخفیف',exact:true}).click();
    const price=page.getByLabel('قیمت خدمت به تومان',{exact:true}),region=page.getByRole('region',{name:'قیمت و انتشار'});
    await price.waitFor();assert.equal(await price.inputValue(),'150000.1');
    await price.fill('۲۵۰٬۰۰۰');
    await page.getByLabel(/^درصد تخفیف/).fill('۲۰');
    await page.getByLabel(/^شروع تخفیف/).fill('2026-11-07T12:00');
    await page.getByLabel(/^پایان تخفیف/).fill('2026-11-09T12:00');
    const prepare=region.getByRole('button',{name:'بررسی آمادگی انتشار'});
    await prepare.click();await region.getByRole('heading',{name:'آمادهٔ انتشار',exact:true}).waitFor();
    assert.equal(state.preview.amountRial,'2500000');assert.equal(state.preview.discountPercent,20);
    assert.equal(state.preview.discountStartsAt,'2026-11-07T08:30:00.000Z');assert.equal(state.preview.discountEndsAt,'2026-11-09T08:30:00.000Z');
    assert.equal(state.preview.accessMode,'DAYS');assert.equal(state.preview.accessDurationDays,30);assert.equal(state.preview.quoteTtlSeconds,600);
    assert.equal(state.preview.termsPolicyVersionId,state.terms.id);assert.equal(state.preview.retentionPolicyRef,'REVIEWED_TEST');assert.equal(state.preview.expectedServiceRevision,1);
    const publish=region.getByRole('button',{name:'انتشار برای خرید',exact:true});assert.equal(await publish.isDisabled(),true);
    await region.getByRole('checkbox').check();state.conflict=true;await publish.click();
    await region.getByText(/نوشته‌های شما حفظ شده/).waitFor();assert.equal(await price.inputValue(),'۲۵۰٬۰۰۰');
    state.conflict=false;await publish.click();await page.getByRole('dialog').waitFor({state:'hidden'});
    assert.equal(state.published.discountPercent,20);assert.equal(state.root.baseAmountRial,'2500000');
    await page.getByRole('button',{name:'مدیریت',exact:true}).click();await page.getByLabel('نام خدمت',{exact:true}).waitFor();
    await page.getByRole('button',{name:'قیمت و تخفیف',exact:true}).click();await price.waitFor();assert.equal(await price.inputValue(),'250000');assert.equal(await page.getByLabel(/^درصد تخفیف/).inputValue(),'20');
    state.blocked=true;await prepare.click();await region.getByRole('heading',{name:'پیش‌نیازهای انتشار کامل نیست'}).waitFor();assert.equal(await publish.count(),0);
    state.blocked=false;state.missingTerms=true;await prepare.click();await region.getByText(/شرایط خرید فعال و معتبر/).waitFor();assert.equal(await publish.count(),0);
    await assertNoOverflow(page);await page.screenshot({path:`.local/program-pricing/discount-${width}.png`});assert.deepEqual(errors,[]);
    await context.close();console.log(`PASS ${width}: rial precision, Persian prices, Tehran schedule, preserved access/terms, conflict recovery, medical/terms gates, no overflow`);
  }
}finally{await browser.close();}
