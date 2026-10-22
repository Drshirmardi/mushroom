import { Module } from '@nestjs/common';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { SadadPaymentProviderAdapter } from './sadad-payment-provider.adapter';
import { SadadRuntimeConfigService } from './sadad-runtime-config.service';
import { PaymentCredentialCryptoService } from './payment-credential-crypto.service';
import { PaymentProviderOrderIdService } from './payment-provider-order-id.service';
import { PaymentProviderConfigService } from './payment-provider-config.service';
import { PaymentGatewayDiagnosticsService } from './payment-gateway-diagnostics.service';

const providers = [PaymentProviderRegistry, SadadPaymentProviderAdapter, SadadRuntimeConfigService, PaymentCredentialCryptoService, PaymentProviderOrderIdService, PaymentProviderConfigService, PaymentGatewayDiagnosticsService];
@Module({ providers, exports: providers })
export class PaymentProvidersModule {}
