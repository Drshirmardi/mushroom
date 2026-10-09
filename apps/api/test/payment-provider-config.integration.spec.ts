import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { createTestAccessToken } from './auth-test-support';
import { createReleaseAdminTestPrincipal, disposeReleaseAdminTestPrincipal, type ReleaseAdminTestPrincipal } from './release-admin-test-support';

describe('payment provider configuration (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication; let prisma: PrismaService; let tokens: AccessTokenService; let configId: string | undefined; let admin: ReleaseAdminTestPrincipal | undefined;
  const headers = (token: string, key?: string) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}) });
  beforeAll(async () => { process.env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64'); process.env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION = 'test-v1'; app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); tokens = app.get(AccessTokenService); }, 30_000);
  afterAll(async () => { if (configId) await prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica'); await tx.auditEvent.deleteMany({ where: { subjectType: 'PAYMENT_PROVIDER_CONFIG', subjectId: configId } }); await tx.paymentProviderConfigRevision.deleteMany({ where: { configId } }); await tx.paymentProviderCredentialVersion.deleteMany({ where: { configId } }); await tx.paymentProviderConfig.delete({ where: { id: configId } }); }); await disposeReleaseAdminTestPrincipal(prisma, admin); await app.close(); });
  it('is ADMIN-only, write-only, revision-idempotent and cannot enable Sadad', async () => {
    const adminPrincipal = await createReleaseAdminTestPrincipal(prisma, tokens); admin = adminPrincipal; const staff = (await createTestAccessToken(prisma, tokens, ['STAFF'])).token;
    expect((await app.inject({ method: 'GET', url: '/v1/admin/commerce/payment-providers', headers: headers(staff) })).statusCode).toBe(403);
    const key = `provider-${randomUUID()}`; const body = { credential: { terminalKey: 'synthetic-only', merchantId: 'synthetic-merchant' } };
    const first = await app.inject({ method: 'POST', url: '/v1/admin/commerce/payment-providers/sadad/config-revisions', headers: headers(adminPrincipal.token, key), payload: body }); expect(first.statusCode).toBe(201); expect(first.body).not.toContain('synthetic-only'); expect(first.json()).toMatchObject({ code: 'sadad', configured: true, enabled: false, isDefault: false, providerUnit: 'UNCONFIRMED' });
    const second = await app.inject({ method: 'POST', url: '/v1/admin/commerce/payment-providers/sadad/config-revisions', headers: headers(adminPrincipal.token, key), payload: body }); expect(second.statusCode).toBe(201); expect(second.json().activeRevisionNumber).toBe(first.json().activeRevisionNumber);
    const rotations = await Promise.all(['synthetic-rotated-a', 'synthetic-rotated-b'].map((terminalKey) => app.inject({ method: 'POST', url: '/v1/admin/commerce/payment-providers/sadad/config-revisions', headers: headers(adminPrincipal.token, `rotation-${randomUUID()}`), payload: { credential: { terminalKey, merchantId: 'synthetic-merchant' } } }))); expect(rotations.map(({ statusCode }) => statusCode)).toEqual([201, 201]); expect(rotations.map((response) => response.body).join()).not.toContain('synthetic-rotated'); expect(rotations.map((response) => response.json().activeRevisionNumber).sort()).toEqual([first.json().activeRevisionNumber + 1, first.json().activeRevisionNumber + 2]);
    const config = await prisma.paymentProviderConfig.findFirstOrThrow({ where: { providerCode: 'sadad' }, include: { credentialVersions: { orderBy: { versionNumber: 'asc' } } } }); configId = config.id; expect(config.credentialVersions).toHaveLength(3); expect(config.credentialVersions.map(({ status }) => status)).toEqual(['RETIRED', 'RETIRED', 'ACTIVE']); expect(Buffer.from(config.credentialVersions[0]!.encryptedPayload ?? []).toString('utf8')).not.toContain('synthetic-only');
    const blocked = await app.inject({ method: 'PATCH', url: '/v1/admin/commerce/payment-providers/sadad', headers: headers(adminPrincipal.token), payload: { enabled: true } }); expect(blocked.statusCode).toBe(503); expect(blocked.json().code).toBe('SADAD_GO_LIVE_BLOCKED');
    const callback = await app.inject({ method: 'POST', url: '/v1/payments/providers/sadad/callback', payload: { OrderId: '1', Token: 'synthetic' } }); expect(callback.statusCode).toBe(503); expect(callback.json().code).toBe('SADAD_GO_LIVE_BLOCKED');
  });
});
