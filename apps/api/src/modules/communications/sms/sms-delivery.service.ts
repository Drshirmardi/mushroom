import { createHash } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SmsCredentialCryptoService } from './sms-credential-crypto.service';
import { SmsProviderRegistry } from './sms-provider.registry';
import { SmsRuntimeService } from './sms-runtime.service';

@Injectable()
export class SmsDeliveryService {
  constructor(private readonly prisma: PrismaService, private readonly registry: SmsProviderRegistry, private readonly crypto: SmsCredentialCryptoService, private readonly runtime: SmsRuntimeService) {}

  async sendAuthenticationCode(challengeId: string, phone: string, code: string) {
    this.runtime.assertLive();
    const configured = await this.prisma.smsProviderConfig.findFirst({ where: { enabled: true, isDefault: true }, include: { activeRevision: { include: { credentialVersion: true } } } });
    if (!configured?.activeRevision?.credentialVersion) throw new ServiceUnavailableException({ code: 'SMS_PROVIDER_UNAVAILABLE', message: 'No active SMS provider is available.', details: {} });
    const provider = this.registry.resolve(configured.providerCode);
    this.registry.require(provider, 'PATTERN_SEND');
    const attempt = await this.prisma.smsDeliveryAttempt.create({ data: { challengeId, providerConfigId: configured.id, providerConfigRevisionId: configured.activeRevision.id, recipientHash: createHash('sha256').update(phone).digest('hex'), recipientMasked: `${phone.slice(0, 5)}***${phone.slice(-2)}`, status: 'PENDING' } });
    const result = await provider.sendPattern({ credential: this.crypto.decrypt(configured.activeRevision.credentialVersion), config: configured.activeRevision.nonSecretConfig as Record<string, string>, recipient: phone, attributes: { code } });
    await this.prisma.smsDeliveryAttempt.update({ where: { id: attempt.id }, data: { status: result.outcome, providerReference: result.providerReference, errorCategory: result.errorCategory, resolvedAt: new Date() } });
    await this.prisma.otpChallenge.update({ where: { id: challengeId }, data: { providerConfigRevisionId: configured.activeRevision.id, status: result.outcome } });
    return result;
  }
}
