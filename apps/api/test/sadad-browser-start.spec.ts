import { describe, expect, it, vi } from 'vitest';
import { buildSadadStartUrl, sadadStartDocument } from '../src/modules/commerce/payments/sadad-browser-start';
import { SadadCallbackController } from '../src/modules/commerce/payments/patient-payment-attempt.controller';

describe('merchant-origin Sadad browser start', () => {
  it('uses the configured merchant origin and keeps the token out of the HTTP request URL', () => {
    const token = 'synthetic+/=token';
    const url = new URL(buildSadadStartUrl('https://merchant.example.test/v1/payments/providers/sadad/callback', token));
    expect(url.origin).toBe('https://merchant.example.test');
    expect(url.pathname).toBe('/v1/payments/providers/sadad/start');
    expect(url.search).toBe('');
    expect(decodeURIComponent(url.hash.slice(1))).toBe(token);
    expect(() => buildSadadStartUrl('http://merchant.example.test/callback', token)).toThrow();
  });

  it('renders only a fixed bank destination and no token supplied to the server', () => {
    const html = sadadStartDocument('PHP_VPG_PURCHASE', 'synthetic-nonce');
    expect(html).toContain('https://sadad.shaparak.ir/VPG/Purchase?Token=SADAD_BROWSER_TOKEN');
    expect(html).toContain('nonce="synthetic-nonce"');
    expect(html).toContain('history.replaceState');
    expect(html).toContain('content="origin"');
  });

  it('serves an uncached HTML document with a unique CSP nonce and enforces its public rate limit', async () => {
    const consume = vi.fn().mockResolvedValue(true);
    const controller = new SadadCallbackController({} as never, { consume } as never, { settings: () => ({ redirectProfile: 'PHP_VPG_PURCHASE' }) } as never);
    const headers: Record<string, string> = {};
    const reply = { type: vi.fn().mockReturnThis(), header: vi.fn((key: string, value: string) => { headers[key] = value; return reply; }), send: vi.fn() };
    await controller.start({ ip: '127.0.0.1' } as never, reply as never);
    expect(headers['Cache-Control']).toBe('no-store');
    expect(headers['Referrer-Policy']).toBe('origin');
    const nonce = headers['Content-Security-Policy'].match(/nonce-([^']+)/)![1];
    expect(reply.send).toHaveBeenCalledWith(expect.stringContaining(`nonce="${nonce}"`));
    await controller.start({ ip: '127.0.0.1' } as never, reply as never);
    expect(headers['Content-Security-Policy']).not.toContain(nonce);
    consume.mockResolvedValue(false);
    await expect(controller.start({ ip: '127.0.0.1' } as never, reply as never)).rejects.toMatchObject({ status: 429 });
  });
});
