import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, Max, Min, ValidateIf } from 'class-validator';

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
