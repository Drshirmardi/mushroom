import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { AppointmentBillingTarget } from './appointment-billing.target';

import { PatientAssessmentsModule } from '../assessments/patient/patient-assessments.module';
import { ClinicalModule } from '../clinical/clinical.module';
import { AdminSchedulingModule } from '../scheduling/admin-scheduling.module';
import { PatientAppointmentsController } from './patient-appointments.controller';
import { PatientAppointmentsService } from './patient-appointments.service';
import { AdminAppointmentReportingController, AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAppointmentsService } from './admin-appointments.service';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [BillingModule, PatientAssessmentsModule, AdminSchedulingModule, ClinicalModule, OutboxModule],
  controllers: [PatientAppointmentsController, AdminAppointmentsController, AdminAppointmentReportingController],
  providers: [AppointmentBillingTarget, PatientAppointmentsService, AdminAppointmentsService],
  exports: [AdminAppointmentsService],
})
export class PatientAppointmentsModule {}
