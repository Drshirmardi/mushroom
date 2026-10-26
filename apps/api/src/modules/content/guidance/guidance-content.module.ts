import { Module } from '@nestjs/common';
import { AdminGuidanceContentController, ClinicalGuidanceContentController, PatientGuidanceContentController } from './guidance-content.controller';
import { GuidanceContentService } from './guidance-content.service';
import { GuidanceAuthorityService } from './guidance-authority.service';
@Module({ controllers: [AdminGuidanceContentController, ClinicalGuidanceContentController, PatientGuidanceContentController], providers: [GuidanceContentService, GuidanceAuthorityService], exports: [GuidanceContentService, GuidanceAuthorityService] })
export class GuidanceContentModule {}
