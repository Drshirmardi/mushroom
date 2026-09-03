import { Module } from '@nestjs/common';

import { EncounterLifecycleService } from './encounter-lifecycle.service';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalReconciliationService } from './clinical-reconciliation.service';

@Module({ providers: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService], exports: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService] })
export class ClinicalModule {}
