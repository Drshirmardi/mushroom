import { createServer } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Ga4Transport } from '../src/modules/analytics/ga4.transport';

describe('GA4 bounded transport (actual loopback HTTP)', () => {
  const requests: unknown[] = [];
  let status = 204;
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += String(chunk);
    requests.push({ method: req.method, body: JSON.parse(body) });
    res.statusCode = status; res.end();
  });
  const transport = new Ga4Transport(new ConfigService({ ANALYTICS_SERVER_ENABLED: 'true', PUBLIC_ANALYTICS_CONSENT: 'granted', PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST123', GA4_API_SECRET: 'synthetic-secret' }));
  beforeAll(async () => {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      const target = new URL(String(url));
      expect(target.origin).toBe('https://www.google-analytics.com');
      expect(target.pathname).toBe('/mp/collect');
      expect(target.searchParams.get('api_secret')).toBe('synthetic-secret');
      expect(options?.redirect).toBe('error'); expect(options?.signal).toBeDefined();
      return realFetch(`http://127.0.0.1:${(server.address() as { port: number }).port}`, options);
    });
  });
  afterAll(async () => { vi.restoreAllMocks(); await new Promise<void>(resolve => server.close(() => resolve())); });
  it('distinguishes submission, permanent errors and retryable server failures without returning secrets', async () => {
    expect(transport.enabled).toBe(true);
    expect(await transport.send({ events: [{ name: 'purchase' }] })).toBe('submitted');
    status = 400; expect(await transport.send({ events: [] })).toBe('permanent');
    status = 503; expect(await transport.send({ events: [] })).toBe('retry');
    expect(requests).toHaveLength(3);
    expect(requests[0]).toEqual({ method: 'POST', body: { events: [{ name: 'purchase' }] } });
  });
  it('defaults disabled and never treats missing consent/secret as collection authorization', () => {
    expect(new Ga4Transport(new ConfigService({})).enabled).toBe(false);
    expect(new Ga4Transport(new ConfigService({ ANALYTICS_SERVER_ENABLED: 'true', PUBLIC_ANALYTICS_CONSENT: 'denied', PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST123', GA4_API_SECRET: 'synthetic' })).enabled).toBe(false);
  });
  it('returns only a retry classification for network errors, without exposing the secret URL', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('synthetic URL contains api_secret=private'));
    expect(await transport.send({ events: [] })).toBe('retry');
  });
  it('adds DebugView marking only with explicit runtime opt-in and leaves the queued payload unchanged', async () => {
    status = 204;
    const debugTransport = new Ga4Transport(new ConfigService({ PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST123', GA4_API_SECRET: 'synthetic-secret', PUBLIC_ANALYTICS_DEBUG: 'true' }));
    const payload = { client_id: '123.456', events: [{ name: 'purchase', params: { amount_rial: 10000 } }] };
    expect(await debugTransport.send(payload)).toBe('submitted');
    expect(requests.at(-1)).toMatchObject({ body: { events: [{ params: { amount_rial: 10000, debug_mode: true } }] } });
    expect(payload.events[0].params).not.toHaveProperty('debug_mode');
    expect(await transport.send(payload)).toBe('submitted');
    expect(requests.at(-1)).toMatchObject({ body: payload });
    expect(JSON.stringify(requests.at(-1))).not.toContain('debug_mode');
  });
});
