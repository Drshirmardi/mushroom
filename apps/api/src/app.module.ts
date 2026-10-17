import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';

import { AuthModule } from './common/auth/auth.module';
import { HealthController } from './common/health/health.controller';
import { environmentValidationSchema } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AdminPatientsModule } from './modules/patients/admin/admin-patients.module';
import { AdminAssessmentsModule } from './modules/assessments/admin/admin-assessments.module';
import { PatientAssessmentsModule } from './modules/assessments/patient/patient-assessments.module';
import { AssessmentOfferingsModule } from './modules/assessments/offerings/assessment-offerings.module';
import { CoupleLinkModule } from './modules/assessments/couples/couple-link.module';
import { AdminDirectoryModule } from './modules/directory/admin-directory.module';
import { IntakeModule } from './modules/patients/intake/intake.module';
import { SelfProfileModule } from './modules/patients/self-profile/self-profile.module';
import { PatientJourneyModule } from './modules/patients/journey/patient-journey.module';
import { AdminSchedulingModule } from './modules/scheduling/admin-scheduling.module';
import { PatientAppointmentsModule } from './modules/appointments/patient-appointments.module';
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
    SelfProfileModule,
    PatientJourneyModule,
    IntakeModule,
    AdminPatientsModule,
    AdminAssessmentsModule,
    PatientAssessmentsModule,
    AssessmentOfferingsModule,
    CoupleLinkModule,
    AdminDirectoryModule,
    AdminSchedulingModule,
    PatientAppointmentsModule,
    ClinicalModule,
    HealthObservationsModule, NotificationsModule, ContentModule, GuidanceContentModule, OutboxModule, AdminCommerceCatalogModule, ChatModule, SmsModule,
  ],
})
export class AppModule {}
