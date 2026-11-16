import { chromium, expect } from '@playwright/test';
let journeyReads=0;
let journeyMode = 'error';
let releaseInitialJourney;
const initialJourney = new Promise(resolve => { releaseInitialJourney = resolve; });
const interactions=[];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const base = process.env.APP_BROWSER_TEST_URL ?? 'http://127.0.0.1:3017', id = '11111111-1111-4111-8111-111111111111';
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
  if (p.endsWith('/journey')) {
    journeyReads++;
    await initialJourney;
    if (journeyMode === 'error') return send({code:'FIXTURE_UNAVAILABLE'},503);
    return send({
      home: {
        actions: [],
        latestAssessment: journeyMode === 'result' ? { id, title: 'ارزیابی مزاج', completedAt: '2026-01-01T00:00:00Z' } : null,
      },
      appointments: { items: [] },
      onboarding: { isComplete: true },
    });
  }
  if (p.endsWith('/assessment-submissions/' + id + '/result')) {
    return send({ resultSnapshot: {
      algorithmId: 'DIMENSION_TIEBREAK',
      status: 'SINGLE',
      profile: { title: 'نتیجهٔ نمونه' },
      scores: { a: 30, b: 25, c: 35, d: 10 },
      dimensionTitles: [
        { id: 'a', title: 'گرمی' }, { id: 'b', title: 'سردی' },
        { id: 'c', title: 'تری' }, { id: 'd', title: 'خشکی' },
      ],
    } });
  }
  if (p.endsWith('/entry')) return send({ required: false });
  return send({ items: [], total: 0 });
});

