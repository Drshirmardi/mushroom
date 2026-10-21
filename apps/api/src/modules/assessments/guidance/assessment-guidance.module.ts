import { Module } from '@nestjs/common';
import { ClinicalModule } from '../../clinical/clinical.module';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { AdminAssessmentGuidanceController, ClinicalAssessmentGuidanceController, PatientAssessmentGuidanceController } from './assessment-guidance.controller';
import { AssessmentGuidanceService } from './assessment-guidance.service';
@Module({ imports: [GuidanceContentModule, ClinicalModule], controllers: [AdminAssessmentGuidanceController, ClinicalAssessmentGuidanceController, PatientAssessmentGuidanceController], providers: [AssessmentGuidanceService] })
export class AssessmentGuidanceModule {}
