import { Module } from '@nestjs/common';
import { PatientAssessmentsController } from './patient-assessments.controller';
import { PatientAssessmentsService } from './patient-assessments.service';
@Module({ controllers: [PatientAssessmentsController], providers: [PatientAssessmentsService] })
export class PatientAssessmentsModule {}
