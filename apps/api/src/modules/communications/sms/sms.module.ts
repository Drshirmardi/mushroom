import { Module } from '@nestjs/common';
import { AdminSmsController } from './admin-sms.controller';
import { FarazSmsAdapter } from './faraz-sms.adapter';
import { SmsCredentialCryptoService } from './sms-credential-crypto.service';
import { SmsProviderConfigService } from './sms-provider-config.service';
import { SmsProviderRegistry } from './sms-provider.registry';
import { SmsRuntimeService } from './sms-runtime.service';
import { SmsDeliveryService } from './sms-delivery.service';

@Module({
  controllers: [AdminSmsController],
  providers: [SmsProviderRegistry, SmsRuntimeService, SmsCredentialCryptoService, SmsProviderConfigService, SmsDeliveryService, FarazSmsAdapter],
  exports: [SmsProviderRegistry, SmsRuntimeService, SmsCredentialCryptoService, SmsProviderConfigService, SmsDeliveryService],
})
export class SmsModule {}
