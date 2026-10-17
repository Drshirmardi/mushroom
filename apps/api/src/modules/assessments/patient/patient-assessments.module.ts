import { Module } from '@nestjs/common';
import { PatientAssessmentsController } from './patient-assessments.controller';
import { PatientAssessmentsService } from './patient-assessments.service';
import { SelfProfileModule } from '../../patients/self-profile/self-profile.module';
import { PatientBookingEligibilityController } from './patient-booking-eligibility.controller';
import { PatientBookingEligibilityService } from './patient-booking-eligibility.service';
import { AssessmentAccessModule } from '../access/assessment-access.module';
@Module({ imports: [SelfProfileModule, AssessmentAccessModule], controllers: [PatientAssessmentsController, PatientBookingEligibilityController], providers: [PatientAssessmentsService, PatientBookingEligibilityService], exports: [PatientBookingEligibilityService, PatientAssessmentsService] })
export class PatientAssessmentsModule {}
