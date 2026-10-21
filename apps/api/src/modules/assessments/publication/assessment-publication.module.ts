import { Module } from '@nestjs/common';
import { GuidanceContentModule } from '../../content/guidance/guidance-content.module';
import { AssessmentProtocolModule } from '../protocol/assessment-protocol.module';
import { AssessmentPublicationController } from './assessment-publication.controller';
import { AssessmentPublicationService } from './assessment-publication.service';
@Module({ imports: [GuidanceContentModule, AssessmentProtocolModule], controllers: [AssessmentPublicationController], providers: [AssessmentPublicationService], exports: [AssessmentPublicationService] })
export class AssessmentPublicationModule {}
