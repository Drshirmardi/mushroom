import { AnalyticsModule } from '../analytics/analytics.module';
import { Module } from '@nestjs/common';
import { PaymentProvidersModule } from '../commerce/payments/payment-providers.module';
import { OutboxModule } from '../outbox/outbox.module';
import { IdentityModule } from '../identity/identity.module';
import { WalletService } from './wallet.service';
import { BillingService } from './billing.service';
import { BillingGatewayService } from './billing-gateway.service';
import { BillingTargetRegistry } from './billing-target.registry';
import { BillingReportingService } from './billing-reporting.service';
import { BillingWorker } from './billing.worker';
import { AdminBillingController, AdminPatientWalletController, BillingRateGuard, PatientBillingController } from './billing.controller';

@Module({ imports: [AnalyticsModule, PaymentProvidersModule, OutboxModule, IdentityModule], controllers: [PatientBillingController, AdminPatientWalletController, AdminBillingController], providers: [WalletService, BillingService, BillingGatewayService, BillingTargetRegistry, BillingReportingService, BillingWorker, BillingRateGuard], exports: [WalletService, BillingService, BillingGatewayService, BillingTargetRegistry] })
export class BillingModule {}
