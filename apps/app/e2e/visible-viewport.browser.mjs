import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const base = 'http://127.0.0.1:3017', id = '11111111-1111-4111-8111-111111111111';
const resume = `${base}/assessment/resume?submissionId=${id}`;
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
let emptyCart = false, cartWrites = 0;
let answers = {}, revision = 1, puts = 0, completed = false, failSave = false, holdSave = false, release;
const mockApi = async route => {
  const req = route.request(), p = new URL(req.url()).pathname;
  const headers = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true' };
  const send = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' } });
  if (p.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 3600, user: { id, roles: ['PATIENT'] } });
  const product={id,title:'کالای آزمایشی',slug:'fixture',description:null,image:null,category:{id:'category',name:'سلامت',slug:'health'},skus:[{id:'sku',code:'S1',title:null,currentPriceToman:'1000',currentTaxToman:'0'}]};
  if (p.endsWith('/cart')) { if(req.method()==='PUT'){cartWrites++;emptyCart=false;} return send({items:emptyCart?[]:[{id:'item',quantity:1,sku:product.skus[0],product}]}); }
  if (p === '/v1/commerce/products/'+id) return send(product);
  if (p.endsWith('/entry')) return send({ required: false });
  if (p === '/v1/patients/me/assessment-submissions') return send({ items: [{ id, title: 'آزمون بازگشت', state: 'IN_PROGRESS', resumeAvailable: true, versionNumber: 1, attemptNumber: 1 }], total: 1 });
  if (p.endsWith('/questionnaire')) return send({ id, title: 'آزمون بازگشت', resumeAvailable: true, structure: { schemaVersion: 1, sections: [{ questions: [{ id: 'q', type: 'TEXT', required: true, text: 'پاسخ نخست' }, { id: 'q2', type: 'TEXT', required: true, text: 'پاسخ دوم' }] }] } });
  if (p.startsWith('/v1/assessment-submissions/')) {
    if (p.endsWith('/submit')) completed = true;
    if (req.method() === 'PUT') { puts++; if (holdSave) await new Promise(resolve => { release = resolve; }); if (failSave) return send({ code: 'ASSESSMENT_ANSWERS_INVALID' }, 422); answers = req.postDataJSON().answers; revision++; }
    return send({ id, revision, state: completed ? 'COMPLETE' : 'IN_PROGRESS', assessmentVersionId: id, answers, attemptNumber: 1 });
  }
  return send({ items: [], total: 0 });
};
await page.route('**/v1/**', mockApi);

