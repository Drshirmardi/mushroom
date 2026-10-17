import { Module } from '@nestjs/common';
import { ClinicalModule } from '../../clinical/clinical.module';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { IdentityModule } from '../../identity/identity.module';
import { CoupleLinkModule } from '../../assessments/couples/couple-link.module';
import { PatientAppointmentsModule } from '../patient-appointments.module';
import { AssignedAppointmentController } from './assigned-appointment.controller';
import { AssignedAppointmentService } from './assigned-appointment.service';
@Module({ imports: [PatientAppointmentsModule, ClinicalModule, GuidanceContentModule, IdentityModule, CoupleLinkModule], controllers: [AssignedAppointmentController], providers: [AssignedAppointmentService] })
export class AssignedAppointmentModule {}
