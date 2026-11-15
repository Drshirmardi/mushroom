import { createHash, createHmac } from 'node:crypto';
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

const contactTicket = 'a'.repeat(43);
const verifiedPhone = '+989121234567';
const context = { ipAddress: '127.0.0.1', requestId: 'req' };

function verifiedContact() {
  return {
    findUnique: vi.fn().mockResolvedValue({
      id: 'contact-id', status: 'VERIFIED', phone: verifiedPhone, consumedAt: null,
      ticketHash: createHash('sha256').update(contactTicket).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
    }),
  };
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

  it.each([
    ['ACTIVE', ['ADMIN']],
    ['ACTIVE', ['PATIENT', 'ADMIN']],
    ['DISABLED', ['PATIENT']],
  ])('rejects an ineligible account (%s, %j) before prompting for OTP', async (status, roles) => {
    const bale = service({
      baleContactChallenge: verifiedContact(),
      user: { findUnique: vi.fn().mockResolvedValue({ status, roles: roles.map(code => ({ role: { code } })) }) },
    });
    await expect(bale.completeContact(signed(), contactTicket, context)).rejects.toMatchObject({
      status: 403, response: { code: 'BALE_ACCOUNT_UNSUPPORTED' },
    });
  });

  it('returns the verified phone for an eligible existing patient', async () => {
    const bale = service({
      baleContactChallenge: verifiedContact(),
      user: { findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE', roles: [{ role: { code: 'PATIENT' } }] }) },
    });
    await expect(bale.completeContact(signed(), contactTicket, context)).resolves.toEqual({
      status: 'ACCOUNT_LINK_REQUIRED', phone: verifiedPhone,
    });
  });

  it('links a freshly verified patient and signs them in on the next launch', async () => {
    const user = { id: 'patient-id', phone: verifiedPhone, status: 'ACTIVE', roles: [{ role: { code: 'PATIENT' } }] };
    const identity = {
      create: vi.fn(),
      findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ user }),
    };
    const contact = { ...verifiedContact(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
    const prisma = {
      baleContactChallenge: contact,
      externalAuthIdentity: identity,
      auditEvent: { create: vi.fn() },
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      session: { findUnique: vi.fn().mockResolvedValue({
        userId: user.id, verifiedPhone, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
      }) },
    };
    const issue = vi.fn().mockResolvedValue({ accessToken: 'access' });
    const bale = service({ ...prisma, $transaction: (run: (tx: typeof prisma) => unknown) => run(prisma) }, { execute: issue });
    await expect(bale.exchange(signed(), context)).resolves.toEqual({ status: 'CONTACT_REQUIRED' });
    await bale.linkExisting(signed(), contactTicket, user.id, 'session-id', context);
    expect(identity.create).toHaveBeenCalledWith({
      data: { provider: 'BALE', providerUserId: '456789', userId: user.id },
    });
    await expect(bale.exchange(signed(), context)).resolves.toMatchObject({ status: 'AUTHENTICATED' });
  });

  it('creates a patient and issues a session for a verified new phone', async () => {
    const user = { id: 'new-patient', phone: verifiedPhone, status: 'ACTIVE', roles: [{ role: { code: 'PATIENT' } }] };
    const prisma = {
      baleContactChallenge: { ...verifiedContact(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      externalAuthIdentity: { findUnique: vi.fn().mockResolvedValue(null) },
      user: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(user) },
      role: { findUnique: vi.fn().mockResolvedValue({ id: 'patient-role' }) },
      clinic: { findFirst: vi.fn().mockResolvedValue({ id: 'clinic-id' }) },
      auditEvent: { create: vi.fn() },
    };
    const issue = vi.fn().mockResolvedValue({ accessToken: 'access' });
    const bale = service({ ...prisma, $transaction: (run: (tx: typeof prisma) => unknown) => run(prisma) }, { execute: issue });
    await expect(bale.completeContact(signed(), contactTicket, context)).resolves.toMatchObject({ status: 'AUTHENTICATED' });
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      phone: verifiedPhone,
      externalAuthIdentities: { create: { provider: 'BALE', providerUserId: '456789' } },
    }) }));
  });

  it('rejects linking when the OTP account has gained a privileged role', async () => {
    const transact = vi.fn();
    const bale = service({
      $transaction: transact,
      baleContactChallenge: verifiedContact(),
      session: { findUnique: vi.fn().mockResolvedValue({ userId: 'patient-id', verifiedPhone }) },
      user: { findUnique: vi.fn().mockResolvedValue({
        status: 'ACTIVE', phone: verifiedPhone, roles: [{ role: { code: 'PATIENT' } }, { role: { code: 'ADMIN' } }],
      }) },
    });
    await expect(bale.linkExisting(signed(), contactTicket, 'patient-id', 'session-id', context)).rejects.toMatchObject({
      status: 403, response: { code: 'BALE_ACCOUNT_UNSUPPORTED' },
    });
    expect(transact).not.toHaveBeenCalled();
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
    const transact = vi.fn(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx));
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
