import { Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { WalletService } from '../src/modules/billing/wallet.service';
import { BillingService } from '../src/modules/billing/billing.service';
import { BillingGatewayService } from '../src/modules/billing/billing-gateway.service';
import { BillingReportingService } from '../src/modules/billing/billing-reporting.service';
import { PaymentProviderRegistry } from '../src/modules/commerce/payments/payment-provider.registry';
import { PaymentCredentialCryptoService } from '../src/modules/commerce/payments/payment-credential-crypto.service';
import { SadadRuntimeConfigService } from '../src/modules/commerce/payments/sadad-runtime-config.service';
import type { PaymentProviderPort } from '../src/modules/commerce/payments/payment-provider.port';
import { CommerceCheckoutService } from '../src/modules/commerce/checkout/commerce-checkout.service';
import { OrderBillingTarget } from '../src/modules/commerce/payments/order-billing.target';
import { PatientAvailabilityService } from '../src/modules/scheduling/patient-availability.service';
import { PatientAppointmentsService } from '../src/modules/appointments/patient-appointments.service';
import { OutboxWorker } from '../src/modules/outbox/outbox.worker';
import { createTestAccessToken } from './auth-test-support';

// Immutable financial fixtures are retained until the disposable database is removed.
describe.skipIf(process.env.WALLET_BILLING_TEST_ISOLATED !== '1')('shared wallet/billing (real PostgreSQL, simulated PSP)', () => {
  let app: NestFastifyApplication; let db: PrismaService; let wallet: WalletService; let billing: BillingService; let gateway: BillingGatewayService;
  let clinicId: string; let admin: Awaited<ReturnType<typeof createTestAccessToken>>; let revisionId: string;
  const providerRequests = new Map<string, { amount: bigint; orderId: bigint }>();
  let creates = 0; let verifyTimeout = false;
  const sessions = new Map<string, string>();
  const context = (userId = admin.userId) => ({ actorUserId: userId, actorSessionId: sessions.get(userId) ?? admin.sessionId, requestId: `wallet-test:${randomUUID()}`, ipAddress: '127.0.0.1' });
  const headers = (token: string, key = randomUUID()) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000', 'idempotency-key': key });
  const fake: PaymentProviderPort = {
    descriptor: { code: 'sadad', displayName: 'Synthetic test PSP', capabilities: { createPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', parseCallback: 'SUPPORTED_WHEN_GO_LIVE_READY', verifyPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', sandbox: 'UNSUPPORTED', inquiry: 'UNSUPPORTED', webhook: 'UNSUPPORTED', refund: 'UNSUPPORTED', partialRefund: 'UNSUPPORTED' } },
    async createPayment(input) { creates++; const token = `synthetic-${input.providerOrderId}`; providerRequests.set(token, { amount: input.providerAmount, orderId: input.providerOrderId }); return { providerResultCode: '0', token, redirectUrl: `https://sadad.shaparak.ir/Purchase?Token=${token}` }; },
    parseCallback(input) { const value = input as Record<string, string>; return { providerOrderId: BigInt(value.OrderId), token: value.Token, resultCode: value.ResCode }; },
    async verifyPayment({ token }) { if (verifyTimeout) throw new Error('Synthetic timeout'); const input = providerRequests.get(token)!; return { resultCode: '100', providerOrderId: input.orderId, amount: input.amount, referenceId: `reference-${input.orderId}`, traceNumber: `trace-${input.orderId}` }; },
  };
  beforeAll(async () => {
    const database = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(database.hostname) || !(database.pathname === '/wallet_test' || ['/wallet_program_purchase_test','/wallet_custom_delivery_test'].includes(database.pathname) && database.port === '55419')) throw new Error('Wallet integration tests require an explicit dedicated disposable local wallet database.');
    Logger.overrideLogger(false);
    app = await createApiApplication(); await app.init(); db = app.get(PrismaService); wallet = app.get(WalletService); billing = app.get(BillingService); gateway = app.get(BillingGatewayService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    admin = await createTestAccessToken(db, app.get(AccessTokenService), ['ADMIN']);
    await db.clinicalClinicAccess.create({ data: { clinicId, userId: admin.userId } });
    app.get(PaymentProviderRegistry).register(fake);
    const runtime = app.get(SadadRuntimeConfigService);
    vi.spyOn(runtime, 'settings').mockReturnValue({ returnUrl: 'https://api.example.test/v1/payments/providers/sadad/callback', resultUrl: 'https://app.example.test/store/order-success', redirectProfile: 'PHP_VPG_PURCHASE', timeoutMs: 1000 });
    vi.spyOn(runtime, 'live', 'get').mockReturnValue(true);
    const encrypted = app.get(PaymentCredentialCryptoService).encrypt({ merchantId: 'synthetic', terminalId: '123', terminalKey: Buffer.alloc(24, 7).toString('base64') });
    const config = await db.paymentProviderConfig.upsert({ where: { clinicId_providerCode: { clinicId, providerCode: 'sadad' } }, create: { clinicId, providerCode: 'sadad', providerUnit: 'RIAL' }, update: { enabled: false, isDefault: false } });
    const version = (await db.paymentProviderCredentialVersion.count({ where: { configId: config.id } })) + 1;
    const secret = await db.paymentProviderCredentialVersion.create({ data: { configId: config.id, versionNumber: version, encryptedPayload: new Uint8Array(encrypted.ciphertext), encryptionNonce: new Uint8Array(encrypted.nonce), authenticationTag: new Uint8Array(encrypted.tag), encryptionKeyVersion: encrypted.keyVersion } });
    const revision = await db.paymentProviderConfigRevision.create({ data: { configId: config.id, revisionNumber: version, providerUnit: 'RIAL', goLiveReady: true, credentialVersionId: secret.id } }); revisionId = revision.id;
    await db.paymentProviderConfig.update({ where: { id: config.id }, data: { activeRevisionId: revision.id, enabled: true, isDefault: true, goLiveReady: true } });
  }, 30000);
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });

  async function patient(complete = false) {
    const session = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT']);
    sessions.set(session.userId, session.sessionId);
    const profile = await db.patientProfile.create({ data: { userId: session.userId, clinicId } });
    if (complete) {
      await db.userProfile.create({ data: { userId: session.userId, firstName: 'Synthetic', lastName: 'Patient' } });
      const policy = await db.consentPolicyVersion.findFirstOrThrow({ where: { clinicId, policyKey: 'MEDICAL_INTAKE_PROCESSING', locale: 'fa-IR', status: 'ACTIVE' } });
      const consent = await db.patientConsentRecord.create({ data: { patientId: profile.id, policyVersionId: policy.id, contentHash: policy.contentHash, acceptedByUserId: session.userId, acceptanceIdempotencyKey: randomUUID() } });
      const intake = await db.patientMedicalIntake.create({ data: { patientId: profile.id, clinicId, currentRevisionNumber: 1, completedRevisionNumber: 1, submissionState: 'COMPLETE' } });
      await db.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: 1, assignedSchemaVersion: 1, revisionState: 'COMPLETE', birthDate: new Date('1990-01-01T00:00:00Z'), sexAtBirth: 'FEMALE', allergyReport: { status: 'NONE', items: [] }, chronicConditionReport: { status: 'UNKNOWN', items: [] }, currentMedicationReport: { status: 'NONE', items: [] }, completedAt: new Date(), completedConsentRecordId: consent.id, mutationOperation: 'COMPLETE', mutationKey: randomUUID(), recordingMode: 'PATIENT_ENTRY', reportedPatientId: profile.id, payloadHash: createHash('sha256').update(randomUUID()).digest('hex') } });
    }
    return { ...session, profile };
  }
  async function credit(p: Awaited<ReturnType<typeof patient>>, amountToman: string) {
    const current = await wallet.summary(p.profile);
    return wallet.adjust(context(), p.profile.id, { type: 'CREDIT', amountToman, expectedVersion: current.version, reason: 'Synthetic admin funding' }, randomUUID());
  }
  async function order(p: Awaited<ReturnType<typeof patient>>, price = 1000n) {
    const suffix = randomUUID();
    const category = await db.commerceCategory.create({ data: { clinicId, name: suffix, slug: suffix } });
    const product = await db.commerceProduct.create({ data: { clinicId, categoryId: category.id, title: 'Synthetic product', slug: suffix, status: 'ACTIVE' } });
    const sku = await db.commerceSku.create({ data: { clinicId, productId: product.id, code: suffix, currentPriceToman: price, currentTaxToman: 0n, isActive: true, inventoryItem: { create: { clinicId, onHandQuantity: 10 } } } });
    await db.commerceCart.create({ data: { clinicId, patientId: p.profile.id, items: { create: { skuId: sku.id, quantity: 1 } } } });
    return app.get(CommerceCheckoutService).checkout(p.userId, randomUUID(), { shippingMethod: 'PICKUP' }, context(p.userId));
  }
  async function appointmentInput(p: Awaited<ReturnType<typeof patient>>) {
    const offering = await db.doctorService.findFirstOrThrow({ where: { clinicId, isActive: true, publicationStatus: 'PUBLISHED', priceAmount: { gt: 0 } } });
    const fromDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10); const toDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const slots = await app.get(PatientAvailabilityService).get(p.userId, offering.id, { fromDate, toDate, page: 1, pageSize: 100 });
    const allocated = await db.appointment.findMany({ where: { doctorId: offering.doctorId, status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] } }, select: { startsAt: true } });
    const held = await db.appointmentHold.findMany({ where: { doctorId: offering.doctorId, releasedAt: null, expiresAt: { gt: new Date() } }, select: { startsAt: true } });
    const slot = slots.items.find(s => ![...allocated, ...held].some(a => a.startsAt.getTime() === s.startsAt.getTime()))!;
    expect(slot).toBeDefined(); return { doctorServiceId: offering.id, startsAt: slot.startsAt.toISOString() };
  }

  it('ADMIN can credit/debit/set from patient detail, with replay, version checks, ownership and private-reason redaction', async () => {
    await db.userProfile.create({ data: { userId: admin.userId, firstName: 'Synthetic', lastName: 'Administrator' } });
    const p = await patient(); const key = randomUUID(); const path = `/v1/admin/patients/${p.profile.id}/wallet`;
    const initial = await app.inject({ method: 'GET', url: path, headers: headers(admin.token) }); expect(initial.statusCode).toBe(200); expect(initial.json()).toMatchObject({ balanceRial: '0', version: 0 });
    const payload = { type: 'CREDIT', amountToman: '۲۰۰', expectedVersion: 0, reason: 'Private administrative explanation' };
    const first = await app.inject({ method: 'POST', url: `${path}/adjustments`, headers: headers(admin.token, key), payload }); expect(first.statusCode).toBe(201); expect(first.json()).toMatchObject({ balanceRial: '2000', version: 1 });
    const replay = await app.inject({ method: 'POST', url: `${path}/adjustments`, headers: headers(admin.token, key), payload }); expect(replay.json()).toEqual(first.json());
    const changed = await app.inject({ method: 'POST', url: `${path}/adjustments`, headers: headers(admin.token, key), payload: { ...payload, amountToman: '201' } }); expect(changed.statusCode).toBe(409); expect(changed.json().code).toBe('IDEMPOTENCY_KEY_REUSED');
    const stale = await app.inject({ method: 'POST', url: `${path}/adjustments`, headers: headers(admin.token), payload: { ...payload, type: 'SET_BALANCE', amountToman: '50' } }); expect(stale.json().code).toBe('WALLET_VERSION_CONFLICT');
    await wallet.adjust(context(), p.profile.id, { type: 'DEBIT', amountToman: '30', expectedVersion: 1, reason: 'Decrease' }, randomUUID());
    const set = await wallet.adjust(context(), p.profile.id, { type: 'SET_BALANCE', amountToman: '50', expectedVersion: 2, reason: 'Target balance' }, randomUUID()); expect(set).toMatchObject({ balanceRial: '500', deltaRial: '-1200' });
    const denied = await app.inject({ method: 'POST', url: `${path}/adjustments`, headers: headers(p.token), payload }); expect(denied.statusCode).toBe(403);
    const foreignAdmin = await createTestAccessToken(db, app.get(AccessTokenService), ['ADMIN']);
    expect((await app.inject({ method: 'GET', url: path, headers: headers(foreignAdmin.token) })).statusCode).toBe(403);
    const history = await app.inject({ method: 'GET', url: '/v1/patients/me/wallet/transactions', headers: headers(p.token) }); expect(history.statusCode).toBe(200); expect(history.json().total).toBe(3); expect(history.body).not.toContain('Private administrative'); expect(history.body).not.toContain('actorUserId');
    const adminHistory = await app.inject({ method: 'GET', url: `${path}/transactions`, headers: headers(admin.token) }); expect(adminHistory.json().items[0].actorDisplayName).toBe('Synthetic Administrator');
    const zero = await wallet.adjust(context(), p.profile.id, { type: 'SET_BALANCE', amountToman: '0', expectedVersion: 3, reason: 'Clear balance' }, randomUUID()); expect(zero).toMatchObject({ balanceRial: '0' });
    await expect(wallet.adjust(context(), p.profile.id, { type: 'DEBIT', amountToman: '1', expectedVersion: 4, reason: 'Insufficient' }, randomUUID())).rejects.toMatchObject({ response: { code: 'WALLET_INSUFFICIENT_FUNDS' } });
  });

  it('validates financial inputs and keys at the HTTP boundary, with no client-selected patient scope', async () => {
    const p = await patient(); const path = '/v1/patients/me/wallet/topups';
    for (const payload of [{ amountToman: '-1' }, { amountToman: '0.5' }, { amountToman: 50 }, { amountToman: '10', patientId: randomUUID() }]) {
      expect((await app.inject({ method: 'POST', url: path, headers: headers(p.token), payload })).statusCode).toBe(400);
    }
    const withoutKey = headers(p.token); delete (withoutKey as Record<string, string>)['idempotency-key'];
    expect((await app.inject({ method: 'POST', url: path, headers: withoutKey, payload: { amountToman: '10' } })).json().code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    expect(await db.billingIntent.count({ where: { patientId: p.profile.id } })).toBe(0);
  });

  it('database rejects history mutation, unbalanced entries and a raw balance overwrite', async () => {
    const p = await patient(); await credit(p, '10'); const account = await db.walletAccount.findUniqueOrThrow({ where: { patientId: p.profile.id } });
    await expect(db.walletAccount.update({ where: { id: account.id }, data: { balanceRial: 999n } })).rejects.toThrow();
    const journal = await db.walletJournal.findFirstOrThrow({ where: { accountId: account.id } });
    await expect(db.walletJournal.update({ where: { id: journal.id }, data: { reason: 'Rewrite' } })).rejects.toThrow();
    await expect(db.walletEntry.create({ data: { journalId: journal.id, accountId: randomUUID(), deltaRial: 1n } })).rejects.toThrow();
    await expect(db.walletJournal.create({ data: { accountId: account.id, counterAccountId: journal.counterAccountId, kind: 'ADMIN_CREDIT', reference: randomUUID(), deltaRial: 10n, beforeRial: account.balanceRial, afterRial: account.balanceRial + 10n, version: account.version + 1, entries: { create: [{ accountId: account.id, deltaRial: 10n }, { accountId: journal.counterAccountId, deltaRial: -10n }] } } })).rejects.toThrow();
    expect((await wallet.summary(p.profile)).balanceRial).toBe('100');
  });

  it('100 simultaneous debit requests cannot overspend and every accepted effect is balanced', async () => {
    const p = await patient(); await credit(p, '10');
    const results = await Promise.allSettled(Array.from({ length: 100 }, () => db.$transaction(tx => wallet.post(tx, p.profile, -3n, 'PAYMENT', `load:${randomUUID()}`, context(p.userId)), { maxWait: 30000, timeout: 30000 })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(33); expect((await wallet.summary(p.profile)).balanceRial).toBe('1');
    expect((await app.get(BillingReportingService).summary(admin.userId)).ledgerMismatchCount).toBe(0);
  }, 60000);

  it('settles a real checkout atomically, prevents repeat debit, refunds to wallet and keeps top-ups out of sales', async () => {
    const p = await patient(); await credit(p, '2000'); const checkout = await order(p); const intent = await billing.create(p.userId, 'ORDER', { orderId: checkout.id }, randomUUID(), context(p.userId));
    const legacyRefund = () => app.inject({ method: 'POST', url: `/v1/admin/commerce/orders/${checkout.id}/refunds`, headers: headers(admin.token), payload: { amountToman: '1' } });
    expect((await legacyRefund()).json().code).not.toBe('BILLING_REFUND_REQUIRED');
    const key = randomUUID(); const paid = await billing.payWallet(p.userId, intent.id, key, context(p.userId)); expect(paid).toMatchObject({ status: 'PAID', method: 'WALLET' });
    expect((await legacyRefund()).json().code).toBe('BILLING_REFUND_REQUIRED');
    expect(await billing.payWallet(p.userId, intent.id, key, context(p.userId))).toEqual(paid); expect((await wallet.summary(p.profile)).balanceRial).toBe('10000');
    const payment = await db.payment.findUniqueOrThrow({ where: { orderId: checkout.id } }); expect(payment).toMatchObject({ method: 'WALLET', paymentAttemptId: null, providerAmount: null, providerReferenceId: null });
    expect((await db.inventoryReservation.findFirstOrThrow({ where: { orderId: checkout.id } })).status).toBe('CONSUMED');
    const refundKey = randomUUID(); const refund = await billing.refund(context(), intent.id, '6000', 'Partial return', refundKey); expect(refund.status).toBe('COMPLETED');
    expect(await billing.refund(context(), intent.id, '6000', 'Partial return', refundKey)).toEqual(refund); expect((await wallet.summary(p.profile)).balanceRial).toBe('16000');
    const concurrent = await Promise.allSettled([billing.refund(context(), intent.id, '4000', 'Remaining', randomUUID()), billing.refund(context(), intent.id, '4000', 'Remaining', randomUUID())]); expect(concurrent.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
    const other = await patient(); await expect(billing.get(other.userId, intent.id)).rejects.toThrow();
  });

  it('top-up attempts reuse their original token/revision and duplicate concurrent Verify has exactly one credit', async () => {
    const p = await patient(); const intent = await billing.create(p.userId, 'TOPUP', { amountToman: '1234' }, randomUUID(), context(p.userId)); const key = randomUUID(); const before = creates;
    const first = await gateway.create(p.userId, intent.id, key, context(p.userId)); expect((await gateway.create(p.userId, intent.id, key, context(p.userId))).id).toBe(first.id); expect(creates - before).toBe(1);
    verifyTimeout = true; await gateway.verify(first.id); verifyTimeout = false;
    expect((await db.billingGatewayAttempt.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('REQUIRES_RECONCILIATION'); expect((await wallet.summary(p.profile)).balanceRial).toBe('0');
    await Promise.all(Array.from({ length: 8 }, () => gateway.verify(first.id)));
    expect((await wallet.summary(p.profile)).balanceRial).toBe('12340'); expect(await db.walletJournal.count({ where: { reference: `gateway:${first.id}:credit` } })).toBe(1);
    expect((await db.billingGatewayAttempt.findUniqueOrThrow({ where: { id: first.id } })).revisionId).toBe(revisionId);
    await expect(db.billingGatewayAttempt.delete({ where: { id: first.id } })).rejects.toThrow();
    expect(await db.commerceOrder.count({ where: { patientId: p.profile.id } })).toBe(0);
    const result = await billing.get(p.userId, intent.id); expect(result.status).toBe('PAID'); expect(JSON.stringify(result)).not.toContain('providerToken');
    const detail = await app.inject({ method: 'GET', url: `/v1/admin/billing/intents/${intent.id}`, headers: headers(admin.token) }); expect(detail.statusCode).toBe(200); expect(detail.json()).toMatchObject({ patientId: p.profile.id, status: 'PAID' });
    expect((await app.inject({ method: 'GET', url: `/v1/admin/billing/intents/${intent.id}`, headers: headers(p.token) })).statusCode).toBe(403);
  });

  it('pending bank payment blocks wallet; the generic bank order produces a real order receipt with its own proof', async () => {
    const p = await patient(); await credit(p, '2000'); const checkout = await order(p); const intent = await billing.create(p.userId, 'ORDER', { orderId: checkout.id }, randomUUID(), context(p.userId));
    const attempt = await gateway.create(p.userId, intent.id, randomUUID(), context(p.userId));
    await expect(billing.payWallet(p.userId, intent.id, randomUUID(), context(p.userId))).rejects.toMatchObject({ response: { code: 'BILLING_PAYMENT_PENDING' } });
    await gateway.verify(attempt.id); const result = await billing.get(p.userId, intent.id); expect(result.status).toBe('PAID');
    const payment = await db.payment.findUniqueOrThrow({ where: { orderId: checkout.id } }); expect(payment).toMatchObject({ method: 'GATEWAY', billingAttemptId: attempt.id, paymentAttemptId: null }); expect(payment.providerReferenceId).toBeTruthy();
    expect((await wallet.summary(p.profile)).balanceRial).toBe('20000');
    const refund = await billing.refund(context(), intent.id, '10000', 'Bank refund', randomUUID()); expect(refund.status).toBe('MANUAL_REQUIRED');
    expect((await wallet.summary(p.profile)).balanceRial).toBe('20000');
    await billing.completeRefund(context(), refund.id, 'synthetic-bank-transfer-evidence'); expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
  });

  it('full wallet payment creates the appointment only once, protects the slot and refunds an allowed cancellation', async () => {
    const p = await patient(true); const input = await appointmentInput(p);
    const direct = await app.inject({ method: 'POST', url: '/v1/appointments', headers: headers(p.token), payload: input }); expect(direct.statusCode).toBe(409); expect(direct.json().code).toBe('APPOINTMENT_PAYMENT_REQUIRED');
    const intent = await billing.create(p.userId, 'APPOINTMENT', input, randomUUID(), context(p.userId)); expect(intent.appointmentId).toBeNull();
    const competitor = await patient(true); await expect(billing.create(competitor.userId, 'APPOINTMENT', input, randomUUID(), context(competitor.userId))).rejects.toThrow();
    await credit(p, '10000000'); const before = (await wallet.summary(p.profile)).balanceRial;
    const paid = await billing.payWallet(p.userId, intent.id, randomUUID(), context(p.userId)); expect(paid).toMatchObject({ status: 'PAID' });
    const record = await db.billingIntent.findUniqueOrThrow({ where: { id: intent.id } }); expect(record.appointmentId).toBeTruthy();
    const appointment = await db.appointment.findUniqueOrThrow({ where: { id: record.appointmentId! } }); expect(BigInt(appointment.priceAmount)).toBe(BigInt(intent.amountRial));
    const partial = await app.inject({ method: 'POST', url: `/v1/admin/billing/intents/${intent.id}/refunds`, headers: headers(admin.token), payload: { amountRial: '1', reason: 'Exact one-rial correction' } }); expect(partial.statusCode).toBe(201); expect(partial.json()).toMatchObject({ amountRial: '1', status: 'COMPLETED' });
    await app.get(PatientAppointmentsService).cancel(p.userId, appointment.id); expect((await wallet.summary(p.profile)).balanceRial).toBe(before);
    expect(await db.billingRefund.count({ where: { intentId: intent.id, status: 'COMPLETED' } })).toBe(2);
  });

  it('a late verified receipt credits the wallet without taking an expired slot, and replay never credits twice', async () => {
    const p = await patient(true); const input = await appointmentInput(p); const offering = await db.doctorService.findUniqueOrThrow({ where: { id: input.doctorServiceId } });
    const startsAt = new Date(input.startsAt); const endsAt = new Date(startsAt.getTime() + offering.durationMinutes * 60000); const createdAt = new Date(Date.now() - 120000); const expiresAt = new Date(Date.now() - 60000);
    const hold = await db.appointmentHold.create({ data: { clinicId, doctorId: offering.doctorId, doctorServiceId: offering.id, startsAt, endsAt, createdAt, expiresAt } });
    const intent = await db.billingIntent.create({ data: { patientId: p.profile.id, clinicId, purpose: 'APPOINTMENT', amountRial: BigInt(offering.priceAmount), actorUserId: p.userId, idempotencyKey: randomUUID(), fingerprint: 'a'.repeat(64), holdId: hold.id, createdAt, expiresAt, snapshot: { doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), priceAmount: offering.priceAmount, currency: 'IRR' } } });
    const providerOrderId = (await db.$queryRaw<Array<{ value: bigint }>>`SELECT nextval('payment_provider_order_id_seq') AS value`)[0].value; const token = `late-${providerOrderId}`; providerRequests.set(token, { amount: intent.amountRial, orderId: providerOrderId });
    const attempt = await db.billingGatewayAttempt.create({ data: { intentId: intent.id, revisionId, providerOrderId, amountRial: intent.amountRial, status: 'REDIRECT_READY', providerToken: token, idempotencyKey: randomUUID() } });
    await billing.expire(); await gateway.verify(attempt.id); await gateway.verify(attempt.id);
    const result = await db.billingIntent.findUniqueOrThrow({ where: { id: intent.id } }); expect(result.status).toBe('COMPENSATED'); expect(result.appointmentId).toBeNull(); expect((await wallet.summary(p.profile)).balanceRial).toBe(intent.amountRial.toString());
  });

  it('a fully verified bank payment creates one final appointment and cancellation requests an evidenced bank refund', async () => {
    const p = await patient(true); const input = await appointmentInput(p);
    const intent = await billing.create(p.userId, 'APPOINTMENT', input, randomUUID(), context(p.userId));
    const attempt = await gateway.create(p.userId, intent.id, randomUUID(), context(p.userId));
    expect((await billing.get(p.userId, intent.id)).appointmentId).toBeNull();
    await gateway.verify(attempt.id); await gateway.verify(attempt.id);
    const paid = await billing.get(p.userId, intent.id); expect(paid).toMatchObject({ status: 'PAID', method: 'GATEWAY' }); expect(paid.appointmentId).toBeTruthy();
    await app.get(PatientAppointmentsService).cancel(p.userId, paid.appointmentId!);
    const refund = await db.billingRefund.findFirstOrThrow({ where: { intentId: intent.id } }); expect(refund.status).toBe('MANUAL_REQUIRED');
    await billing.completeRefund(context(), refund.id, 'Synthetic service cancellation bank reference');
    expect((await wallet.summary(p.profile)).balanceRial).toBe('0');
    await expect(db.billingRefund.delete({ where: { id: refund.id } })).rejects.toThrow();
  });

  it('admin booking intents bind the actual actor and patient, expose payment methods and release capacity on cancellation', async () => {
    const p = await patient(true); const input = await appointmentInput(p); const key = randomUUID();
    const response = await app.inject({ method: 'POST', url: `/v1/admin/patients/${p.profile.id}/wallet/appointment-intents`, headers: headers(admin.token, key), payload: input });
    expect(response.statusCode).toBe(201); const intent = response.json();
    expect(await db.billingIntent.findUniqueOrThrow({ where: { id: intent.id } })).toMatchObject({ actorUserId: admin.userId, patientId: p.profile.id, appointmentId: null });
    const methods = await gateway.methods(p.userId, intent.id); expect(methods).toContainEqual({ code: 'WALLET', available: false, balanceRial: '0' });
    const other = await patient(true);
    await expect(billing.create(other.userId, 'APPOINTMENT', input, key, context())).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REUSED' } });
    const cancelKey = randomUUID(); const cancelled = await billing.cancel(p.userId, intent.id, cancelKey, context(p.userId)); expect(cancelled).toMatchObject({ status: 'CANCELLED' });
    expect(await billing.cancel(p.userId, intent.id, cancelKey, context(p.userId))).toEqual(cancelled);
    const replacement = await billing.create(other.userId, 'APPOINTMENT', input, randomUUID(), context(other.userId)); expect(replacement.status).toBe('PENDING');
    await billing.cancel(other.userId, replacement.id, randomUUID(), context(other.userId));
    expect((await gateway.methods(p.userId, intent.id)).every(method => !method.available)).toBe(true);
  });

  it('reconciles a token-less timeout with verified callback proof even when the original request responds later', async () => {
    const p = await patient(); const intent = await billing.create(p.userId, 'TOPUP', { amountToman: '321' }, randomUUID(), context(p.userId));
    const original = fake.createPayment;
    let release!: () => void; let requested!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; }); const ready = new Promise<void>(resolve => { requested = resolve; });
    fake.createPayment = async input => { const result = await original(input); requested(); await wait; return result; };
    try {
      const creating = gateway.create(p.userId, intent.id, randomUUID(), context(p.userId)); await ready;
      const attempt = await db.billingGatewayAttempt.findFirstOrThrow({ where: { intentId: intent.id } });
      const token = `synthetic-${attempt.providerOrderId}`;
      providerRequests.set('wrong-token', { orderId: attempt.providerOrderId + 1n, amount: attempt.amountRial });
      await expect(gateway.callback({ OrderId: attempt.providerOrderId.toString(), Token: 'wrong-token', ResCode: '0' })).rejects.toThrow();
      await db.billingGatewayAttempt.update({ where: { id: attempt.id }, data: { status: 'REQUIRES_RECONCILIATION', resultCode: 'REQUEST_AMBIGUOUS' } });
      const reconcileKey = randomUUID();
      await gateway.resolveFailed(context(), attempt.id, 'Synthetic PSP review: no receipt found', reconcileKey);
      expect((await gateway.resolveFailed(context(), attempt.id, 'Synthetic PSP review: no receipt found', reconcileKey))).toMatchObject({ status: 'FAILED' });
      await gateway.callback({ OrderId: attempt.providerOrderId.toString(), Token: token, ResCode: '-1' });
      release(); expect(await creating).toMatchObject({ status: 'VERIFIED' });
      await gateway.callback({ OrderId: attempt.providerOrderId.toString(), Token: token, ResCode: '0' });
      expect((await wallet.summary(p.profile)).balanceRial).toBe('3210');
      expect(await db.walletJournal.count({ where: { reference: `gateway:${attempt.id}:credit` } })).toBe(1);
    } finally { release(); fake.createPayment = original; }
  });

  it('rolls back debit, receipt and inventory if a target returns a cross-domain effect, then safely retries', async () => {
    const p = await patient(); await credit(p, '2000'); const checkout = await order(p); const intent = await billing.create(p.userId, 'ORDER', { orderId: checkout.id }, randomUUID(), context(p.userId));
    const before = (await wallet.summary(p.profile)).balanceRial; const target = app.get(OrderBillingTarget); const original = target.settle.bind(target); const key = randomUUID();
    const spy = vi.spyOn(target, 'settle').mockImplementationOnce(async (...args) => {
      await original(...args);
      return { kind: 'APPOINTMENT', appointmentId: randomUUID() } as unknown as Awaited<ReturnType<typeof original>>;
    });
    try {
      await expect(billing.payWallet(p.userId, intent.id, key, context(p.userId))).rejects.toMatchObject({ response: { code: 'BILLING_STATE_CONFLICT' } });
      expect((await wallet.summary(p.profile)).balanceRial).toBe(before); expect(await db.payment.count({ where: { orderId: checkout.id } })).toBe(0);
      expect((await db.commerceOrder.findUniqueOrThrow({ where: { id: checkout.id } })).status).toBe('PENDING_PAYMENT'); expect((await db.billingIntent.findUniqueOrThrow({ where: { id: intent.id } })).status).toBe('PENDING');
    } finally { spy.mockRestore(); }
    expect(await billing.payWallet(p.userId, intent.id, key, context(p.userId))).toMatchObject({ status: 'PAID', appointmentId: null });
    expect(await db.walletJournal.count({ where: { reference: `intent:${intent.id}:debit` } })).toBe(1);
  });

  it('preserves explicit free appointment fulfillment without a fabricated journal', async () => {
    const p = await patient(true); const input = await appointmentInput(p); const offering = await db.doctorService.findUniqueOrThrow({ where: { id: input.doctorServiceId } });
    await db.doctorService.update({ where: { id: offering.id }, data: { priceAmount: 0 } });
    try {
      const result = await billing.create(p.userId, 'APPOINTMENT', input, randomUUID(), context(p.userId)); expect(result).toMatchObject({ status: 'PAID', method: 'FREE', amountRial: '0' }); expect(result.appointmentId).toBeTruthy();
      const record = await db.appointment.findUniqueOrThrow({ where: { id: result.appointmentId! } }); expect(record.priceAmount).toBe(0); expect(await db.walletJournal.count({ where: { reference: `intent:${result.id}:debit` } })).toBe(0);
    } finally { await db.doctorService.update({ where: { id: offering.id }, data: { priceAmount: offering.priceAmount } }); }
  });

  it('frozen wallets reject spend while financial notices are delivered without replaying the adjustment', async () => {
    const p = await patient(); await credit(p, '2000'); const current = await wallet.summary(p.profile); await wallet.setStatus(context(), p.profile.id, { frozen: true, expectedVersion: current.version, reason: 'Synthetic freeze' }, randomUUID());
    const checkout = await order(p); const intent = await billing.create(p.userId, 'ORDER', { orderId: checkout.id }, randomUUID(), context(p.userId));
    await expect(billing.payWallet(p.userId, intent.id, randomUUID(), context(p.userId))).rejects.toMatchObject({ response: { code: 'WALLET_FROZEN' } });
    await app.get(OutboxWorker).tick(); expect((await wallet.summary(p.profile)).balanceRial).toBe('20000');
    for (let i = 0; i < 10 && !(await db.notification.count({ where: { recipientId: p.userId, category: 'FINANCIAL' } })); i++) await app.get(OutboxWorker).tick();
    expect(await db.notification.count({ where: { recipientId: p.userId, category: 'FINANCIAL' } })).toBe(1);
  });
});
