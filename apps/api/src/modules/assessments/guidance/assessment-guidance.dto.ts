import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { GuidanceContentResponseDto } from '../../content/guidance/guidance-content.dto';
import { PatientServiceDto } from '../../directory/patient-directory.dto';

export class AssessmentGuidanceCreateDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') assessmentVersionId!: string;
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/^\S(?:.*\S)?$/u) resultBandId!: string;
  @ApiProperty({ type: [String], format: 'uuid' }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsUUID('4', { each: true }) guidanceContentIds!: string[];
  @ApiProperty({ type: [String], format: 'uuid' }) @IsArray() @ArrayMaxSize(10) @ArrayUnique() @IsUUID('4', { each: true }) serviceIds!: string[];
  @ApiProperty() @IsBoolean() recommendConsultation!: boolean;
}
export class AssessmentGuidanceQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') assessmentVersionId?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'APPROVED', 'REVOKED'] }) @IsOptional() @IsIn(['DRAFT', 'APPROVED', 'REVOKED']) status?: string;
}
export class AssessmentGuidanceReferenceDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() contentHash!: string;
}
export class AssessmentGuidanceResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty() resultBandId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() questionnaireContentHash!: string;
  @ApiProperty() algorithmId!: string;
  @ApiProperty() algorithmVersion!: number;
  @ApiProperty({ type: 'object', additionalProperties: true }) resultBandSnapshot!: Record<string, unknown>;
  @ApiProperty({ type: [AssessmentGuidanceReferenceDto] }) contentReferences!: AssessmentGuidanceReferenceDto[];
  @ApiProperty({ type: [PatientServiceDto] }) serviceReferences!: PatientServiceDto[];
  @ApiProperty() recommendConsultation!: boolean;
  @ApiProperty({ enum: ['DRAFT', 'APPROVED', 'REVOKED'] }) status!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) approvedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) revokedAt!: Date | null;
}
export class AssessmentGuidancePageDto {
  @ApiProperty({ type: [AssessmentGuidanceResponseDto] }) items!: AssessmentGuidanceResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
export const PATIENT_GUIDANCE_STATUSES = ['READY', 'PROVENANCE_UNRECORDED', 'PROVENANCE_UNSUPPORTED', 'CLINICAL_REVIEW_REQUIRED', 'NO_APPROVED_MAPPING', 'MAPPING_REVOKED', 'DEPENDENCIES_UNAVAILABLE'] as const;
export class PatientAssessmentGuidanceDto {
  @ApiProperty({ format: 'uuid' }) submissionId!: string;
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty({ enum: PATIENT_GUIDANCE_STATUSES }) status!: typeof PATIENT_GUIDANCE_STATUSES[number];
  @ApiProperty({ type: String, nullable: true }) mappingId!: string | null;
  @ApiProperty({ type: Number, nullable: true }) mappingVersion!: number | null;
  @ApiProperty({ type: String, nullable: true }) contentHash!: string | null;
  @ApiProperty({ type: [GuidanceContentResponseDto] }) content!: GuidanceContentResponseDto[];
  @ApiProperty({ type: [PatientServiceDto] }) services!: PatientServiceDto[];
  @ApiProperty() recommendConsultation!: boolean;
}
