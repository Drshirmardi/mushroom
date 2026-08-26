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
import { IntakeModule } from './modules/patients/intake/intake.module';
import { SelfProfileModule } from './modules/patients/self-profile/self-profile.module';

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
    IntakeModule,
    AdminPatientsModule,
    AdminAssessmentsModule,
    PatientAssessmentsModule,
  ],
})
export class AppModule {}
