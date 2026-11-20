import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Exercise the shipped player with real peer connections and simulated signaling.
const origin = process.env.CHAT_VIDEO_TEST_ORIGIN ?? 'http://localhost:5444';
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
try {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const pages = await Promise.all([context.newPage(), context.newPage()]);
  const joined = new Set();
  let connected = 0;
  const deliver = (page, event, payload) => page.evaluate(([name, value]) => window.dispatchCallEvent(name, value), [event, payload]);
  await context.exposeBinding('callSignal', ({ page }, event, payload) => {
    const other = pages.find(candidate => candidate !== page);
    if (event === 'join') {
      joined.add(page);
      void deliver(page, 'serverInfo').catch(() => {});
      if (joined.size === 2) {
        void deliver(pages[1], 'addPeer', { peerId: 'left', shouldCreateOffer: false, iceServers: [] })
          .then(() => deliver(pages[0], 'addPeer', { peerId: 'right', shouldCreateOffer: true, iceServers: [] })).catch(() => {});
      }
    }
    const peerId = page === pages[0] ? 'left' : 'right';
    if (event === 'relaySDP') void deliver(other, 'sessionDescription', { ...payload, peerId }).catch(() => {});
    if (event === 'relayICE') void deliver(other, 'iceCandidate', { ...payload, peerId }).catch(() => {});
    if (event === 'mushroom-connected') connected += 1;
    if (event === 'mushroom-end') void deliver(other, 'mushroom-ended').catch(() => {});
    return true;
  });
  await context.addInitScript(() => {
    window.mediaRequests = [];
    const get = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = options => {
      window.mediaRequests.push({ audio: Boolean(options.audio), video: Boolean(options.video) });
      return get(options);
    };
  });
  await context.route('**/socket.io/socket.io.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      window.io = () => {
        const handlers = new Map();
        window.dispatchCallEvent = (name, payload) => handlers.get(name)?.(payload);
        setTimeout(() => window.dispatchCallEvent('mushroom-lease', { callId: 'test-room' }), 0);
        return {
          on(name, handler) { handlers.set(name, handler); },
          emit(name, payload) { void window.callSignal(name, payload); },
          timeout() { return { emit(name, callback) { void window.callSignal(name).then(ok => callback(null, ok)); } }; },
          disconnect() {},
        };
      };
    `,
  }));

  await Promise.all(pages.map(page => page.goto(origin + '/mushroom-call.html?mode=AUDIO#synthetic')));
  await Promise.all(pages.map(page => page.locator('#connect').click()));
  await Promise.all(pages.map(page => page.waitForFunction(() => document.querySelector('#status').textContent.includes('تماس برقرار'))));
  for (const page of pages) {
    assert.deepEqual(await page.evaluate(() => window.mediaRequests), [{ audio: true, video: false }]);
  }
  assert.ok(connected >= 2);

  // Both offerer and answerer can add and remove video in the same active call.
  for (const [index, page] of pages.entries()) {
    const other = pages[1 - index];
    await page.locator('#camera').click();
    await page.waitForFunction(() => document.body.dataset.localVideo === 'true');
    await other.waitForFunction(() => document.body.dataset.remoteVideo === 'true' && document.querySelector('#remote').videoWidth > 0);
    await page.locator('#camera').click();
    await other.waitForFunction(() => document.body.dataset.remoteVideo === 'false');
    assert.equal(await other.locator('#status').textContent(), 'تماس برقرار است.');
  }
  await pages[0].locator('#end').click();
  await pages[0].waitForFunction(() => document.querySelector('#status').textContent.includes('پایان یافت'));
  await pages[1].waitForFunction(() => document.querySelector('#status').textContent.includes('پایان یافته'));
  console.log('Audio-only join, two-way camera switching, and hang-up passed.');
} finally {
  await browser.close();
}
