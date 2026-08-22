import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/index';

describe('generated API client', () => {
  it('uses credentialed requests and the configured API base URL', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], page: 1, limit: 20, total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      fetch,
    });

    await client.GET('/v1/auth/sessions', {
      headers: { authorization: 'Bearer access-token' },
    });

    const request = fetch.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(Request);
    expect((request as Request).url).toBe(
      'https://api.example.test/v1/auth/sessions',
    );
    expect((request as Request).credentials).toBe('include');
    expect((request as Request).headers.get('authorization')).toBe(
      'Bearer access-token',
    );
  });
});
