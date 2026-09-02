import { Module } from '@nestjs/common';

import { PatientAssessmentsModule } from '../assessments/patient/patient-assessments.module';
import { AdminSchedulingModule } from '../scheduling/admin-scheduling.module';
import { PatientAppointmentsController } from './patient-appointments.controller';
import { PatientAppointmentsService } from './patient-appointments.service';

@Module({
  imports: [PatientAssessmentsModule, AdminSchedulingModule],
  controllers: [PatientAppointmentsController],
  providers: [PatientAppointmentsService],
})
export class PatientAppointmentsModule {}
