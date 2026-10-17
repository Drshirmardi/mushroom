import { Module } from '@nestjs/common';
import { AdminGuidanceContentController, ClinicalGuidanceContentController, PatientGuidanceContentController } from './guidance-content.controller';
import { GuidanceContentService } from './guidance-content.service';
@Module({ controllers: [AdminGuidanceContentController, ClinicalGuidanceContentController, PatientGuidanceContentController], providers: [GuidanceContentService], exports: [GuidanceContentService] })
export class GuidanceContentModule {}
