import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/billing.module';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { ProgramDefinitionModule } from '../definitions/program-definition.module';
import { ProgramBillingTarget } from './program-billing.target';
import { ProgramPurchaseController } from './program-purchase.controller';
import { ProgramPurchaseService } from './program-purchase.service';
import { ProgramMezajService } from './program-mezaj.service';
import { AdminProgramMezajController, PatientProgramMezajController } from './program-mezaj.controller';
@Module({ imports: [BillingModule, GuidanceContentModule, IdentityModule, ProgramDefinitionModule], controllers: [ProgramPurchaseController, AdminProgramMezajController, PatientProgramMezajController], providers: [ProgramPurchaseService, ProgramBillingTarget, ProgramMezajService], exports: [ProgramPurchaseService] })
export class ProgramPurchaseModule {}
