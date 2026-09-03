import { Module } from '@nestjs/common';

import { EncounterLifecycleService } from './encounter-lifecycle.service';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalReconciliationService } from './clinical-reconciliation.service';
import { PatientClinicalHistoryService } from './patient-clinical-history.service';

@Module({ providers: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService], exports: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService] })
export class ClinicalModule {}
