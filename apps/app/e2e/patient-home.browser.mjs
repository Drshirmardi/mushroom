import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const base = process.env.APP_URL ?? 'http://127.0.0.1:3017';
const id = '11111111-1111-4111-8111-111111111111';

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const requests = [];
  await page.route('**/v1/**', async route => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const headers = {
      'access-control-allow-origin': request.headers().origin ?? base,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    requests.push(pathname);
    const responses = {
      '/v1/auth/refresh': { accessToken: 'synthetic', expiresIn: 3600, user: { id, roles: ['PATIENT'] } },
      '/v1/patients/me/entry': { required: false },
      '/v1/patients/me/home': {
        setupSteps: [], isOnboardingComplete: true, nextAppointment: null, actions: [],
        latestAssessment: { id, title: 'Synthetic', completedAt: '2026-11-15T00:00:00Z', summary: {
          algorithmId: 'DIMENSION_TIEBREAK', primary: 'b', secondary: 'a', scores: { a: 5, b: 5 },
          dimensionTitles: [{ id: 'a', title: 'دموی' }, { id: 'b', title: 'صفراوی' }],
        } },
      },
      '/v1/patients/me/article-previews': { items: [{ id, slug: 'test', title: 'Synthetic article' }] },
    };
    return route.fulfill({ status: 200, headers, json: responses[pathname] ?? { items: [] } });
  });

  await page.goto(base);
  await page.getByRole('region', { name: 'وضعیت شما' }).waitFor();
  await page.getByText('Synthetic article').waitFor();
  assert.equal(await page.locator('.home-assessment-type strong').first().textContent(), 'صفراوی');
  assert.equal(requests.filter(path => path === '/v1/patients/me/home').length, 1);
  assert.ok(!requests.some(path => path.endsWith('/journey') || path.endsWith('/result') || path.endsWith('/articles')));
  console.log('PASS patient home uses the compact response and stored tie-break ranking');
} finally {
  await browser.close();
}
