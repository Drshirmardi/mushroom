import { randomUUID } from 'node:crypto';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('commerce customer CRM (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let tokens: AccessTokenService;
  const clinicIds = new Set<string>(); const userIds = new Set<string>(); const profileIds = new Set<string>();
  const sessionIds = new Set<string>(); const orderIds = new Set<string>(); const paymentIds = new Set<string>();
  const attemptIds = new Set<string>(); const configIds = new Set<string>();
  const providerOrder = () => BigInt(Date.now()) * 1_000_000n + BigInt(Math.floor(Math.random() * 1_000_000));
  const phone = () => `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}`;

  beforeAll(async () => { app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); tokens = app.get(AccessTokenService); }, 30_000);
  afterAll(async () => { await app.close(); });
  afterEach(async () => {
    await prisma.patientAccessAudit.deleteMany({ where: { OR: [{ actorUserId: { in: [...userIds] } }, { patientId: { in: [...profileIds] } }] } });
    await prisma.refund.deleteMany({ where: { paymentId: { in: [...paymentIds] } } });
    await prisma.payment.deleteMany({ where: { id: { in: [...paymentIds] } } });
    await prisma.paymentAttempt.deleteMany({ where: { id: { in: [...attemptIds] } } });
    await prisma.commerceOrderLine.deleteMany({ where: { orderId: { in: [...orderIds] } } });
    await prisma.commerceOrder.deleteMany({ where: { id: { in: [...orderIds] } } });
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: { in: [...userIds] } } });
    await prisma.session.deleteMany({ where: { id: { in: [...sessionIds] } } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: [...userIds] } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: [...profileIds] } } });
    await prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica'); await tx.paymentProviderConfigRevision.deleteMany({ where: { configId: { in: [...configIds] } } }); await tx.paymentProviderConfig.deleteMany({ where: { id: { in: [...configIds] } } }); });
    await prisma.user.deleteMany({ where: { id: { in: [...userIds] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [...clinicIds] } } });
    clinicIds.clear(); userIds.clear(); profileIds.clear(); sessionIds.clear(); orderIds.clear(); paymentIds.clear(); attemptIds.clear(); configIds.clear();
  });

  const actor = async (roles: Array<'ADMIN' | 'PATIENT' | 'DOCTOR' | 'STAFF'>, options: { status?: 'ACTIVE' | 'DISABLED'; expiresAt?: Date; revokedAt?: Date; clinicId?: string } = {}) => {
    const user = await prisma.user.create({ data: { phone: phone(), status: options.status ?? 'ACTIVE' } }); userIds.add(user.id);
    const session = await prisma.session.create({ data: {
      userId: user.id,
      refreshTokenHash: randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', ''),
      expiresAt: options.expiresAt ?? new Date(Date.now() + 3_600_000),
      ...(options.revokedAt ? { revokedAt: options.revokedAt, revokedReason: 'ADMIN_REVOKED' } : {}),
    } }); sessionIds.add(session.id);
    if (options.clinicId) await prisma.clinicalClinicAccess.create({ data: { userId: user.id, clinicId: options.clinicId } });
    return { user, token: await tokens.issue({ userId: user.id, sessionId: session.id, roles }) };
  };
  const patient = async (clinicId: string, firstName: string, lastName: string, status: 'ACTIVE' | 'DISABLED' = 'ACTIVE') => {
    const user = await prisma.user.create({ data: { phone: phone(), status, userProfile: { create: { firstName, lastName } } } }); userIds.add(user.id);
    const profile = await prisma.patientProfile.create({ data: { userId: user.id, clinicId } }); profileIds.add(profile.id);
    return profile;
  };
  const revision = async (clinicId: string) => {
    const config = await prisma.paymentProviderConfig.create({ data: { clinicId, providerCode: `crm-${randomUUID().slice(0, 12)}`, providerUnit: 'TEST', enabled: false, goLiveReady: false } }); configIds.add(config.id);
    return prisma.paymentProviderConfigRevision.create({ data: { configId: config.id, revisionNumber: 1, providerUnit: 'TEST', goLiveReady: false, capabilitySnapshot: {} } });
  };
  const payment = async (clinicId: string, patientId: string, revisionId: string, amount: bigint, title: string, verifiedAt: Date) => {
    const order = await prisma.commerceOrder.create({ data: { clinicId, patientId, idempotencyKey: `crm-order-${randomUUID()}`, shippingMethod: 'PICKUP', subtotalAmountToman: amount, totalAmountToman: amount, lines: { create: { position: 1, skuCodeSnapshot: `SKU-${randomUUID().slice(0, 8)}`, productTitleSnapshot: title, quantity: 1, unitPriceToman: amount, lineTotalToman: amount } } } }); orderIds.add(order.id);
    const attempt = await prisma.paymentAttempt.create({ data: { clinicId, patientId, orderId: order.id, providerConfigRevisionId: revisionId, providerOrderId: providerOrder(), commerceAmountToman: amount, providerAmount: amount * 10n, providerUnit: 'IRR_TEST_ONLY', status: 'VERIFIED', idempotencyKey: `crm-attempt-${randomUUID()}`, verifiedAt } }); attemptIds.add(attempt.id);
    const verified = await prisma.payment.create({ data: { orderId: order.id, paymentAttemptId: attempt.id, commerceAmountToman: amount, providerAmount: amount * 10n, providerUnit: 'IRR_TEST_ONLY', providerReferenceId: `crm-ref-${randomUUID()}`, status: 'VERIFIED', verifiedAt } }); paymentIds.add(verified.id);
    return verified;
  };

  it('derives deterministic, paginated clinic-local customer facts from canonical commerce records and audits disclosure', async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const admin = await actor(['ADMIN'], { clinicId: clinic.id });
    const [potential, oneTime, returning, vip] = await Promise.all([
      patient(clinic.id, 'پریسا', 'بالقوه'), patient(clinic.id, 'مینا', 'یکبار'), patient(clinic.id, 'سارا', 'بازگشتی'), patient(clinic.id, 'ویپ', 'مشتری'),
    ]);
    const source = await revision(clinic.id);
    await payment(clinic.id, oneTime.id, source.id, 100_000n, 'محصول یک', new Date('2026-09-20T10:00:00.000Z'));
    await payment(clinic.id, returning.id, source.id, 200_000n, 'محصول دو', new Date('2026-09-21T10:00:00.000Z'));
    await payment(clinic.id, returning.id, source.id, 300_000n, 'محصول دو', new Date('2026-09-22T10:00:00.000Z'));
    const vipPayments = await Promise.all(Array.from({ length: 5 }, (_, index) => payment(clinic.id, vip.id, source.id, 100_000n, index < 3 ? 'محصول محبوب' : 'محصول دیگر', new Date(`2026-09-${23 + index}T10:00:00.000Z`))));
    await prisma.refund.create({ data: { paymentId: vipPayments[0]!.id, amountToman: 50_000n, status: 'COMPLETED', idempotencyKey: `crm-refund-${randomUUID()}`, completedAt: new Date('2026-09-28T10:00:00.000Z'), evidenceReference: 'crm-test-evidence' } });
    const foreign = await prisma.clinic.create({ data: { name: `CRM foreign ${randomUUID()}`, timeZone: clinic.timeZone, status: 'INACTIVE' } }); clinicIds.add(foreign.id);
    const foreignPatient = await patient(foreign.id, 'محرمانه', 'خارجی'); const foreignSource = await revision(foreign.id);
    await payment(foreign.id, foreignPatient.id, foreignSource.id, 999_999n, 'افشا نشود', new Date('2026-09-28T11:00:00.000Z'));

    const url = `/v1/admin/commerce/customers?clinicId=${clinic.id}&page=1&pageSize=2&sort=SUCCESSFUL_PURCHASE_COUNT&direction=DESC`;
    const response = await app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${admin.token}` } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ clinicId: clinic.id, currency: 'TOMAN', timeZone: clinic.timeZone, page: 1, pageSize: 2, totalCustomerCount: 4, summary: { totalCustomerCount: 4, vipCustomerCount: 1, netSpendToman: '1050000', averageNetSpendToman: '262500' } });
    expect(response.json().items).toEqual(expect.arrayContaining([expect.objectContaining({ patientId: vip.id, segment: 'VIP', successfulPurchaseCount: 5, grossToman: '500000', completedRefundToman: '50000', netSpendToman: '450000', topProduct: 'محصول محبوب' }), expect.objectContaining({ patientId: returning.id, segment: 'RETURNING', successfulPurchaseCount: 2 })]));
    const potentialResponse = await app.inject({ method: 'GET', url: `/v1/admin/commerce/customers?clinicId=${clinic.id}&segment=POTENTIAL&search=%D9%BE%D8%B1%DB%8C%D8%B3%D8%A7`, headers: { authorization: `Bearer ${admin.token}` } });
    expect(potentialResponse.statusCode).toBe(200); expect(potentialResponse.json()).toMatchObject({ totalCustomerCount: 1, summary: { totalCustomerCount: 1, netSpendToman: '0', averageNetSpendToman: '0' }, items: [expect.objectContaining({ patientId: potential.id, segment: 'POTENTIAL' })] });
    const pastEnd = await app.inject({ method: 'GET', url: `/v1/admin/commerce/customers?clinicId=${clinic.id}&page=99&pageSize=25`, headers: { authorization: `Bearer ${admin.token}` } });
    expect(pastEnd.statusCode).toBe(200); expect(pastEnd.json()).toMatchObject({ totalCustomerCount: 4, summary: { totalCustomerCount: 4, netSpendToman: '1050000' }, items: [] });
    const forbiddenScope = await app.inject({ method: 'GET', url: `/v1/admin/commerce/customers?clinicId=${foreign.id}`, headers: { authorization: `Bearer ${admin.token}` } });
    expect(forbiddenScope.statusCode).toBe(403); expect(forbiddenScope.body).not.toContain('محرمانه');
    for (const invalid of ['page=0', 'segment=UNKNOWN', 'sort=UNKNOWN', 'paymentId=00000000-0000-4000-8000-000000000001']) {
      const invalidResponse = await app.inject({ method: 'GET', url: `/v1/admin/commerce/customers?clinicId=${clinic.id}&${invalid}`, headers: { authorization: `Bearer ${admin.token}` } });
      expect(invalidResponse.statusCode).toBe(400);
    }
    const audits = await prisma.patientAccessAudit.findMany({ where: { actorUserId: admin.user.id, clinicId: clinic.id, resourceType: 'ADMIN_COMMERCE_CUSTOMER_CRM' }, select: { patientId: true, metadata: true } });
    expect(audits).not.toHaveLength(0);
    expect(audits.every((audit) => {
      const metadata = audit.metadata as { source?: string; redaction?: string };
      return audit.patientId !== foreignPatient.id && metadata.source === 'COMMERCE_CUSTOMER_CRM' && metadata.redaction === 'NON_MEDICAL' && !Object.keys(metadata).some((key) => /token|payload|clinical/iu.test(key));
    })).toBe(true);
  });

  it('denies non-ADMIN, disabled, revoked, expired, and unassigned actors before CRM disclosure', async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const activeAdmin = await actor(['ADMIN']);
    const disabledAdmin = await actor(['ADMIN'], { status: 'DISABLED', clinicId: clinic.id });
    const revokedAdmin = await actor(['ADMIN'], { revokedAt: new Date(), clinicId: clinic.id });
    const expiredAdmin = await actor(['ADMIN'], { expiresAt: new Date(Date.now() + 250), clinicId: clinic.id });
    await new Promise((resolve) => setTimeout(resolve, 300));
    for (const role of ['PATIENT', 'DOCTOR', 'STAFF'] as const) {
      const principal = await actor([role], { clinicId: clinic.id });
      const response = await app.inject({ method: 'GET', url: `/v1/admin/commerce/customers?clinicId=${clinic.id}`, headers: { authorization: `Bearer ${principal.token}` } });
      expect(response.statusCode).toBe(403);
    }
    for (const principal of [activeAdmin, disabledAdmin, revokedAdmin, expiredAdmin]) {
      const response = await app.inject({ method: 'GET', url: `/v1/admin/commerce/customers?clinicId=${clinic.id}`, headers: { authorization: `Bearer ${principal.token}` } });
      expect(response.statusCode).toBe(principal === activeAdmin ? 403 : 401);
      expect(response.body).not.toContain('items');
    }
  });
});
