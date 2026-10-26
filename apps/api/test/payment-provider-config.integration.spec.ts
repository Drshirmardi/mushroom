import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { createTestAccessToken } from './auth-test-support';
import { createReleaseAdminTestPrincipal, disposeReleaseAdminTestPrincipal, type ReleaseAdminTestPrincipal } from './release-admin-test-support';

describe('payment provider configuration (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication; let prisma: PrismaService; let tokens: AccessTokenService; let configId: string | undefined; let admin: ReleaseAdminTestPrincipal | undefined;
  const headers = (token: string, key?: string) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}) });
  beforeAll(async () => { process.env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64'); process.env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION = 'test-v1'; process.env.SADAD_TRANSPORT_MODE = 'live'; process.env.PUBLIC_API_URL = 'https://dev-api.example.test'; process.env.SADAD_RETURN_URL = 'https://dev-api.example.test/v1/payments/providers/sadad/callback'; process.env.SADAD_RESULT_URL = 'https://dev-app.example.test/store/order-success'; process.env.SADAD_REDIRECT_PROFILE = 'PHP_VPG_PURCHASE'; const { createApiApplication } = await import('../src/app.factory.js'); app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); tokens = app.get(AccessTokenService); }, 30_000);
  afterAll(async () => { const rateKeys = ['sadad-callback:ip:127.0.0.1', 'sadad-callback:order:1'].map((value) => createHash('sha256').update(value, 'utf8').digest('hex')); await prisma.authRateLimitBucket.deleteMany({ where: { key: { in: rateKeys } } }); if (configId) await prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica'); await tx.auditEvent.deleteMany({ where: { subjectType: 'PAYMENT_PROVIDER_CONFIG', subjectId: configId } }); await tx.paymentProviderConfigRevision.deleteMany({ where: { configId } }); await tx.paymentProviderCredentialVersion.deleteMany({ where: { configId } }); await tx.paymentProviderConfig.delete({ where: { id: configId } }); }); await disposeReleaseAdminTestPrincipal(prisma, admin); await app.close(); });
  it('is ADMIN-only, write-only, revision-idempotent and enables live Sadad only through admin state', async () => {
    const adminPrincipal = await createReleaseAdminTestPrincipal(prisma, tokens); admin = adminPrincipal; const staff = (await createTestAccessToken(prisma, tokens, ['STAFF'])).token;
    expect((await app.inject({ method: 'GET', url: '/v1/admin/commerce/payment-providers', headers: headers(staff) })).statusCode).toBe(403);
    const terminalKey = Buffer.alloc(24, 7).toString('base64'); const key = `provider-${randomUUID()}`; const body = { credential: { merchantId: 'synthetic-merchant', terminalId: 'synthetic-terminal', terminalKey } };
    expect((await app.inject({ method: 'POST', url: '/v1/admin/commerce/payment-providers/sadad/config-revisions', headers: headers(adminPrincipal.token, `empty-${randomUUID()}`), payload: {} })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/v1/admin/commerce/payment-providers/sadad/config-revisions', headers: headers(adminPrincipal.token, `missing-${randomUUID()}`), payload: { credential: { merchantId: 'synthetic-merchant', terminalKey } } })).statusCode).toBe(400);
    const invalidKey = await app.inject({ method: 'POST', url: '/v1/admin/commerce/payment-providers/sadad/config-revisions', headers: headers(adminPrincipal.token, `invalid-${randomUUID()}`), payload: { credential: { merchantId: 'synthetic-merchant', terminalId: 'synthetic-terminal', terminalKey: 'not-a-key' } } }); expect(invalidKey.statusCode).toBe(409); expect(invalidKey.json().code).toBe('PAYMENT_PROVIDER_CONFIGURATION_INVALID');
    const first = await app.inject({ method: 'POST', url: '/v1/admin/commerce/payment-providers/sadad/config-revisions', headers: headers(adminPrincipal.token, key), payload: body }); expect(first.statusCode).toBe(201); configId = (await prisma.paymentProviderConfig.findFirstOrThrow({ where: { providerCode: 'sadad' } })).id; expect(first.body).not.toContain(terminalKey); expect(first.body).not.toContain('synthetic-terminal'); expect(first.json()).toMatchObject({ code: 'sadad', configured: true, activationAvailable: true, enabled: false, isDefault: false, providerUnit: 'RIAL', goLiveReady: true });
    const second = await app.inject({ method: 'POST', url: '/v1/admin/commerce/payment-providers/sadad/config-revisions', headers: headers(adminPrincipal.token, key), payload: body }); expect(second.statusCode).toBe(201); expect(second.json().activeRevisionNumber).toBe(first.json().activeRevisionNumber);
    const rotations = await Promise.all([8, 9].map((fill) => app.inject({
      method: 'POST',
      url: '/v1/admin/commerce/payment-providers/sadad/config-revisions',
      headers: headers(adminPrincipal.token, `rotation-${randomUUID()}`),
      payload: { credential: { merchantId: 'synthetic-merchant', terminalId: 'synthetic-terminal', terminalKey: Buffer.alloc(24, fill).toString('base64') } },
    })));
    expect(rotations.map(({ statusCode }) => statusCode)).toEqual([201, 201]); expect(rotations.map((response) => response.json().activeRevisionNumber).sort()).toEqual([first.json().activeRevisionNumber + 1, first.json().activeRevisionNumber + 2]);
    const config = await prisma.paymentProviderConfig.findFirstOrThrow({ where: { providerCode: 'sadad' }, include: { credentialVersions: { orderBy: { versionNumber: 'asc' } } } }); configId = config.id; expect(config.credentialVersions).toHaveLength(3); expect(config.credentialVersions.map(({ status }) => status)).toEqual(['RETIRED', 'RETIRED', 'ACTIVE']); expect(Buffer.from(config.credentialVersions[0]!.encryptedPayload ?? []).toString('utf8')).not.toContain('synthetic-only');
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');
      await tx.paymentProviderConfig.update({ where: { id: config.id }, data: { providerUnit: 'UNCONFIRMED', goLiveReady: false } });
      await tx.paymentProviderConfigRevision.update({ where: { id: config.activeRevisionId! }, data: { providerUnit: 'UNCONFIRMED', goLiveReady: false } });
    });
    const enabled = await app.inject({ method: 'PATCH', url: '/v1/admin/commerce/payment-providers/sadad', headers: headers(adminPrincipal.token), payload: { enabled: true } }); expect(enabled.statusCode).toBe(200); expect(enabled.json()).toMatchObject({ enabled: true, goLiveReady: true, providerUnit: 'RIAL', activeRevisionNumber: first.json().activeRevisionNumber + 3 });
    const madeDefault = await app.inject({ method: 'PATCH', url: '/v1/admin/commerce/payment-providers/sadad', headers: headers(adminPrincipal.token), payload: { isDefault: true } }); expect(madeDefault.statusCode).toBe(200); expect(madeDefault.json()).toMatchObject({ enabled: true, isDefault: true });
    const disabled = await app.inject({ method: 'PATCH', url: '/v1/admin/commerce/payment-providers/sadad', headers: headers(adminPrincipal.token), payload: { enabled: false } }); expect(disabled.statusCode).toBe(200); expect(disabled.json()).toMatchObject({ enabled: false, isDefault: false });
    const callbackRequest = () => app.inject({ method: 'POST', url: '/v1/payments/providers/sadad/callback', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: 'OrderId=1&Token=synthetic&ResCode=0' });
    const callback = await callbackRequest(); expect(callback.statusCode).toBe(409); expect(callback.json().code).toBe('PAYMENT_VERIFICATION_MISMATCH');
    for (let replay = 1; replay < 12; replay += 1) expect((await callbackRequest()).statusCode).toBe(409);
    const limited = await callbackRequest(); expect(limited.statusCode).toBe(429); expect(limited.json().code).toBe('PAYMENT_CALLBACK_RATE_LIMITED');
  });
});
