import { Module } from '@nestjs/common';

import { AdminSchedulingController } from './admin-scheduling.controller';
import { AdminSchedulingService } from './admin-scheduling.service';
import { PatientAvailabilityController } from './patient-availability.controller';
import { PatientAvailabilityService } from './patient-availability.service';

@Module({ controllers: [AdminSchedulingController, PatientAvailabilityController], providers: [AdminSchedulingService, PatientAvailabilityService] })
export class AdminSchedulingModule {}
