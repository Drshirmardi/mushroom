import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PatientAssessmentsModule } from '../../assessments/patient/patient-assessments.module';
import { PatientEntryController, AdminEntryPolicyController } from './patient-entry.controller';
import { PatientEntryService } from './patient-entry.service';
import { PatientEntryGuard } from './patient-entry.guard';
@Module({ imports: [PatientAssessmentsModule], controllers: [PatientEntryController, AdminEntryPolicyController], providers: [PatientEntryService, { provide: APP_GUARD, useClass: PatientEntryGuard }], exports: [PatientEntryService] })
export class PatientEntryModule {}
