import { Module } from '@nestjs/common';

import { AdminAssessmentsController } from './admin-assessments.controller';
import { AdminAssessmentsService } from './admin-assessments.service';

@Module({ controllers: [AdminAssessmentsController], providers: [AdminAssessmentsService] })
export class AdminAssessmentsModule {}
