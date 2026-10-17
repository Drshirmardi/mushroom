import { Module } from '@nestjs/common';
import { ClinicalModule } from '../../clinical/clinical.module';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { AssessmentAccessModule } from '../access/assessment-access.module';
import { CoupleLinkModule } from '../couples/couple-link.module';
import { AssessmentProtocolModule } from '../protocol/assessment-protocol.module';
import { AssignedAssessmentCareController, PatientAssessmentCareController } from './assessment-care.controller';
import { AssessmentCareService } from './assessment-care.service';
@Module({ imports: [ClinicalModule, GuidanceContentModule, IdentityModule, AssessmentAccessModule, CoupleLinkModule, AssessmentProtocolModule], controllers: [AssignedAssessmentCareController, PatientAssessmentCareController], providers: [AssessmentCareService] })
export class AssessmentCareModule {}
