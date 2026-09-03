import { Module } from '@nestjs/common';

import { EncounterLifecycleService } from './encounter-lifecycle.service';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalReconciliationService } from './clinical-reconciliation.service';
import { PatientClinicalHistoryService } from './patient-clinical-history.service';
import { ClinicalAccessAuditService } from './clinical-access-audit.service';
import { ClinicalResourceAccessService } from './clinical-resource-access.service';
import { PatientClinicalController } from './patient-clinical.controller';

@Module({ controllers: [PatientClinicalController], providers: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService, ClinicalAccessAuditService, ClinicalResourceAccessService], exports: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService, ClinicalAccessAuditService, ClinicalResourceAccessService] })
export class ClinicalModule {}
