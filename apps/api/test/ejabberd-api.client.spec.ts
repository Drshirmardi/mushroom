import { afterEach, describe, expect, it, vi } from 'vitest';
import { EjabberdApiClient } from '../src/modules/communications/chat/ejabberd/ejabberd-api.client';
import type { EjabberdConfig } from '../src/modules/communications/chat/ejabberd/ejabberd.config';

const secureOptions = {
  persistent: 'true', members_only: 'true', public: 'false', public_list: 'false',
  allow_user_invites: 'false', allow_change_subj: 'false', allowpm: 'none',
  moderated: 'true', anonymous: 'true', mam: 'true', logging: 'false',
};
const client = () => new EjabberdApiClient({
  assertReady() {}, domain: 'chat.localhost', conference: 'conference.chat.localhost',
  apiUrl: 'http://127.0.0.1:5445/api/v2', timeoutMs: 3000, sign: () => 'unit-test-only',
} as unknown as EjabberdConfig);

afterEach(() => vi.restoreAllMocks());

describe('ejabberd 26.09 room provisioning', () => {
  it('uses allowpm and validates the API v2 options object', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('0'))
      .mockResolvedValueOnce(new Response(JSON.stringify(secureOptions)));
    await expect(client().ensureRoom('c-test')).resolves.toBeUndefined();
    const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
    expect(body.options).toContainEqual({ name: 'allowpm', value: 'none' });
    expect(body.options.some((item: { name: string }) => item.name === 'allow_private_messages')).toBe(false);
  });

  it('accepts an existing room only after reading its secure options', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('"Room already exists"', { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(secureOptions)));
    await expect(client().ensureRoom('c-test')).resolves.toBeUndefined();
  });

  it('rejects a room whose private-message setting is unsafe', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('0'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...secureOptions, allowpm: 'anyone' })));
    await expect(client().ensureRoom('c-test')).rejects.toMatchObject({ status: 503 });
  });
});
