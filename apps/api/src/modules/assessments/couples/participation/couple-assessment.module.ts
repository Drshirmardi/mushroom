import { Module } from '@nestjs/common';
import { IdentityModule } from '../../../identity/identity.module';
import { GuidanceContentModule } from '../../../content/guidance/guidance-content.module';
import { AssessmentAccessModule } from '../../access/assessment-access.module';
import { AssessmentPublicationModule } from '../../publication/assessment-publication.module';
import { CoupleResultProtocolModule } from '../result-protocol/couple-result-protocol.module';
import { CoupleLinkModule } from '../couple-link.module';
import { CoupleAssessmentController } from './couple-assessment.controller';
import { CoupleAssessmentService } from './couple-assessment.service';
@Module({ imports: [IdentityModule, GuidanceContentModule, AssessmentAccessModule, AssessmentPublicationModule, CoupleResultProtocolModule, CoupleLinkModule], controllers: [CoupleAssessmentController], providers: [CoupleAssessmentService], exports: [CoupleAssessmentService] })
export class CoupleAssessmentModule {}
