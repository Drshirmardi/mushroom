import { Module } from '@nestjs/common';

import { AdminAssessmentsController } from './admin-assessments.controller';
import { AdminAssessmentsService } from './admin-assessments.service';
import { AdminBookingPolicyController } from './admin-booking-policy.controller';
import { AdminBookingPolicyService } from './admin-booking-policy.service';
import { AdminAssessmentSubmissionsController } from './admin-assessment-submissions.controller';
import { AdminAssessmentSubmissionsService } from './admin-assessment-submissions.service';

@Module({ controllers: [AdminAssessmentsController, AdminBookingPolicyController, AdminAssessmentSubmissionsController], providers: [AdminAssessmentsService, AdminBookingPolicyService, AdminAssessmentSubmissionsService] })
export class AdminAssessmentsModule {}
