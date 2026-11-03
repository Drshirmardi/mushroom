import { chromium, expect } from '@playwright/test';
const before = process.env.VP01_BEFORE === '1';
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
  await page.goto(base + '/assessment/resume?submissionId=' + id);
  await page.getByRole('textbox').fill('متن آزمایشی');
  const matrix = [[320,568],[375,640],[414,812],[768,900],[1024,768],[1280,900],[1440,900],[667,375]];
  for (const [width,height] of matrix) {
    await page.setViewportSize({width,height});
    const metrics = await page.evaluate(() => {
      const nav=document.querySelector('nav[aria-label="ناوبری اصلی"]');
      const content=document.querySelector('.patient-app-frame > div');
      return {navTop:nav.getBoundingClientRect().top,contentBottom:content.getBoundingClientRect().bottom,bodyScroll:document.documentElement.scrollHeight>innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,navHeight:nav.getBoundingClientRect().height};
    });
    if (before) { expect(metrics.contentBottom).toBeGreaterThan(metrics.navTop); }
    else { expect(metrics.contentBottom).toBeLessThanOrEqual(metrics.navTop+1); expect(metrics.bodyScroll).toBe(false); expect(metrics.overflow).toBe(false); }
  }
  await page.setViewportSize({width:375,height:640});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  if (!before) {
    const nav=page.getByRole('navigation',{name:'ناوبری اصلی'});
    await expect(nav).toBeInViewport();
    for(const link of await nav.getByRole('link').all())expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.patient-shell-content').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    const last=await page.locator('.patient-shell-content').getByRole('button').last().boundingBox();
    expect(last.y+last.height).toBeLessThanOrEqual((await nav.boundingBox()).y+1);
  }
  await page.screenshot({path:before?'.local/vp01-before.png':'.local/vp01-after.png'});
  console.log(JSON.stringify({PASS:true,before,sizes:matrix.length}));
} finally { await browser.close(); }
