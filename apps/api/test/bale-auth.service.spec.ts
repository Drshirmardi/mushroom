import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { BaleAuthService } from '../src/modules/identity/bale/bale-auth.service';

const token = '123456789:test-token';
const webhookSecret = 'the-bale-webhook-secret-is-long-and-random-0123456789';
function signed(now = Math.floor(Date.now() / 1000)): string {
  const input = { auth_date: String(now), user: JSON.stringify({ id: 456789, first_name: 'Patient' }) };
  const key = createHmac('sha256', 'WebAppData').update(token).digest();
  const check = Object.entries(input).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  return new URLSearchParams({ ...input, hash: createHmac('sha256', key).update(check).digest('hex') }).toString();
}
function service(prisma: object, sessions: object = { execute: vi.fn() }) {
  return new BaleAuthService(
    prisma as never,
    new ConfigService({ BALE_AUTH_ENABLED: 'true', BALE_BOT_TOKEN: token, BALE_WEBHOOK_SECRET: webhookSecret }),
    sessions as never,
  );
}

describe('Bale account authentication boundaries', () => {
  it('does not issue a session for an unlinked Bale user', async () => {
    const issue = vi.fn();
    const bale = service({ externalAuthIdentity: { findUnique: vi.fn().mockResolvedValue(null) } }, { execute: issue });
    await expect(bale.exchange(signed(), { ipAddress: '127.0.0.1', requestId: 'req' })).resolves.toEqual({ status: 'CONTACT_REQUIRED' });
    expect(issue).not.toHaveBeenCalled();
  });

  it('reuses the normal session issuer only for an active patient account', async () => {
    const user = { id: 'patient-id', phone: '+989121234567', status: 'ACTIVE',
      roles: [{ role: { code: 'PATIENT' } }] };
    const issue = vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', user, refreshExpiresAt: new Date() });
    const bale = service({ externalAuthIdentity: { findUnique: vi.fn().mockResolvedValue({ user }) } }, { execute: issue });
    const result = await bale.exchange(signed(), { ipAddress: '127.0.0.1', requestId: 'req' });
    expect(result.status).toBe('AUTHENTICATED');
    expect(issue).toHaveBeenCalledWith(expect.objectContaining({ user: { id: user.id, phone: user.phone, roles: ['PATIENT'] } }));
  });

  it('refuses to sign in a privileged account through the patient mini-app', async () => {
    const user = { id: 'admin-id', phone: '+989121234567', status: 'ACTIVE',
      roles: [{ role: { code: 'PATIENT' } }, { role: { code: 'ADMIN' } }] };
    const bale = service({ externalAuthIdentity: { findUnique: vi.fn().mockResolvedValue({ user }) } });
    await expect(bale.exchange(signed(), { ipAddress: '127.0.0.1', requestId: 'req' })).rejects.toMatchObject({ status: 401 });
  });

  it('refuses forged contact updates where contact.user_id differs from message.from.id', async () => {
    const transact = vi.fn();
    const bale = service({ $transaction: transact });
    await bale.acceptWebhook(webhookSecret, {
      update_id: 100, message: { date: Math.floor(Date.now() / 1000), chat: { type: 'private' },
        from: { id: 456789 }, contact: { user_id: 1000, phone_number: '09123456789' } },
    });
    expect(transact).not.toHaveBeenCalled();
  });

  it('accepts a matching contact once under the webhook bearer secret', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { baleWebhookEvent: { createMany }, baleContactChallenge: { updateMany } };
    const transact = vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx));
    const bale = service({ $transaction: transact });
    const update = { update_id: 101, message: { date: Math.floor(Date.now() / 1000),
      chat: { type: 'private' }, from: { id: 456789 },
      contact: { user_id: 456789, phone_number: '09123456789' } } };
    await expect(bale.acceptWebhook('wrong-secret', update)).rejects.toMatchObject({ status: 401 });
    await bale.acceptWebhook(webhookSecret, update);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ providerUserId: '456789', status: 'PENDING' }),
      data: expect.objectContaining({ phone: '+989123456789', status: 'VERIFIED' }),
    }));
  });
});
