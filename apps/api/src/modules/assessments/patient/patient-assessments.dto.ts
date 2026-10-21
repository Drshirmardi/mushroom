import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class PatientAssessmentHistoryQueryDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 10000, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 50, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiPropertyOptional({ enum: ['IN_PROGRESS', 'COMPLETE', 'INVALIDATED'] })
  @IsOptional() @IsIn(['IN_PROGRESS', 'COMPLETE', 'INVALIDATED']) state?: 'IN_PROGRESS' | 'COMPLETE' | 'INVALIDATED';
}
export class PatientAssessmentHistoryItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() assessmentKey!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() locale!: string;
  @ApiProperty() title!: string;
  @ApiProperty() attemptNumber!: number;
  @ApiProperty() revision!: number;
  @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETE', 'INVALIDATED'] }) state!: string;
  @ApiProperty({ format: 'date-time' }) startedAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt!: Date | null;
  @ApiProperty() resumeAvailable!: boolean;
}
export class PatientAssessmentHistoryResponseDto {
  @ApiProperty({ type: [PatientAssessmentHistoryItemDto] }) items!: PatientAssessmentHistoryItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
export class PatientAssessmentQuestionnaireResponseDto {
  @ApiProperty({ format: 'uuid' }) submissionId!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() assessmentKey!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() locale!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ['PUBLISHED', 'RETIRED', 'DELETED'] }) status!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty() resumeAvailable!: boolean;
  @ApiProperty({ type: 'object', additionalProperties: true }) structure!: Record<string, unknown>;
}
export class PatientAssessmentProvenanceResponseDto {
  @ApiProperty({ format: 'uuid' }) submissionId!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() questionnaireContentHash!: string;
  @ApiProperty({ enum: ['RECORDED', 'LEGACY_UNRECORDED'] }) provenanceStatus!: string;
  @ApiProperty({ type: String, nullable: true }) algorithmId!: string | null;
  @ApiProperty({ type: Number, nullable: true }) algorithmVersion!: number | null;
  @ApiProperty({ type: String, nullable: true }) answerPayloadHash!: string | null;
  @ApiProperty({ format: 'date-time' }) completedAt!: Date;
}

export class AssessmentRevisionDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: 2147483647, description: 'Optional for legacy clients; protects a changing command from stale answers.' })
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(0) @Max(2147483647)
  expectedRevision?: number;
}
export class SaveAssessmentAnswersDto extends AssessmentRevisionDto { @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() answers!: Record<string, unknown>; }
export class SubmitAssessmentDto extends AssessmentRevisionDto {}
export class PatientAssessmentListItemDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() assessmentKey!: string; @ApiProperty() versionNumber!: number; @ApiProperty() locale!: string; @ApiProperty() title!: string; @ApiProperty({ type: 'object', additionalProperties: true }) structure!: Record<string, unknown>; }
export class PatientAssessmentListResponseDto { @ApiProperty({ type: PatientAssessmentListItemDto, isArray: true }) items!: PatientAssessmentListItemDto[]; }
export class PatientAssessmentSubmissionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() attemptNumber!: number;
  @ApiPropertyOptional({ type: 'integer', minimum: 0 }) revision?: number;
  @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETE', 'INVALIDATED'] }) state!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) answers!: Record<string, unknown>;
  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true }) resultSnapshot!: Record<string, unknown> | null;
  @ApiPropertyOptional({ type: String, nullable: true }) score!: string | null;
  @ApiProperty({ format: 'date-time' }) startedAt!: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) completedAt!: Date | null;
}
export class MezajResultResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string; @ApiProperty({ format: 'uuid' }) assessmentSubmissionId!: string; @ApiProperty({ type: 'object', additionalProperties: true }) resultBand!: Record<string, unknown>; @ApiProperty({ format: 'date-time' }) assessedAt!: Date; }
