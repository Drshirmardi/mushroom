import { MarriageRequestController } from '../couples/marriage-request.controller';
import { MarriageRequestService } from '../couples/marriage-request.service';
import { CoupleLinkModule } from '../couples/couple-link.module';
import { SmsModule } from '../../communications/sms/sms.module';
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
import { AssessmentAccessModule } from '../access/assessment-access.module';
import { AssessmentEducationalAccessService } from './assessment-educational-access.service';
import { AssessmentAdminPurchaseService } from './assessment-admin-purchase.service';
import { EducationalCoupleService } from '../couples/educational/educational-couple.service';
import { EducationalCoupleController } from '../couples/educational/educational-couple.controller';
import { ClinicalModule } from '../../clinical/clinical.module';
@Module({ imports: [SmsModule, CoupleLinkModule, BillingModule, IdentityModule, GuidanceContentModule, AssessmentPublicationModule, AssessmentProtocolModule, PatientAssessmentsModule, CoupleAssessmentPaidModule, AssessmentAccessModule, ClinicalModule], controllers: [MarriageRequestController, AssessmentPurchaseController, EducationalCoupleController], providers: [MarriageRequestService, AssessmentPurchaseService, AssessmentEducationalAccessService, AssessmentAdminPurchaseService, AssessmentBillingTarget, EducationalCoupleService] })
export class AssessmentPurchaseModule {}
