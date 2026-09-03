import { Module } from '@nestjs/common';

import { EncounterLifecycleService } from './encounter-lifecycle.service';
import { ClinicalNotesService } from './clinical-notes.service';

@Module({ providers: [EncounterLifecycleService, ClinicalNotesService], exports: [EncounterLifecycleService, ClinicalNotesService] })
export class ClinicalModule {}
