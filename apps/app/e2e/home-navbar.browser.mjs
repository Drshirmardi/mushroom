import { chromium, expect } from '@playwright/test';
let journeyReads=0;const interactions=[];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const base = 'http://127.0.0.1:3017', id = '11111111-1111-4111-8111-111111111111';
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.route('**/v1/**', async route => {
  const req = route.request(), p = new URL(req.url()).pathname;
  const headers = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true' };
  const send = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' } });
  if (p.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 3600, user: { id, roles: ['PATIENT'] } });
  if(req.method()!=='GET') throw new Error('unexpected write');
  if (p.endsWith('/addresses')) return send([]);
  if (p.endsWith('/journey')) { journeyReads++;return send({code:'FIXTURE_UNAVAILABLE'},503); }
  if (p.endsWith('/entry')) return send({ required: false });
  return send({ items: [], total: 0 });
});

try {
  await page.setViewportSize({width:490,height:764}); await page.goto(base+'/');
  await page.getByRole('button',{name:'دریافت دوباره',exact:true}).waitFor();
  const dock=page.locator('.patient-shell-nav__dock');
  const paint=await dock.evaluate(el=>{const c=getComputedStyle(el);return {bg:c.backgroundColor,blur:c.backdropFilter,shadow:c.boxShadow,border:c.borderTopColor};});
  expect(paint.bg).toBe('rgba(245, 252, 255, 0.56)');expect(paint.blur).toBe('blur(28px)');expect(paint.shadow).not.toBe('none');
  expect(await page.locator('.patient-shell-footer').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.locator('.patient-shell-content').evaluate(el=>el.getBoundingClientRect().bottom)).toBeGreaterThan(await dock.evaluate(el=>el.getBoundingClientRect().top));
  await page.screenshot({path:'.local/vp05-home.png'});
  const reads=journeyReads;await page.getByRole('button',{name:'دریافت دوباره',exact:true}).click();await expect.poll(()=>journeyReads).toBeGreaterThan(reads);interactions.push({at:new Date().toISOString(),action:'retry',observed:'fixture503 recovery card remains'});
  await page.getByRole('button',{name:/اعلان/}).first().click();await page.getByRole('dialog').waitFor();interactions.push({at:new Date().toISOString(),action:'open notifications',observed:'native dialog open'});
  await page.screenshot({path:'.local/vp05-sheet.png'});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  const nav=page.getByRole('navigation',{name:'ناوبری اصلی'});await nav.getByRole('link',{name:'فروشگاه',exact:true}).click();await expect(page).toHaveURL(base+'/store');await expect(nav.getByRole('link',{name:'فروشگاه',exact:true})).toHaveAttribute('aria-current','page');
  await page.goBack();await expect(page).toHaveURL(base+'/');await expect(nav.getByRole('link',{name:'خانه',exact:true})).toHaveAttribute('aria-current','page');interactions.push({at:new Date().toISOString(),action:'home-store-home',observed:'route and active tab restored'});
  for(const width of [320,375,414,768,1024,1280,1440]){await page.setViewportSize({width,height:764});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);for(const a of await nav.getByRole('link').all())expect((await a.boundingBox()).height).toBeGreaterThanOrEqual(44);}
  expect(pageErrors).toEqual([]);console.log(JSON.stringify({PASS:true,paint,interactions,note:'intercepted local UI regression; synthetic503 intentional; full live audit Incomplete'}));
}finally{await browser.close();}
