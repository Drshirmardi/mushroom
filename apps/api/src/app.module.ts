import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';

import { AuthModule } from './common/auth/auth.module';
import { PatientEntryModule } from './modules/patients/entry/patient-entry.module';
import { HealthController } from './common/health/health.controller';
import { environmentValidationSchema } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AdminPatientsModule } from './modules/patients/admin/admin-patients.module';
import { AdminAssessmentsModule } from './modules/assessments/admin/admin-assessments.module';
import { PatientAssessmentsModule } from './modules/assessments/patient/patient-assessments.module';
import { AssessmentOfferingsModule } from './modules/assessments/offerings/assessment-offerings.module';
import { CoupleLinkModule } from './modules/assessments/couples/couple-link.module';
import { AssessmentGuidanceModule } from './modules/assessments/guidance/assessment-guidance.module';
import { AssessmentProtocolModule } from './modules/assessments/protocol/assessment-protocol.module';
import { AssessmentPublicationModule } from './modules/assessments/publication/assessment-publication.module';
import { AssessmentPurchaseModule } from './modules/assessments/purchases/assessment-purchase.module';
import { CoupleResultProtocolModule } from './modules/assessments/couples/result-protocol/couple-result-protocol.module';
import { CoupleAssessmentModule } from './modules/assessments/couples/participation/couple-assessment.module';
import { AssessmentCareModule } from './modules/assessments/care/assessment-care.module';
import { AdminDirectoryModule } from './modules/directory/admin-directory.module';
import { IntakeModule } from './modules/patients/intake/intake.module';
import { SelfProfileModule } from './modules/patients/self-profile/self-profile.module';
import { PatientJourneyModule } from './modules/patients/journey/patient-journey.module';
import { AdminSchedulingModule } from './modules/scheduling/admin-scheduling.module';
import { PatientAppointmentsModule } from './modules/appointments/patient-appointments.module';
import { AssignedAppointmentModule } from './modules/appointments/assigned/assigned-appointment.module';
import { ProgramDefinitionModule } from './modules/programs/definitions/program-definition.module';
import { ProgramCatalogModule } from './modules/programs/catalog/program-catalog.module';
import { ProgramPublicationModule } from './modules/programs/publication/program-publication.module';
import { ProgramPurchaseModule } from './modules/programs/purchases/program-purchase.module';
import { CustomProgramModule } from './modules/programs/custom-requests/custom-program.module';
import { CustomDeliveryModule } from './modules/programs/custom-delivery/custom-delivery.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { HealthObservationsModule } from './modules/assessments/health/health-observations.module';
import { NotificationsModule } from './modules/assessments/notifications/notifications.module';
import { ContentModule } from './modules/content/content.module';
import { GuidanceContentModule } from './modules/content/guidance/guidance-content.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { AdminCommerceCatalogModule } from './modules/commerce/catalog/admin-commerce-catalog.module';
import { ChatModule } from './modules/communications/chat/chat.module';
import { SmsModule } from './modules/communications/sms/sms.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: [
        resolve(process.cwd(), 'apps/api/.env'),
        resolve(process.cwd(), '.env'),
      ],
      isGlobal: true,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    AuthModule,
    DatabaseModule,
    IdentityModule,
    PatientEntryModule,
    SelfProfileModule,
    PatientJourneyModule,
    IntakeModule,
    AdminPatientsModule,
    AdminAssessmentsModule,
    PatientAssessmentsModule,
    AssessmentCareModule,
    AssessmentOfferingsModule,
    CoupleLinkModule,
    AdminDirectoryModule,
    AdminSchedulingModule,
    PatientAppointmentsModule,
    AssignedAppointmentModule,
    ProgramDefinitionModule,
    ProgramPublicationModule,
    ProgramPurchaseModule,
    CustomProgramModule,
    CustomDeliveryModule,
    ClinicalModule,
    HealthObservationsModule, NotificationsModule, ContentModule, GuidanceContentModule, OutboxModule, AdminCommerceCatalogModule, ChatModule, SmsModule,
    AssessmentGuidanceModule,
    AssessmentProtocolModule,
    AssessmentPublicationModule,
    AssessmentPurchaseModule,
    CoupleResultProtocolModule,
    CoupleAssessmentModule,
    ProgramCatalogModule,
  ],
})
export class AppModule {}
