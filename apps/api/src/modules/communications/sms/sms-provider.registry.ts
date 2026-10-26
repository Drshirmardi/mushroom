import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { SmsCapability, SmsProviderDescriptor, SmsProviderPort } from './sms-provider.port';

@Injectable()
export class SmsProviderRegistry {
  private readonly providers = new Map<string, SmsProviderPort>();

  register(provider: SmsProviderPort) {
    if (this.providers.has(provider.descriptor.code)) throw new Error(`Duplicate SMS provider: ${provider.descriptor.code}`);
    this.providers.set(provider.descriptor.code, provider);
  }

  resolve(code: string): SmsProviderPort {
    const provider = this.providers.get(code);
    if (!provider) throw new NotFoundException({ code: 'SMS_PROVIDER_NOT_FOUND', message: 'SMS provider is not registered.', details: {} });
    return provider;
  }

  descriptors(): SmsProviderDescriptor[] { return [...this.providers.values()].map(({ descriptor }) => descriptor); }

  require(provider: SmsProviderPort, capability: SmsCapability) {
    if (!provider.descriptor.capabilities.includes(capability)) throw new UnprocessableEntityException({ code: 'SMS_PROVIDER_CAPABILITY_UNSUPPORTED', message: 'SMS provider capability is not supported.', details: {} });
  }
}
