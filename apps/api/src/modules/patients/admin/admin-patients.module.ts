import { Module } from '@nestjs/common';

import { AdminPatientReportingController, AdminPatientsController } from './admin-patients.controller';
import { AdminPatientsService } from './admin-patients.service';

@Module({
  controllers: [AdminPatientsController, AdminPatientReportingController],
  providers: [AdminPatientsService],
})
export class AdminPatientsModule {}
