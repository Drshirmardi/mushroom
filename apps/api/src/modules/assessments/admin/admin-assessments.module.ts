import { Module } from '@nestjs/common';

import { AdminAssessmentsController } from './admin-assessments.controller';
import { AdminAssessmentsService } from './admin-assessments.service';
import { AdminBookingPolicyController } from './admin-booking-policy.controller';
import { AdminBookingPolicyService } from './admin-booking-policy.service';

@Module({ controllers: [AdminAssessmentsController, AdminBookingPolicyController], providers: [AdminAssessmentsService, AdminBookingPolicyService] })
export class AdminAssessmentsModule {}