await page.addInitScript(() => {
  const viewport = new EventTarget();
  Object.assign(viewport, {height:innerHeight,width:innerWidth,scale:1,offsetTop:0});
  Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
});
const resize = async (height,scale=1,offsetTop=0) => {
  await page.evaluate(({height,scale,offsetTop})=>{Object.assign(visualViewport,{height,scale,offsetTop});visualViewport.dispatchEvent(new Event('resize'));},{height,scale,offsetTop});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
};
try {
  await page.goto(resume); await page.getByRole('textbox').fill('پاسخ حفظ شود');
  const nav=page.getByRole('navigation',{name:'ناوبری اصلی'});
  await resize(400,1,12); await expect(nav).toBeHidden();
  expect(await page.locator('.patient-app-frame').evaluate(el=>Math.round(el.getBoundingClientRect().height))).toBe(400);
  await expect(page.getByRole('textbox')).toHaveValue('پاسخ حفظ شود'); await expect(page.getByRole('textbox')).toBeFocused();
  await resize(812); await expect(nav).toBeVisible();
  await resize(730); await expect(nav).toBeVisible(); // Browser toolbar, not keyboard.
  await resize(400,2); await expect(nav).toBeVisible(); // Pinch zoom must not trigger keyboard policy.
  await resize(812);
  await page.setViewportSize({width:812,height:375}); await resize(375); await expect(nav).toBeVisible();
  await page.setViewportSize({width:375,height:812}); await resize(812);
  expect(await nav.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.locator('.patient-app-frame').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.getByRole('link',{name:'خانه',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'پاسخ ذخیره‌نشده'}); await dialog.waitFor();
  await resize(300); await dialog.getByRole('button',{name:'ماندن در آزمون',exact:true}).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('button',{name:'ماندن در آزمون',exact:true})).toBeInViewport();
  expect(await page.locator('.patient-sheet-panel').evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(301);
  await page.screenshot({path:'.local/vp02-sheet.png'});
  await resize(812); await dialog.getByRole('button',{name:'خروج بدون ذخیره',exact:true}).click();
  await expect(page).toHaveURL(base+'/');
  await page.goto(base+'/store/cart'); await page.getByLabel('خلاصهٔ سبد',{exact:true}).waitFor();
  for(const [width,height] of [[320,568],[375,640],[414,812],[768,900],[1024,768],[1280,900],[1440,900],[667,375]]) {
    await page.setViewportSize({width,height}); await resize(height);
    const bar=page.getByLabel('خلاصهٔ سبد',{exact:true});
    const b=await bar.boundingBox(),n=await nav.boundingBox();
    expect(b.y+b.height).toBeLessThanOrEqual(n.y+1);
    expect(await bar.evaluate(el=>!!el.closest('.patient-action-slot'))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:375,height:812}); await resize(812);
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  await page.screenshot({path:'.local/vp02-cart.png'});
  emptyCart=true;
  await page.goto(base+'/store/products/'+id); await page.getByRole('group',{name:'خرید کالای آزمایشی',exact:true}).waitFor();
  await expect(nav).toHaveCount(0);
  expect(await page.getByRole('group',{name:'خرید کالای آزمایشی',exact:true}).evaluate(el=>!!el.closest('.patient-action-slot'))).toBe(true);
  expect(await page.locator('.patient-shell-footer').evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(813);
  await page.getByRole('button',{name:'افزودن به سبد',exact:true}).click();
  const toast=page.locator('.store-toast'); await toast.waitFor();
  await expect(toast.getByRole('button',{name:'برو به سبد خرید'})).toBeInViewport();
  await toast.getByRole('button',{name:'برو به سبد خرید'}).click({trial:true});
  const toastBox=await toast.boundingBox(),footerBox=await page.locator('.patient-shell-footer').boundingBox();
  expect(toastBox.y+toastBox.height).toBeLessThanOrEqual(footerBox.y);
  expect(cartWrites).toBe(1);
  await page.screenshot({path:'.local/vp02-product.png'});
  const fallbackContext = await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:375,height:812}});
  await fallbackContext.route('**/v1/**',mockApi);
  await fallbackContext.addInitScript(()=>Object.defineProperty(window,'visualViewport',{value:undefined,configurable:true}));
  const fallback = await fallbackContext.newPage(); await fallback.goto(resume);
  await fallback.getByRole('textbox').fill('متن در مرورگر قدیمی');
  expect(await fallback.getByRole('textbox').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await expect(fallback.getByRole('navigation',{name:'ناوبری اصلی'})).toBeHidden();
  await fallback.getByRole('textbox').evaluate(el=>el.blur());
  await expect(fallback.getByRole('navigation',{name:'ناوبری اصلی'})).toBeVisible();
  await expect(fallback.getByRole('textbox')).toHaveValue('متن در مرورگر قدیمی');
  await fallbackContext.close();
  expect(pageErrors).toEqual([]); expect(puts).toBe(0);
  console.log(JSON.stringify({PASS:true,simulation:'injected VisualViewport; no physical keyboard/device claim',keyboard:true,toolbar:true,zoom:true,rotation:true,sheet:true,cart:true,product:true,toast:true,mockedCartWrites:cartWrites,answerWrites:puts}));
}finally{await browser.close();}