try {
  await page.setViewportSize({width:490,height:764}); await page.goto(base+'/');
  await expect(page.locator('.home-hero .loading-state')).toBeVisible();
  await expect(page.locator('.home-shortcuts-services')).toBeVisible();
  releaseInitialJourney();
  await page.getByRole('button',{name:'دریافت دوباره',exact:true}).waitFor();
  const dock=page.locator('.patient-shell-nav__dock');
  const dockAppearance = el => {
    const style = getComputedStyle(el);
    return {
      background: style.backgroundColor,
      blur: style.backdropFilter,
      shadow: style.boxShadow,
      radius: style.borderRadius,
      border: style.borderTop,
      padding: style.padding,
    };
  };
  const paint = await dock.evaluate(dockAppearance);
  expect(paint.radius).toBe('24px');
  expect(await page.locator('.patient-shell-footer').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.locator('.patient-shell-content').evaluate(el=>el.getBoundingClientRect().bottom)).toBeGreaterThan(await dock.evaluate(el=>el.getBoundingClientRect().top));
  await page.screenshot({path:'.local/vp05-home.png'});
  const reads=journeyReads;await page.getByRole('button',{name:'دریافت دوباره',exact:true}).click();await expect.poll(()=>journeyReads).toBeGreaterThan(reads);interactions.push({at:new Date().toISOString(),action:'retry',observed:'fixture503 recovery card remains'});
  await page.getByRole('button',{name:/اعلان/}).first().click();await page.getByRole('dialog').waitFor();interactions.push({at:new Date().toISOString(),action:'open notifications',observed:'native dialog open'});
  await page.screenshot({path:'.local/vp05-sheet.png'});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  const nav=page.getByRole('navigation',{name:'ناوبری اصلی'});await nav.getByRole('link',{name:'فروشگاه',exact:true}).click();await expect(page).toHaveURL(base+'/store');await expect(nav.getByRole('link',{name:'فروشگاه',exact:true})).toHaveAttribute('aria-current','page');
  expect(await dock.evaluate(dockAppearance)).toEqual(paint);
  await page.goBack();await expect(page).toHaveURL(base+'/');await expect(nav.getByRole('link',{name:'خانه',exact:true})).toHaveAttribute('aria-current','page');interactions.push({at:new Date().toISOString(),action:'home-store-home',observed:'route and active tab restored'});
  for(const width of [320,375,414,768,1024,1280,1440]){await page.setViewportSize({width,height:764});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);for(const a of await nav.getByRole('link').all())expect((await a.boundingBox()).height).toBeGreaterThanOrEqual(44);}
  journeyMode = 'empty';
  await page.reload();
  await expect(page.getByRole('link', { name: 'ارزیابی‌های من' })).toBeVisible();
  journeyMode = 'result';
  await page.reload();
  const chart = page.locator('.home-mizaj figure');
  await expect(chart.getByText('ترکیب گرایش‌های شما')).toBeVisible();
  const sheet = page.locator('.home-sheet');
  const shell = page.locator('.patient-shell-content');
  const lastSection = sheet.locator('section').last();
  const services = sheet.locator('.home-shortcuts-services');
  const access = sheet.locator('.home-shortcuts-access');
  const banners = sheet.locator('.home-banners');
  const dots = banners.getByRole('group', { name: 'انتخاب بنر' });
  await expect(services.getByRole('link')).toHaveCount(4);
  await expect(access.getByRole('link')).toHaveCount(6);
  await expect.poll(() => sheet.locator('.home-shortcut img').evaluateAll(images =>
    images.every(img => img.complete && img.naturalWidth > 0 && img.src.includes('/glass-icons/'))
  )).toBe(true);
  await expect(banners.getByRole('button')).toHaveCount(2);
  await page.mouse.move(0, 0);
  const initialBanner = await dots.locator('[aria-current="true"]').getAttribute('aria-label');
  await expect(dots.locator('[aria-current="true"]')).not.toHaveAttribute('aria-label', initialBanner, { timeout: 6500 });
  await dots.getByRole('button', { name: 'فروشگاه سلامت' }).click();
  await expect(dots.getByRole('button', { name: 'فروشگاه سلامت' })).toHaveAttribute('aria-current', 'true');
  await dots.getByRole('button', { name: 'ارزیابی مزاج' }).click();
  await expect(dots.getByRole('button', { name: 'ارزیابی مزاج' })).toHaveAttribute('aria-current', 'true');
  await dots.getByRole('button', { name: 'ارزیابی مزاج' }).blur();
  const carousel = banners.locator('.swiper');
  await carousel.scrollIntoViewIfNeeded();
  await expect.poll(() => carousel.evaluate(el => el.swiper.animating)).toBe(false);
  const bounds = await carousel.boundingBox();
  const dragY = bounds.y + bounds.height / 2;
  await page.mouse.move(bounds.x + bounds.width * 0.3, dragY);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.8, dragY, { steps: 12 });
  await page.mouse.up();
  await expect(dots.getByRole('button', { name: 'فروشگاه سلامت' })).toHaveAttribute('aria-current', 'true');
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 668 });
    await shell.evaluate(el => el.scrollTo(0, 0));
    const frame = (await shell.boundingBox()).width;
    expect(frame).toBe(Math.min(width, 552));
    expect((await dock.boundingBox()).width).toBe(Math.min(frame - 24, 420));
    const top = (await dock.boundingBox()).y;
    const chartBottom = await chart.evaluate(el => el.getBoundingClientRect().bottom);
    expect(await services.evaluate(el => getComputedStyle(el).direction)).toBe('rtl');
    expect(await access.evaluate(el => el.scrollWidth)).toBe((await access.boundingBox()).width);
    expect((await services.boundingBox()).y).toBeLessThan((await banners.boundingBox()).y);
    expect((await banners.boundingBox()).y).toBeLessThan((await access.boundingBox()).y);
    expect((await banners.boundingBox()).width).toBeLessThan((await services.boundingBox()).width);
    expect(await services.locator('.home-shortcut-tile').evaluateAll(tiles =>
      tiles.every(tile => tile.firstElementChild.getBoundingClientRect().width < tile.getBoundingClientRect().width)
    )).toBe(true);
    expect(await shell.evaluate(el => el.scrollWidth)).toBe(frame);
    await services.hover();
    await page.mouse.wheel(0, 150);
    await expect.poll(() => shell.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await shell.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await expect.poll(async () => (await sheet.boundingBox()).y).toBeLessThan(chartBottom);
    expect((await dock.boundingBox()).y).toBe(top);
    expect((await lastSection.boundingBox()).y + (await lastSection.boundingBox()).height).toBeLessThanOrEqual(top);
    await shell.evaluate(el => el.scrollTo(0, 0));
    await expect.poll(async () => (await sheet.boundingBox()).y).toBeGreaterThan((await chart.boundingBox()).y + (await chart.boundingBox()).height);
  }
  expect(pageErrors).toEqual([]);console.log(JSON.stringify({PASS:true,paint,interactions}));
}finally{await browser.close();}
