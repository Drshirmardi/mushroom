import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { PaymentCapability, PaymentProviderDescriptor, PaymentProviderPort } from './payment-provider.port';

const missing = () => new NotFoundException({ code: 'PAYMENT_PROVIDER_NOT_FOUND', message: 'Payment provider is not registered.', details: {} });
const unsupported = () => new UnprocessableEntityException({ code: 'PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED', message: 'Payment provider capability is not supported.', details: {} });

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<string, PaymentProviderPort>();
  register(provider: PaymentProviderPort) { this.providers.set(provider.descriptor.code, provider); }
  resolve(code: string) { const provider = this.providers.get(code); if (!provider) throw missing(); return provider; }
  descriptors(): PaymentProviderDescriptor[] { return [...this.providers.values()].map((provider) => provider.descriptor); }
  require(provider: PaymentProviderPort, capability: PaymentCapability) { if (provider.descriptor.capabilities[capability] === 'UNSUPPORTED') throw unsupported(); }
}
