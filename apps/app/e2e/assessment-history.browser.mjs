import { chromium, expect } from '@playwright/test';
const before = process.env.MZ19_BEFORE === '1';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const base = 'http://127.0.0.1:3017', id = '11111111-1111-4111-8111-111111111111';
const resume = `${base}/assessment/resume?submissionId=${id}`;
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
let answers = {}, revision = 1, puts = 0, completed = false, failSave = false, holdSave = false, release;
await page.route('**/v1/**', async route => {
  const req = route.request(), p = new URL(req.url()).pathname;
  const headers = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-credentials': 'true' };
  const send = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' } });
  if (p.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 3600, user: { id, roles: ['PATIENT'] } });
  if (p.endsWith('/entry')) return send({ required: false });
  if (p === '/v1/patients/me/assessment-submissions') return send({ items: [{ id, title: 'آزمون بازگشت', state: 'IN_PROGRESS', resumeAvailable: true, versionNumber: 1, attemptNumber: 1 }], total: 1 });
  if (p.endsWith('/questionnaire')) return send({ id, title: 'آزمون بازگشت', resumeAvailable: true, structure: { schemaVersion: 1, sections: [{ questions: [{ id: 'q', type: 'TEXT', required: true, text: 'پاسخ نخست' }, { id: 'q2', type: 'TEXT', required: true, text: 'پاسخ دوم' }] }] } });
  if (p.startsWith('/v1/assessment-submissions/')) {
    if (p.endsWith('/submit')) completed = true;
    if (req.method() === 'PUT') { puts++; if (holdSave) await new Promise(resolve => { release = resolve; }); if (failSave) return send({ code: 'ASSESSMENT_ANSWERS_INVALID' }, 422); answers = req.postDataJSON().answers; revision++; }
    return send({ id, revision, state: completed ? 'COMPLETE' : 'IN_PROGRESS', assessmentVersionId: id, answers, attemptNumber: 1 });
  }
  return send({ items: [], total: 0 });
});
try {
  await page.goto(base + '/assessment?view=history');
  await page.getByRole('link', { name: 'ادامهٔ پاسخ‌ها', exact: true }).click();
  await page.getByRole('textbox').fill('پاسخ ذخیره‌نشده');
  await page.goBack({ waitUntil: 'commit' });
  if (before) {
    await expect(page).toHaveURL(base + '/assessment?view=history');
    await expect(page.getByRole('textbox')).toHaveCount(0);
    expect(puts).toBe(0);
    console.log('REPRO: native Back discarded the unsaved answer without a choice');
  } else {
    await page.getByRole('dialog', { name: 'پاسخ ذخیره‌نشده' }).waitFor();
    await expect(page).toHaveURL(resume);
    const dialog = page.getByRole('dialog', { name: 'پاسخ ذخیره‌نشده' });
    const historyLength = await page.evaluate(() => history.length);
    await expect(dialog.getByRole('button', { name: 'ماندن در آزمون', exact: true })).toBeInViewport();
    await dialog.getByRole('button', { name: 'ماندن در آزمون', exact: true }).click({ trial: true });
    await page.screenshot({ path: '.local/mz19-back.png' });
    for (const width of [320, 375, 414, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 812 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await dialog.getByRole('button', { name: 'ماندن در آزمون', exact: true }).click();
    await expect(page.getByRole('textbox')).toHaveValue('پاسخ ذخیره‌نشده');
    for (let i = 0; i < 2; i++) {
      await page.goBack({ waitUntil: 'commit' });
      await dialog.waitFor();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(resume);
    }
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await page.goBack({ waitUntil: 'commit' });
    failSave = true;
    await dialog.getByRole('button', { name: 'ذخیره و خروج', exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    expect(puts).toBe(1);
    await expect(page).toHaveURL(resume);
    await expect(page.getByRole('textbox')).toHaveValue('پاسخ ذخیره‌نشده');
    failSave = false; holdSave = true;
    await dialog.getByRole('button', { name: 'ذخیره و خروج', exact: true }).click();
    await expect.poll(() => !!release).toBe(true);
    await page.goBack({ waitUntil: 'commit' });
    await expect(page).toHaveURL(resume);
    expect(puts).toBe(2);
    holdSave = false; release();
    await expect(page).toHaveURL(base + '/assessment?view=history');
    expect(answers.q).toBe('پاسخ ذخیره‌نشده');
    await page.goForward({ waitUntil: 'commit' });
    await page.getByRole('textbox').waitFor();
    await expect(page.getByRole('textbox')).toHaveValue('');
    // Clean traversal must remain ordinary Back/Forward, with no extra history entries.
    await page.goBack({ waitUntil: 'commit' });
    await expect(page).toHaveURL(base + '/assessment?view=history');
    await expect(dialog).toHaveCount(0);
    await page.goForward({ waitUntil: 'commit' });
    await page.getByRole('textbox').fill('کنار گذاشته شود');
    await page.goBack({ waitUntil: 'commit' });
    await dialog.getByRole('button', { name: 'خروج بدون ذخیره', exact: true }).click();
    await expect(page).toHaveURL(base + '/assessment?view=history');
    expect(puts).toBe(2);
    await page.goForward({ waitUntil: 'commit' });
    await expect(page.getByRole('textbox')).toHaveValue('');
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    // Create a real forward destination through an ordinary app link.
    await page.getByRole('link', { name: 'خانه', exact: true }).click();
    await expect(page).toHaveURL(base + '/');
    await page.goBack({ waitUntil: 'commit' });
    await page.getByRole('textbox').fill('پاسخ پیش از Forward');
    await page.goForward({ waitUntil: 'commit' });
    await dialog.getByRole('button', { name: 'ماندن در آزمون', exact: true }).click();
    await expect(page).toHaveURL(resume);
    await expect(page.getByRole('textbox')).toHaveValue('پاسخ پیش از Forward');
    await page.goForward({ waitUntil: 'commit' });
    await dialog.getByRole('button', { name: 'خروج بدون ذخیره', exact: true }).click();
    await expect(page).toHaveURL(base + '/');
    await page.goBack({ waitUntil: 'commit' });
    await expect(page.getByRole('textbox')).toHaveValue('');
    expect(puts).toBe(2);
    await page.getByRole('textbox').fill('پاسخ نهایی');
    await page.getByRole('button', { name: 'ثبت نهایی و مشاهده نتیجه', exact: true }).click();
    await expect(page).toHaveURL(`${base}/assessment/result?submissionId=${id}`);
    await expect(dialog).toHaveCount(0);
    expect(completed).toBe(true);
    expect(puts).toBe(3);
    // A true cross-document Back uses the browser's standard unload confirmation.
    completed = false; answers = { q: 'پاسخ ذخیره‌شده' };
    await page.goto(base + '/assessment?view=history');
    await page.goto(resume);
    await page.getByRole('textbox').fill('پاسخ پیش از خروج از سند');
    let unloadWarnings = 0;
    const dismissUnload = async event => { if (event.type() === 'beforeunload') unloadWarnings++; await event.dismiss(); };
    page.on('dialog', dismissUnload);
    await page.goBack({ waitUntil: 'commit', timeout: 2000 }).catch(() => {});
    page.off('dialog', dismissUnload);
    expect(unloadWarnings).toBe(1);
    await expect(page).toHaveURL(resume);
    await expect(page.getByRole('textbox')).toHaveValue('پاسخ پیش از خروج از سند');
    const acceptUnload = async event => { expect(event.type()).toBe('beforeunload'); await event.accept(); };
    page.on('dialog', acceptUnload);
    await page.goBack({ waitUntil: 'commit' });
    page.off('dialog', acceptUnload);
    await expect(page).toHaveURL(base + '/assessment?view=history');
    expect(puts).toBe(3);
    expect(pageErrors).toEqual([]);
    console.log(JSON.stringify({ PASS: true, nativeBack: true, nativeForward: true, stay: true, saveFailure: true, busyBack: true, discard: true, noExtraHistoryEntries: true, completedWithoutWarning: true, crossDocumentNativeWarning: true, puts }));
  }
} finally { await browser.close(); }
