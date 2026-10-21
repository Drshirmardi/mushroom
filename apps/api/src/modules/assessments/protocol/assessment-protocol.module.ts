import { Module } from '@nestjs/common';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { AdminAssessmentProtocolController, ClinicalAssessmentProtocolController } from './assessment-protocol.controller';
import { AssessmentProtocolService } from './assessment-protocol.service';
@Module({ imports: [GuidanceContentModule], controllers: [ClinicalAssessmentProtocolController, AdminAssessmentProtocolController], providers: [AssessmentProtocolService], exports: [AssessmentProtocolService] })
export class AssessmentProtocolModule {}
