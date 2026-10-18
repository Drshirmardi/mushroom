import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/billing.module';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { ProgramDefinitionModule } from '../definitions/program-definition.module';
import { ProgramBillingTarget } from './program-billing.target';
import { ProgramPurchaseController } from './program-purchase.controller';
import { ProgramPurchaseService } from './program-purchase.service';
@Module({ imports: [BillingModule, GuidanceContentModule, IdentityModule, ProgramDefinitionModule], controllers: [ProgramPurchaseController], providers: [ProgramPurchaseService, ProgramBillingTarget], exports: [ProgramPurchaseService] })
export class ProgramPurchaseModule {}
