import { IdentityModule } from '../../identity/identity.module';
import { BillingModule } from '../../billing/billing.module';
import { EntryBillingTarget } from './entry-billing.target';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PatientAssessmentsModule } from '../../assessments/patient/patient-assessments.module';
import { PatientEntryController, AdminEntryPolicyController } from './patient-entry.controller';
import { PatientEntryService } from './patient-entry.service';
import { PatientEntryGuard } from './patient-entry.guard';
@Module({ imports: [PatientAssessmentsModule, BillingModule, IdentityModule], controllers: [PatientEntryController, AdminEntryPolicyController], providers: [PatientEntryService, EntryBillingTarget, { provide: APP_GUARD, useClass: PatientEntryGuard }], exports: [PatientEntryService] })
export class PatientEntryModule {}
