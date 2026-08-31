import { Module } from '@nestjs/common';
import { PatientAssessmentsController } from './patient-assessments.controller';
import { PatientAssessmentsService } from './patient-assessments.service';
import { SelfProfileModule } from '../../patients/self-profile/self-profile.module';
import { PatientBookingEligibilityController } from './patient-booking-eligibility.controller';
import { PatientBookingEligibilityService } from './patient-booking-eligibility.service';
@Module({ imports: [SelfProfileModule], controllers: [PatientAssessmentsController, PatientBookingEligibilityController], providers: [PatientAssessmentsService, PatientBookingEligibilityService] })
export class PatientAssessmentsModule {}
