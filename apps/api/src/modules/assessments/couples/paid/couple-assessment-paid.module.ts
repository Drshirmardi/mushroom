import { Module } from '@nestjs/common';
import { BillingModule } from '../../../billing/billing.module';
import { IdentityModule } from '../../../identity/identity.module';
import { ClinicalModule } from '../../../clinical/clinical.module';
import { GuidanceContentModule } from '../../../content/guidance/guidance-content.module';
import { AssessmentAccessModule } from '../../access/assessment-access.module';
import { CoupleLinkModule } from '../couple-link.module';
import { CoupleAssessmentModule } from '../participation/couple-assessment.module';
import { AssessmentPublicationModule } from '../../publication/assessment-publication.module';
import { CoupleResultProtocolModule } from '../result-protocol/couple-result-protocol.module';
import { CoupleAssessmentBillingService } from './couple-assessment-billing.service';
import { CoupleAssessmentDeliveryService } from './couple-assessment-delivery.service';
import { CoupleAssessmentPaidController, CoupleAssessmentOfferingController } from './couple-assessment-paid.controller';
@Module({ imports: [BillingModule, IdentityModule, ClinicalModule, GuidanceContentModule, AssessmentAccessModule, CoupleLinkModule, CoupleAssessmentModule, AssessmentPublicationModule, CoupleResultProtocolModule], controllers: [CoupleAssessmentPaidController, CoupleAssessmentOfferingController], providers: [CoupleAssessmentBillingService, CoupleAssessmentDeliveryService], exports: [CoupleAssessmentBillingService, CoupleAssessmentDeliveryService] })
export class CoupleAssessmentPaidModule {}
