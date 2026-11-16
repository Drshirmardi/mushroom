import { describe, expect, it, vi } from 'vitest';
import { BaleWalletBillingService } from '../src/modules/billing/bale-wallet-billing.service';

const attemptId = '12345678-1234-4234-8234-123456789012';
const intentId = '87654321-1234-4234-8234-123456789012';
const query = {
  id: 'transaction-1', from: { id: 123456 }, currency: 'IRR',
  total_amount: 200000, invoice_payload: `bale:${attemptId}`,
};
const intent = { id: intentId, amountRial: 200000n, currency: 'IRR', purpose: 'TOPUP', status: 'PENDING', expiresAt: null, orderId: null };
const attempt = {
  id: attemptId, intentId, amountRial: 200000n, baleProviderUserId: '123456', baleTransactionId: null as string | null,
  balePrecheckoutApprovedAt: null as Date | null, createdAt: new Date(), status: 'REDIRECT_READY', revision: { config: { providerCode: 'bale_wallet' } },
};
function setup(overrides: Partial<typeof attempt> = {}) {
  const current = { ...attempt, ...overrides };
  const tx = {
    $queryRaw: vi.fn(),
    balePrecheckoutDecision: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    billingGatewayAttempt: {
      findUnique: vi.fn().mockResolvedValueOnce({ intentId }).mockResolvedValue(null),
      findUniqueOrThrow: vi.fn().mockResolvedValue(current),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    paymentAttempt: { count: vi.fn().mockResolvedValue(0) },
  };
  const prisma = {
    $transaction: vi.fn(async (cb: (db: typeof tx) => Promise<unknown>) => cb(tx)),
    billingGatewayAttempt: { findUnique: vi.fn().mockResolvedValue(current), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    billingIntent: { findUniqueOrThrow: vi.fn().mockResolvedValue(intent) },
  };
  const billing = { lockIntent: vi.fn().mockResolvedValue(intent), settleGateway: vi.fn().mockResolvedValue({ status: 'PAID' }) };
  const service = new BaleWalletBillingService(prisma as never, billing as never, {} as never, {} as never, {} as never, {} as never);
  const bot = { answerPreCheckoutQuery: vi.fn().mockResolvedValue(undefined), inquireTransaction: vi.fn() };
  vi.spyOn(service as unknown as { bot: () => typeof bot }, 'bot').mockReturnValue(bot);
  return { service, bot, tx, prisma, billing };
}

describe('Bale wallet financial evidence', () => {
  it('rejects a different Bale payer before approving any payment', async () => {
    const { service, bot, tx, billing } = setup();
    await service.handlePreCheckout({ ...query, from: { id: 999999 } });
    expect(bot.answerPreCheckoutQuery).toHaveBeenCalledWith('transaction-1', false, expect.any(String));
    expect(tx.billingGatewayAttempt.updateMany).not.toHaveBeenCalled();
    expect(tx.balePrecheckoutDecision.create).toHaveBeenCalledWith({ data: expect.objectContaining({ approved: false }) });
    expect(billing.settleGateway).not.toHaveBeenCalled();
  });

  it('rejects a mismatched amount and currency without opening a transaction', async () => {
    const { service, bot, tx } = setup();
    await service.handlePreCheckout({ ...query, total_amount: 100000 });
    expect(bot.answerPreCheckoutQuery).toHaveBeenCalledWith('transaction-1', false, expect.any(String));
    expect(tx.billingGatewayAttempt.updateMany).not.toHaveBeenCalled();
    await service.handlePreCheckout({ ...query, currency: 'USD' });
    expect(bot.answerPreCheckoutQuery).toHaveBeenLastCalledWith('transaction-1', false, expect.any(String));
  });

  it('persists the approved transaction before replying to the bot and replays same decision', async () => {
    const { service, bot, tx } = setup();
    await service.handlePreCheckout(query);
    expect(tx.billingGatewayAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: attemptId, status: 'REDIRECT_READY', baleTransactionId: null },
      data: expect.objectContaining({ status: 'REQUIRES_RECONCILIATION', baleTransactionId: 'transaction-1' }),
    });
    expect(bot.answerPreCheckoutQuery).toHaveBeenCalledWith('transaction-1', true, undefined);
    const same = setup({ baleTransactionId: 'transaction-1', status: 'REQUIRES_RECONCILIATION', balePrecheckoutApprovedAt: new Date() });
    await same.service.handlePreCheckout(query);
    expect(same.bot.answerPreCheckoutQuery).toHaveBeenCalledWith('transaction-1', true, undefined);
    expect(same.tx.billingGatewayAttempt.updateMany).not.toHaveBeenCalled();
  });

  it('does not settle on a successful-payment webhook until the server inquires', async () => {
    const { service, prisma } = setup({ baleTransactionId: 'transaction-1', status: 'REQUIRES_RECONCILIATION', balePrecheckoutApprovedAt: new Date() });
    const reconcile = vi.spyOn(service, 'reconcile').mockResolvedValue(undefined);
    await service.handleSuccessfulPayment({
      currency: 'IRR', total_amount: 200000, invoice_payload: `bale:${attemptId}`,
      telegram_payment_charge_id: 'transaction-1', provider_payment_charge_id: 'receipt-1',
    });
    expect(prisma.billingGatewayAttempt.findUnique).toHaveBeenCalledOnce();
    expect(reconcile).toHaveBeenCalledOnce();
    expect(reconcile).toHaveBeenCalledWith(attemptId);
  });

  it('never settles a paid inquiry whose payer or amount differs from the frozen invoice', async () => {
    const { service, bot, billing } = setup({ baleTransactionId: 'transaction-1', status: 'REQUIRES_RECONCILIATION', balePrecheckoutApprovedAt: new Date() });
    bot.inquireTransaction.mockResolvedValue({ id: 'transaction-1', status: 'paid', providerUserId: 'other-payer', amountRial: 200000n });
    await service.reconcile(attemptId);
    expect(billing.settleGateway).not.toHaveBeenCalled();
  });

  it('does not settle a pending provider inquiry even when a frontend event says paid', async () => {
    const { service, bot, billing, prisma } = setup({ baleTransactionId: 'transaction-1', status: 'REQUIRES_RECONCILIATION', balePrecheckoutApprovedAt: new Date() });
    bot.inquireTransaction.mockResolvedValue({ id: 'transaction-1', status: 'pending', providerUserId: '123456', amountRial: 200000n });
    await service.reconcile(attemptId);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(billing.settleGateway).not.toHaveBeenCalled();
  });
});
