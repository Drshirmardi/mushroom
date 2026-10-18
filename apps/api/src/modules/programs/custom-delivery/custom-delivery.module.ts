import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/billing.module';
import { ClinicalModule } from '../../clinical/clinical.module';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { OutboxModule } from '../../outbox/outbox.module';
import { ProgramDefinitionModule } from '../definitions/program-definition.module';
import { ProgramPurchaseModule } from '../purchases/program-purchase.module';
import { ClinicalCustomDeliveryController, PatientCustomDeliveryController } from './custom-delivery.controller';
import { CustomDeliveryService } from './custom-delivery.service';
@Module({ imports: [BillingModule, ClinicalModule, GuidanceContentModule, IdentityModule, OutboxModule, ProgramDefinitionModule, ProgramPurchaseModule], controllers: [PatientCustomDeliveryController,ClinicalCustomDeliveryController], providers: [CustomDeliveryService] })
export class CustomDeliveryModule {}
