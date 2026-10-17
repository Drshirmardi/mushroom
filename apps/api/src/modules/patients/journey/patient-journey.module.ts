import { Module } from '@nestjs/common';
import { CoupleAssessmentPaidModule } from '../../assessments/couples/paid/couple-assessment-paid.module';
import { PatientAssessmentsModule } from '../../assessments/patient/patient-assessments.module';
import { ClinicalModule } from '../../clinical/clinical.module';
import { SelfProfileModule } from '../self-profile/self-profile.module';
import { PatientJourneyController } from './patient-journey.controller';
import { PatientJourneyService } from './patient-journey.service';

@Module({ imports: [SelfProfileModule, PatientAssessmentsModule, ClinicalModule, CoupleAssessmentPaidModule],
  controllers: [PatientJourneyController], providers: [PatientJourneyService] })
export class PatientJourneyModule {}
