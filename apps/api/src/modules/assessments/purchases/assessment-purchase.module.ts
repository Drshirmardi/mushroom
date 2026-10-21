import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/billing.module';
import { IdentityModule } from '../../identity/identity.module';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { AssessmentPublicationModule } from '../publication/assessment-publication.module';
import { AssessmentProtocolModule } from '../protocol/assessment-protocol.module';
import { PatientAssessmentsModule } from '../patient/patient-assessments.module';
import { AssessmentBillingTarget } from './assessment-billing.target';
import { AssessmentPurchaseService } from './assessment-purchase.service';
import { AssessmentPurchaseController } from './assessment-purchase.controller';
import { CoupleAssessmentPaidModule } from '../couples/paid/couple-assessment-paid.module';
@Module({ imports: [BillingModule, IdentityModule, GuidanceContentModule, AssessmentPublicationModule, AssessmentProtocolModule, PatientAssessmentsModule, CoupleAssessmentPaidModule], controllers: [AssessmentPurchaseController], providers: [AssessmentPurchaseService, AssessmentBillingTarget] })
export class AssessmentPurchaseModule {}
