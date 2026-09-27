import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AssessmentReportingKpiDefinitionResponseDto {
  @ApiProperty({ enum: ['KPI-10', 'KPI-11', 'KPI-12'] }) id!: string;
  @ApiProperty() formula!: string;
  @ApiProperty() dataOwner!: 'Assessments';
  @ApiProperty() sourceOfTruth!: string;
  @ApiProperty({ enum: ['tenant-and-clinic'] }) scope!: 'tenant-and-clinic';
  @ApiProperty({ example: 'Asia/Tehran' }) timeZone!: 'Asia/Tehran';
  @ApiProperty() rounding!: string;
  @ApiProperty() zeroOrNotApplicableRule!: string;
  @ApiProperty() partialDataRule!: string;
  @ApiProperty() staleDataRule!: string;
}

export const assessmentReportingKpiDefinitions = [
  { id: 'KPI-10', formula: 'count(PatientAssessmentSubmission.id) with startedAt in range', dataOwner: 'Assessments', sourceOfTruth: 'PostgreSQL PatientAssessmentSubmission joined through assessment version to clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count', zeroOrNotApplicableRule: 'zero when no rows', partialDataRule: 'identify the unavailable submission range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-11', formula: 'count(submission.id) where state=COMPLETE and completedAt in range', dataOwner: 'Assessments', sourceOfTruth: 'PostgreSQL PatientAssessmentSubmission.state/completedAt', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count', zeroOrNotApplicableRule: 'zero when no rows; INVALIDATED and IN_PROGRESS are excluded', partialDataRule: 'identify the unavailable submission range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-12', formula: 'at asOf, count(submission in A where state=COMPLETE and completedAt <= asOf) / count(A) × 100, where A is submissions with startedAt in range and state in {IN_PROGRESS, COMPLETE}', dataOwner: 'Assessments', sourceOfTruth: 'PostgreSQL PatientAssessmentSubmission.startedAt/state/completedAt joined through assessment version to clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'one decimal percentage', zeroOrNotApplicableRule: 'denominator 0 → not-applicable, never 0%; numerator is a subset of A', partialDataRule: 'identify the unavailable submission range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
] as const satisfies readonly AssessmentReportingKpiDefinitionResponseDto[];

export class AdminAssessmentSubmissionQueryDto { @IsOptional() @IsUUID('4') patientId?: string; @IsOptional() @IsUUID('4') assessmentVersionId?: string; @IsOptional() @IsIn(['IN_PROGRESS', 'COMPLETE', 'INVALIDATED']) state?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page = 1; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20; }
export class AdminAssessmentSubmissionResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ format: 'uuid' }) patientId!: string; @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string; @ApiProperty() assessmentTitle!: string; @ApiProperty() attemptNumber!: number; @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETE', 'INVALIDATED'] }) state!: string; @ApiPropertyOptional({ type: String, nullable: true }) score!: string | null; @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true }) resultSnapshot!: Record<string, unknown> | null; @ApiProperty({ format: 'date-time' }) startedAt!: Date; @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' }) completedAt!: Date | null; }
export class AdminAssessmentSubmissionListResponseDto { @ApiProperty({ type: AdminAssessmentSubmissionResponseDto, isArray: true }) items!: AdminAssessmentSubmissionResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
