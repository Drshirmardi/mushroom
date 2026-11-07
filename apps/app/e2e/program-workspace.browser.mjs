import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { installProgramFixture, openProgramEditor, assertNoOverflow } from './program-management-fixture.mjs';

await mkdir('.local/program-workspace',{recursive:true});
const browser=await chromium.launch();
try {
  for(const [width,height] of [[320,850],[390,850],[768,900],[1440,900],[844,390]]) {
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const state=await installProgramFixture(page);await openProgramEditor(page);
    const title=page.getByLabel('نام خدمت',{exact:true});await title.fill('خدمت ویرایش‌شده');
    await page.getByRole('button',{name:'قیمت و تخفیف',exact:true}).click();await page.getByText('ابتدا تغییرات پیش‌نویس را ذخیره کنید.').waitFor();
    await page.getByRole('button',{name:'محتوا و مخاطب',exact:true}).click();assert.equal(await title.inputValue(),'خدمت ویرایش‌شده');
    page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').isVisible(),true);
    await page.getByRole('button',{name:'ذخیرهٔ پیش‌نویس',exact:true}).click();await page.getByText('پیش‌نویس ذخیره شد.',{exact:true}).waitFor();assert.equal(state.saved.draft.title,'خدمت ویرایش‌شده');assert.equal(state.saved.categoryId,state.categories[0].id);
    await assertNoOverflow(page);await page.screenshot({path:`.local/program-workspace/editor-${width}-${height}.png`});
    await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
    await page.getByRole('checkbox',{name:'انتخاب خدمت ویرایش‌شده',exact:true}).check();await page.getByRole('button',{name:'قیمت و تخفیف گروهی',exact:true}).click();
    await page.getByLabel(/^قیمت پایهٔ مشترک/).fill('۳۰۰۰۰۰');await page.getByLabel(/^درصد تخفیف/).fill('۱۰');await page.getByRole('button',{name:'بررسی و پیش‌نمایش گروه'}).click();
    const bulk=page.getByRole('dialog');await bulk.getByText('آمادهٔ انتشار',{exact:true}).waitFor();const apply=bulk.getByRole('button',{name:/انتشار .* مورد آماده/});assert.equal(await apply.isDisabled(),true);
    await bulk.getByRole('checkbox').check();await apply.click();await bulk.getByText('منتشر شد',{exact:true}).waitFor();assert.equal(state.published.amountRial,'3000000');assert.equal(state.published.discountPercent,10);assert.equal(state.published.accessMode,'DAYS');
    await assertNoOverflow(page);await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'کاتالوگ منابع',exact:true}).click();await page.getByRole('button',{name:'انتخاب همهٔ نتایج'}).click();await page.getByRole('button',{name:/پیش‌نمایش ورود/}).click();
    const importApply=page.getByRole('button',{name:'اعمال موارد معتبر',exact:true});await importApply.waitFor();assert.equal(await importApply.isDisabled(),true);
    await page.getByRole('combobox',{name:/^متن کامل/}).selectOption('SOURCE');await importApply.click();await page.getByText('وارد شد',{exact:true}).waitFor();assert.deepEqual(state.applied.items[0].resolutions,[{field:'body',choice:'SOURCE'}]);
    await page.getByRole('button',{name:'دسته‌بندی‌ها',exact:true}).click();await page.getByLabel('دسته‌بندی تازه',{exact:true}).fill('تغذیه');await page.getByRole('button',{name:'ایجاد دسته‌بندی',exact:true}).click();await page.getByText('دسته‌بندی ساخته شد.',{exact:true}).waitFor();assert.equal(state.categories.length,2);
    await page.getByRole('button',{name:'خدمات',exact:true}).click();await page.getByRole('button',{name:'مدیریت',exact:true}).click();await title.waitFor();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'آرشیو خدمت',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(state.root.archivedAt);assert.equal(state.root.sellingEnabled,false);
    await page.getByRole('combobox',{name:/^وضعیت/}).selectOption('ARCHIVED');await page.getByRole('button',{name:'مدیریت',exact:true}).click();await title.waitFor();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'بازیابی از آرشیو',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(state.root.archivedAt,null);assert.equal(state.root.sellingEnabled,false);
    await assertNoOverflow(page);assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}x${height}: dirty draft, save, bulk discount, explicit import conflict, category create, archive/restore, keyboard, no overflow`);
  }
}finally{await browser.close();}
