import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chromium } from '@playwright/test';

// Exercise the shipped player with real peer connections and simulated signaling.
const origin = process.env.CHAT_VIDEO_TEST_ORIGIN ?? 'http://127.0.0.1:5444';
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
let hostServer;
try {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 320, height: 720 } });
  hostServer = createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end('<style>body{margin:0}iframe{width:100vw;height:100vh;border:0}</style><iframe title="Call" allow="camera; microphone; autoplay" sandbox="allow-scripts allow-same-origin"></iframe>');
  }).listen(0, '127.0.0.1');
  await once(hostServer, 'listening');
  const host = new URL(`http://127.0.0.1:${hostServer.address().port}`);
  async function embed(page, code, mode = 'AUDIO') {
    const url = new URL('/mushroom-call.html', origin);
    url.search = new URLSearchParams({ mode, autoJoin: '1', embedOrigin: host.origin });
    url.hash = code;
    await page.locator('iframe').evaluate((iframe, src) => { iframe.src = src; }, url.href);
    await page.frameLocator('iframe').locator('#status').waitFor({ state: 'attached', timeout: 8000 });
    return page.frames().find(frame => frame.url().startsWith(origin + '/mushroom-call.html'));
  }
  const pages = await Promise.all([context.newPage(), context.newPage()]);
  const joined = new Set();
  let connected = 0;
  const deliver = (page, event, payload) => page.evaluate(([name, value]) => window.dispatchCallEvent(name, value), [event, payload]);
  await context.exposeBinding('callSignal', ({ frame }, event, payload) => {
    const page = frame.page();
    const other = pages.find(candidate => candidate !== page).frames()[1];
    if (event === 'join') {
      joined.add(page);
      void deliver(frame, 'serverInfo').catch(() => {});
      if (joined.size === 2) {
        void deliver(pages[1].frames()[1], 'addPeer', { peerId: 'left', shouldCreateOffer: false, iceServers: [] })
          .then(() => deliver(pages[0].frames()[1], 'addPeer', { peerId: 'right', shouldCreateOffer: true, iceServers: [] })).catch(() => {});
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
    const denyMic = location.hash === "#deny-mic";
    window.mediaRequests = [];
    window.RTCPeerConnection = class extends RTCPeerConnection {
      constructor(...args) {
        super(...args);
        window.testPeer = this;
      }
    };
    const get = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = options => {
      window.mediaRequests.push({ audio: Boolean(options.audio), video: Boolean(options.video) });
      if (denyMic) return Promise.reject(new DOMException('Test rejection', 'NotAllowedError'));
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

  await Promise.all(pages.map(page => page.goto(new URL('/call-host', host).href)));
  await pages[0].evaluate(() => {
    window.callRecovery = false;
    window.addEventListener('message', event => {
      if (event.data?.type === 'mushroom-call:recover') window.callRecovery = true;
    });
  });
  await embed(pages[0], 'deny-mic');
  await pages[0].waitForFunction(() => window.callRecovery);
  const frames = await Promise.all(pages.map((page, index) => embed(page, 'fresh-' + index)));
  await Promise.all(frames.map(page => page.waitForFunction(() => document.querySelector('#status').textContent.includes('تماس برقرار'))));
  for (const page of frames) {
    assert.deepEqual(await page.evaluate(() => window.mediaRequests), [{ audio: true, video: false }]);
    assert.equal(await page.locator('#connect').isVisible(), false);
    assert.equal(await page.locator('.avatar').isVisible(), false);
    const end = await page.locator('#end').boundingBox();
    assert.ok(end.width >= 48 && end.height >= 48);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  }
  await Promise.all(frames.map(page => page.waitForFunction(() => {
    const audio = document.querySelector('#remote-audio');
    const video = document.querySelector('#remote');
    return audio.currentTime > 0 && audio.srcObject?.getAudioTracks().length === 1
      && audio.srcObject.getVideoTracks().length === 0 && video.muted
      && !video.srcObject?.getAudioTracks().length && video.videoWidth === 0
      && document.querySelector('#audio').hidden;
  })));
  assert.ok(connected >= 2);

  await frames[0].evaluate(() => {
    Object.defineProperty(window.testPeer, 'connectionState', { value: 'disconnected', configurable: true });
    window.testPeer.dispatchEvent(new Event('connectionstatechange'));
  });
  assert.equal(await frames[0].locator('#status').textContent(), 'در حال اتصال مجدد…');
  await frames[0].waitForFunction(() => document.querySelector('#duration').textContent !== '00:00');
  await frames[0].evaluate(() => {
    delete window.testPeer.connectionState;
    window.testPeer.dispatchEvent(new Event('connectionstatechange'));
  });
  assert.equal(await frames[0].locator('#status').textContent(), 'تماس برقرار است.');

  // Both offerer and answerer can add and remove video in the same active call.
  for (const [index, page] of frames.entries()) {
    const other = frames[1 - index];
    await page.locator('#camera').click();
    await page.waitForFunction(() => document.body.dataset.localVideo === 'true');
    await other.waitForFunction(() => document.body.dataset.remoteVideo === 'true' && document.querySelector('#remote').videoWidth > 0);
    await page.locator('#camera').click();
    await other.waitForFunction(() => document.body.dataset.remoteVideo === 'false');
    assert.equal(await other.locator('#status').textContent(), 'تماس برقرار است.');
  }
  await frames[0].locator('#end').click();
  await frames[0].waitForFunction(() => document.querySelector('#status').textContent.includes('پایان یافت'));
  await frames[1].waitForFunction(() => document.querySelector('#status').textContent.includes('پایان یافته'));
  console.log('Audio-only join, two-way camera switching, and hang-up passed.');
} finally {
  await browser.close();
  hostServer?.close();
}
