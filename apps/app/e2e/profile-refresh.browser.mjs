import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.APP_URL ?? 'http://localhost:3001';
const browser = await chromium.launch();
const id = '11111111-1111-4111-8111-111111111111';

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let firstName = 'سارا';
  let homeReads = 0;
  let profileWrites = 0;
  await page.route('**/v1/**', async route => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const headers = {
      'access-control-allow-origin': request.headers().origin ?? base,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
    };
    const send = json => route.fulfill({ status: 200, headers, json });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    switch (pathname) {
      case '/v1/auth/refresh':
        return send({ accessToken: 'synthetic', expiresIn: 3600, user: { id, roles: ['PATIENT'] } });
      case '/v1/patients/me':
        if (request.method() === 'PATCH') {
          ({ firstName } = request.postDataJSON());
          profileWrites++;
        }
        return send({ firstName, lastName: 'احمدی', gender: 'FEMALE', accountStatus: 'ACTIVE' });
      case '/v1/patients/me/entry':
        return send({ required: false, firstName });
      case '/v1/patients/me/home':
        homeReads++;
        return send({ setupSteps: [], actions: [], isOnboardingComplete: true });
      case '/v1/patients/me/onboarding-status':
        return send({ requiredCount: 4, answeredRequiredCount: profileWrites + 1, isComplete: false });
      case '/v1/patients/me/commerce/addresses':
        return send([]);
      default:
        return send({ items: [] });
    }
  });

  await page.goto(base);
  await page.getByRole('heading', { name: 'سلام، سارا', exact: true }).waitFor();
  const homeOverview = page.getByRole('heading', { name: 'خانهٔ سلامت شما', exact: true });
  await homeOverview.waitFor();
  for (const [index, name] of ['مینا', 'نیلوفر'].entries()) {
    await page.getByRole('link', { name: 'پروفایل', exact: true }).click();
    await page.getByRole('heading', { name: firstName + ' احمدی', exact: true }).waitFor();
    await page.getByRole('button', { name: 'ویرایش پروفایل' }).click();
    await page.getByRole('button', { name: 'تغییر نام', exact: true }).click();
    await page.locator('#firstName').fill(name);
    if (index === 1) {
      await page.getByRole('button', { name: 'بازگشت', exact: true }).click();
      await page.getByRole('button', { name: 'ذخیره و خروج', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'ذخیره تغییرات', exact: true }).click();
    }
    await page.waitForURL(new URL('/profile', base).href);
    await page.getByRole('heading', { name: name + ' احمدی', exact: true }).waitFor();
    await page.getByRole('progressbar').and(page.locator(`[aria-valuenow="${(index + 2) * 25}"]`)).waitFor();
    const previousHomeReads = homeReads;
    await page.getByRole('link', { name: 'خانه', exact: true }).click();
    await page.getByRole('heading', { name: 'سلام، ' + name, exact: true }).waitFor();
    await homeOverview.waitFor();
    assert.ok(homeReads > previousHomeReads);
  }
  assert.equal(profileWrites, 2);
  console.log('PASS both save paths refresh the warm profile and home caches');
} finally {
  await browser.close();
}
