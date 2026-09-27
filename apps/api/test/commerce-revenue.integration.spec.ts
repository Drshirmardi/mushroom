import { randomUUID } from 'node:crypto';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('commerce revenue (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let tokens: AccessTokenService;
  const orderIds = new Set<string>(); const paymentIds = new Set<string>(); const attemptIds = new Set<string>(); const configIds = new Set<string>(); const profileIds = new Set<string>(); const userIds = new Set<string>(); const clinicIds = new Set<string>();
  const providerOrder = () => BigInt(Date.now()) * 1_000_000n + BigInt(Math.floor(Math.random() * 1_000_000));

  beforeAll(async () => { app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); tokens = app.get(AccessTokenService); }, 30_000);
  afterAll(async () => { await app.close(); });
  afterEach(async () => {
    await prisma.refund.deleteMany({ where: { paymentId: { in: [...paymentIds] } } });
    await prisma.payment.deleteMany({ where: { id: { in: [...paymentIds] } } });
    await prisma.paymentAttempt.deleteMany({ where: { id: { in: [...attemptIds] } } });
    await prisma.commerceOrder.deleteMany({ where: { id: { in: [...orderIds] } } });
    await prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica'); await tx.paymentProviderConfigRevision.deleteMany({ where: { configId: { in: [...configIds] } } }); await tx.paymentProviderConfig.deleteMany({ where: { id: { in: [...configIds] } } }); });
    await prisma.patientProfile.deleteMany({ where: { id: { in: [...profileIds] } } });
    await prisma.user.deleteMany({ where: { id: { in: [...userIds] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [...clinicIds] } } });
    orderIds.clear(); paymentIds.clear(); attemptIds.clear(); configIds.clear(); profileIds.clear(); userIds.clear(); clinicIds.clear();
  });

  const patient = async (clinicId: string) => {
    const user = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }); userIds.add(user.id);
    const profile = await prisma.patientProfile.create({ data: { userId: user.id, clinicId } }); profileIds.add(profile.id);
    return profile;
  };
  const configRevision = async (clinicId: string) => {
    const config = await prisma.paymentProviderConfig.create({ data: { clinicId, providerCode: `revenue-test-${randomUUID().slice(0, 12)}`, providerUnit: 'TEST', enabled: false, goLiveReady: false } }); configIds.add(config.id);
    return prisma.paymentProviderConfigRevision.create({ data: { configId: config.id, revisionNumber: 1, providerUnit: 'TEST', goLiveReady: false, capabilitySnapshot: {} } });
  };
  const verifiedPayment = async (clinicId: string, patientId: string, revisionId: string, amount: bigint, verifiedAt: Date) => {
    const order = await prisma.commerceOrder.create({ data: { clinicId, patientId, idempotencyKey: `revenue-${randomUUID()}`, shippingMethod: 'PICKUP', subtotalAmountToman: amount, totalAmountToman: amount } }); orderIds.add(order.id);
    const attempt = await prisma.paymentAttempt.create({ data: { clinicId, patientId, orderId: order.id, providerConfigRevisionId: revisionId, providerOrderId: providerOrder(), commerceAmountToman: amount, providerAmount: amount * 10n, providerUnit: 'IRR_TEST_ONLY', status: 'VERIFIED', idempotencyKey: `revenue-attempt-${randomUUID()}`, verifiedAt } }); attemptIds.add(attempt.id);
    const payment = await prisma.payment.create({ data: { orderId: order.id, paymentAttemptId: attempt.id, commerceAmountToman: amount, providerAmount: amount * 10n, providerUnit: 'IRR_TEST_ONLY', providerReferenceId: `ref-${randomUUID()}`, status: 'VERIFIED', verifiedAt } }); paymentIds.add(payment.id);
    return { order, attempt, payment };
  };

  it('returns a truthful empty range instead of a synthetic revenue total', async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const admin = await tokens.issue({ userId: randomUUID(), sessionId: randomUUID(), roles: ['ADMIN'] });
    const response = await app.inject({ method: 'GET', url: `/v1/admin/commerce/revenue?clinicId=${clinic.id}&from=2035-01-01&to=2035-01-01`, headers: { authorization: `Bearer ${admin}` } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ clinicId: clinic.id, currency: 'TOMAN', sourceStatus: 'current', revenueLabel: 'operational revenue', grossCapturedToman: '0', completedRefundToman: '0', netRevenueToman: '0', successfulPaymentCount: 0, series: [] });
  });

  it('uses only verified Payment and completed Refund TOMAN facts, with clinic-local boundaries and ADMIN authorization', async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const primary = await patient(clinic.id); const revision = await configRevision(clinic.id);
    const first = await verifiedPayment(clinic.id, primary.id, revision.id, 100_000n, new Date('2026-03-20T20:29:00.000Z'));
    const second = await verifiedPayment(clinic.id, primary.id, revision.id, 200_000n, new Date('2026-03-20T20:30:00.000Z'));
    await prisma.refund.createMany({ data: [
      { paymentId: first.payment.id, amountToman: 20_000n, status: 'COMPLETED', idempotencyKey: `completed-${randomUUID()}`, completedAt: new Date('2026-03-20T20:29:30.000Z'), evidenceReference: 'bank-transfer-1' },
      { paymentId: second.payment.id, amountToman: 15_000n, status: 'COMPLETED', idempotencyKey: `completed-${randomUUID()}`, completedAt: new Date('2026-03-20T20:30:30.000Z'), evidenceReference: 'bank-transfer-2' },
      { paymentId: second.payment.id, amountToman: 10_000n, status: 'REQUESTED', idempotencyKey: `requested-${randomUUID()}` },
      { paymentId: second.payment.id, amountToman: 10_000n, status: 'APPROVED', idempotencyKey: `approved-${randomUUID()}` },
      { paymentId: second.payment.id, amountToman: 10_000n, status: 'MANUAL_EXECUTION_PENDING', idempotencyKey: `pending-${randomUUID()}` },
      { paymentId: second.payment.id, amountToman: 10_000n, status: 'REJECTED', idempotencyKey: `rejected-${randomUUID()}` },
    ] });
    const pendingOrder = await prisma.commerceOrder.create({ data: { clinicId: clinic.id, patientId: primary.id, idempotencyKey: `pending-order-${randomUUID()}`, shippingMethod: 'PICKUP', subtotalAmountToman: 999_999n, totalAmountToman: 999_999n } }); orderIds.add(pendingOrder.id);
    const inactive = await prisma.clinic.create({ data: { name: `Revenue isolation ${randomUUID()}`, timeZone: clinic.timeZone, status: 'INACTIVE' } }); clinicIds.add(inactive.id);
    const foreignPatient = await patient(inactive.id); const foreignRevision = await configRevision(inactive.id); await verifiedPayment(inactive.id, foreignPatient.id, foreignRevision.id, 777_777n, new Date('2026-03-20T20:30:00.000Z'));
    const admin = await tokens.issue({ userId: randomUUID(), sessionId: randomUUID(), roles: ['ADMIN'] });
    const staff = await tokens.issue({ userId: randomUUID(), sessionId: randomUUID(), roles: ['STAFF'] });
    const denied = await app.inject({ method: 'GET', url: '/v1/admin/commerce/revenue?from=2026-03-20&to=2026-03-21', headers: { authorization: `Bearer ${staff}` } }); expect(denied.statusCode).toBe(403);
    const response = await app.inject({ method: 'GET', url: `/v1/admin/commerce/revenue?clinicId=${clinic.id}&from=2026-03-20&to=2026-03-21&granularity=DAY`, headers: { authorization: `Bearer ${admin}` } });
    expect(response.statusCode).toBe(200); expect(response.json()).toMatchObject({ clinicId: clinic.id, currency: 'TOMAN', timeZone: clinic.timeZone, sourceStatus: 'current', revenueLabel: 'operational revenue', from: '2026-03-20', to: '2026-03-21', grossCapturedToman: '300000', completedRefundToman: '35000', netRevenueToman: '265000', successfulPaymentCount: 2, series: [{ date: '2026-03-20', grossCapturedToman: '100000', completedRefundToman: '20000', netRevenueToman: '80000', successfulPaymentCount: 1 }, { date: '2026-03-21', grossCapturedToman: '200000', completedRefundToman: '15000', netRevenueToman: '185000', successfulPaymentCount: 1 }] });
    const week = await app.inject({ method: 'GET', url: `/v1/admin/commerce/revenue?clinicId=${clinic.id}&from=2026-03-20&to=2026-03-21&granularity=WEEK`, headers: { authorization: `Bearer ${admin}` } }); expect(week.json().series).toHaveLength(1); expect(week.json().series[0]).toMatchObject({ date: '2026-03-16', netRevenueToman: '265000' });
    const month = await app.inject({ method: 'GET', url: `/v1/admin/commerce/revenue?clinicId=${clinic.id}&from=2026-03-20&to=2026-03-21&granularity=MONTH`, headers: { authorization: `Bearer ${admin}` } }); expect(month.json().series).toHaveLength(1); expect(month.json().series[0]).toMatchObject({ date: '2026-03', netRevenueToman: '265000' });
    const invalid = await app.inject({ method: 'GET', url: `/v1/admin/commerce/revenue?clinicId=${clinic.id}&from=2026-02-30&to=2026-03-01`, headers: { authorization: `Bearer ${admin}` } }); expect(invalid.statusCode).toBe(400);
    const unsupported = await app.inject({ method: 'GET', url: `/v1/admin/commerce/revenue?clinicId=${clinic.id}&paymentId=${randomUUID()}`, headers: { authorization: `Bearer ${admin}` } }); expect(unsupported.statusCode).toBe(400);
  });
});
