import { Module } from '@nestjs/common';

import { PatientAssessmentsModule } from '../assessments/patient/patient-assessments.module';
import { ClinicalModule } from '../clinical/clinical.module';
import { AdminSchedulingModule } from '../scheduling/admin-scheduling.module';
import { PatientAppointmentsController } from './patient-appointments.controller';
import { PatientAppointmentsService } from './patient-appointments.service';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAppointmentsService } from './admin-appointments.service';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PatientAssessmentsModule, AdminSchedulingModule, ClinicalModule, OutboxModule],
  controllers: [PatientAppointmentsController, AdminAppointmentsController],
  providers: [PatientAppointmentsService, AdminAppointmentsService],
})
export class PatientAppointmentsModule {}
