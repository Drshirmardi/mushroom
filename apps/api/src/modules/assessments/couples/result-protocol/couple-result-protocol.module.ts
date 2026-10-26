import { Module } from '@nestjs/common';
import { GuidanceContentModule } from '../../../content/guidance/guidance-content.module';
import { AssessmentProtocolModule } from '../../protocol/assessment-protocol.module';
import { CoupleResultProtocolService } from './couple-result-protocol.service';
import { AdminCoupleResultProtocolController, ClinicalCoupleResultProtocolController } from './couple-result-protocol.controller';
@Module({ imports: [GuidanceContentModule, AssessmentProtocolModule], controllers: [AdminCoupleResultProtocolController, ClinicalCoupleResultProtocolController], providers: [CoupleResultProtocolService], exports: [CoupleResultProtocolService] })
export class CoupleResultProtocolModule {}
