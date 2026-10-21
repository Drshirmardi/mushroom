export type PaymentCapability = 'createPayment' | 'parseCallback' | 'verifyPayment' | 'sandbox' | 'inquiry' | 'webhook' | 'refund' | 'partialRefund';
export type PaymentCapabilityState = 'SUPPORTED_WHEN_GO_LIVE_READY' | 'UNSUPPORTED';

export type PaymentProviderDescriptor = {
  code: string;
  displayName: string;
  capabilities: Record<PaymentCapability, PaymentCapabilityState>;
};

export type ProviderCreateInput = { providerOrderId: bigint; commerceAmountToman?: bigint; amountRial?: bigint; providerAmount: bigint; providerUnit: string; credential: Record<string, string>; returnUrl?: string; redirectProfile?: string };
/** A non-success request has no redirect token. Callers must persist the safe outcome, never invent one. */
export type ProviderCreateResult = { token?: string; redirectUrl?: string; providerResultCode: string };
export type ProviderCallback = { providerOrderId: bigint; token: string; resultCode: string };
/** Sadad may omit Amount/OrderId for a non-success Verify result; success handling requires both. */
export type ProviderVerifyResult = { resultCode: string; providerOrderId?: bigint; amount?: bigint; referenceId?: string; traceNumber?: string };

export interface PaymentProviderPort {
  readonly descriptor: PaymentProviderDescriptor;
  createPayment(input: ProviderCreateInput): Promise<ProviderCreateResult>;
  parseCallback(input: unknown): ProviderCallback;
  verifyPayment(input: { token: string; credential: Record<string, string> }): Promise<ProviderVerifyResult>;
}
