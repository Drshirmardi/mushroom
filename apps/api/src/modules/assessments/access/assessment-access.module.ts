import { Module } from '@nestjs/common';
import { AssessmentProtocolModule } from '../protocol/assessment-protocol.module';
import { AssessmentAccessService } from './assessment-access.service';
@Module({ imports: [AssessmentProtocolModule], providers: [AssessmentAccessService], exports: [AssessmentAccessService] })
export class AssessmentAccessModule {}
