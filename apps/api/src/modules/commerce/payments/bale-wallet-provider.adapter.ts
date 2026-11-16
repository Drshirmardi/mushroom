import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PaymentProviderRegistry } from './payment-provider.registry';
import type { PaymentProviderPort, ProviderCreateInput, ProviderCreateResult, ProviderCallback, ProviderVerifyResult } from './payment-provider.port';

/**
 * Bale uses a Bot API invoice and a server-verified pre-checkout lifecycle,
 * not Sadad's redirect/callback contract. Do not call the bank methods here.
 */
@Injectable()
export class BaleWalletPaymentProviderAdapter implements PaymentProviderPort {
  readonly descriptor = {
    code: 'bale_wallet',
    displayName: 'کیف پول بله',
    capabilities: {
      createPayment: 'UNSUPPORTED',
      createInvoiceLink: 'SUPPORTED_WHEN_GO_LIVE_READY',
      parseCallback: 'UNSUPPORTED',
      verifyPayment: 'UNSUPPORTED',
      sandbox: 'SUPPORTED_WHEN_GO_LIVE_READY',
      inquiry: 'SUPPORTED_WHEN_GO_LIVE_READY',
      webhook: 'SUPPORTED_WHEN_GO_LIVE_READY',
      refund: 'UNSUPPORTED',
      partialRefund: 'UNSUPPORTED',
    },
  } as const;
  constructor(registry: PaymentProviderRegistry) { registry.register(this); }
  private unsupported(): never {
    throw new UnprocessableEntityException({ code: 'BALE_NATIVE_INVOICE_ONLY', message: 'Bale wallet requires the native invoice API.', details: {} });
  }
  async createPayment(_input: ProviderCreateInput): Promise<ProviderCreateResult> { return this.unsupported(); }
  parseCallback(_input: unknown): ProviderCallback { return this.unsupported(); }
  async verifyPayment(_input: { token: string; credential: Record<string, string>; providerOrderId?: bigint }): Promise<ProviderVerifyResult> { return this.unsupported(); }
}
