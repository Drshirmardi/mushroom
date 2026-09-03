import { Module } from '@nestjs/common';

import { EncounterLifecycleService } from './encounter-lifecycle.service';

@Module({ providers: [EncounterLifecycleService], exports: [EncounterLifecycleService] })
export class ClinicalModule {}
