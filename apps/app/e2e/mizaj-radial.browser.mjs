import { chromium, expect } from '@playwright/test';

// Local intercepted UI evidence. No provider, payment or persisted patient data.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const base = process.env.PATIENT_APP_TEST_URL || 'http://127.0.0.1:3017';
const id = '11111111-1111-4111-8111-111111111111';
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let releaseResult;
let held = new Promise(resolve => { releaseResult = resolve; });
let empty = false;
const dimensions = ['گرم و خشک', 'گرم و تر', 'سرد و خشک', 'سرد و تر'].map((title, index) => ({ id: String(index), title }));
const snapshot = () => ({ algorithmId: 'DIMENSION_TIEBREAK', status: 'PAIR', scores: empty ? {} : { 0: 4, 1: 3, 2: 3, 3: 0 }, dimensionTitles: dimensions, primary: '0', secondary: '1', profile: { title: 'الگوی ثبت‌شدهٔ آزمایشی' } });
await page.route('**/v1/**', async route => {
  const req = route.request(), path = new URL(req.url()).pathname;
  const headers = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true' };
  const send = data => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(data) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' } });
  if (path.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 3600, user: { id, roles: ['PATIENT'] } });
  if (req.method() !== 'GET') throw new Error('Unexpected write');
  if (path.endsWith('/entry')) return send({ required: false });
  if (path.endsWith('/addresses')) return send([]);
  if (path.endsWith('/journey')) return send({ onboarding: { isComplete: true }, home: { latestAssessment: { id, title: 'مزاج‌شناسی', completedAt: '2026-11-04T10:00:00Z' }, actions: [], activeTreatmentPlanId: null } });
  if (path.endsWith('/result')) { await held; return send({ id, state: 'COMPLETE', resultSnapshot: snapshot(), completedAt: '2026-11-04T10:00:00Z' }); }
  if (path.endsWith('/questionnaire')) return send({ title: 'مزاج‌شناسی', versionNumber: 1 });
  if (path.endsWith('/guidance')) return send({ status: 'UNAVAILABLE', content: [], services: [] });
  return send({ items: [], total: 0 });
});
try {
  await page.goto(base + '/');
  const semi = page.locator('figure[data-variant="semi"]');
  await expect(semi).toHaveAttribute('aria-busy', 'true');
  await expect(semi.locator('.recharts-radial-bar-sector').first()).toBeVisible();
  await expect(semi.locator('dd')).toHaveCount(0);
  await page.screenshot({ path: '.local/ah04-loading.png' });
  releaseResult();
  await expect(semi).toHaveAttribute('aria-busy', 'false');
  await expect(semi.locator('dd')).toHaveText(['۴۰٫۰٪', '۳۰٫۰٪', '۳۰٫۰٪', '۰٫۰٪']);
  await expect(page.locator('img[src*="blue-brain"]')).toHaveCount(0);
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await semi.boundingBox();
    expect(bounds.width).toBeLessThanOrEqual(width);
    await expect(semi.locator('dt')).toHaveCount(4);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '.local/ah04-home.png' });
  held = new Promise(resolve => { releaseResult = resolve; });
  await page.getByRole('link', { name: 'مشاهدهٔ نتیجه' }).click();
  const full = page.locator('figure[data-variant="full"]');
  await expect(full).toHaveAttribute('aria-busy', 'true');
  releaseResult();
  await expect(full.locator('dd')).toHaveText(['۴۰٫۰٪', '۳۰٫۰٪', '۳۰٫۰٪', '۰٫۰٪']);
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '.local/ah04-result.png', fullPage: true });
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  empty = true;
  await page.reload();
  await expect(page.getByText('پاسخ مؤثر کافی برای نمایش درصد گرایش‌ها ثبت نشده است.')).toBeVisible();
  await expect(page.locator('figure[data-variant="full"]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  held = new Promise(resolve => { releaseResult = resolve; });
  await page.goto(base + '/');
  await expect(semi).toHaveAttribute('aria-busy', 'true');
  await expect(semi.locator('.recharts-radial-bar-sector').first()).toBeVisible();
  const before = await semi.locator('.recharts-radial-bar-sector').first().getAttribute('d');
  await page.waitForTimeout(1700);
  expect(await semi.locator('.recharts-radial-bar-sector').first().getAttribute('d')).toBe(before);
  releaseResult();
  expect(errors).toEqual([]);
  console.log('PASS: intercepted local full/semi/loading/zero/percentages/seven widths/200% text/reduced motion; no patient/provider writes.');
} finally { releaseResult(); await browser.close(); }
