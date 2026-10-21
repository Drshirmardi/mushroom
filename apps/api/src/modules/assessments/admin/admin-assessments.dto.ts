import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const locales = ['fa-IR', 'en-US'] as const;

export class CreateAssessmentDto {
  @ApiPropertyOptional({ type: String, default: 'MAIN', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  assessmentKey = 'MAIN';

  @ApiPropertyOptional({ enum: locales, default: 'fa-IR' })
  @IsOptional() @IsIn(locales)
  locale: (typeof locales)[number] = 'fa-IR';

  @ApiProperty({ maxLength: 255 })
  @IsString() @MaxLength(255)
  title!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  structure!: Record<string, unknown>;
}

export class UpdateAssessmentDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional() @IsObject()
  structure?: Record<string, unknown>;
}

export class DeleteAssessmentQueryDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/u)
  expectedContentHash!: string;
}

export class DeletedAssessmentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
}

export class AssessmentListQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  assessmentKey?: string;

  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'RETIRED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'RETIRED';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  pageSize = 20;
}

export class AssessmentVersionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() assessmentKey!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: locales }) locale!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) structure!: Record<string, unknown>;
  @ApiProperty({ pattern: '^[0-9a-f]{64}$' }) contentHash!: string;
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'RETIRED', 'DELETED'] }) status!: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' }) publishedAt!: Date | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' }) retiredAt!: Date | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' }) publishedByUserId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class AssessmentListResponseDto {
  @ApiProperty({ type: AssessmentVersionResponseDto, isArray: true }) items!: AssessmentVersionResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}

export class AssessmentDraftPresetDto extends CreateAssessmentDto {}

export class AssessmentScoringPreviewInputDto {
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @IsString() @Matches(/^[a-f0-9]{64}$/u)
  expectedContentHash!: string;

  @ApiProperty({ enum: [true], description: 'Use synthetic answers only; preview never creates a patient result.' }) @Equals(true)
  syntheticAnswersOnly!: true;

  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject()
  answers!: Record<string, unknown>;
}

export class AssessmentDraftResultProfileDto {
  @ApiProperty() id!: string;
  @ApiProperty() primary!: string;
  @ApiProperty({ type: String, nullable: true }) secondary!: string | null;
  @ApiProperty({ maxLength: 200 }) title!: string;
  @ApiProperty({ maxLength: 2000 }) summary!: string;
  @ApiProperty({ type: [String], minItems: 1, maxItems: 5 }) strengths!: string[];
  @ApiProperty({ type: [String], minItems: 1, maxItems: 5 }) attentionPoints!: string[];
  @ApiProperty({ maxLength: 1000 }) nextStep!: string;
}

export class AssessmentTieBreakOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ maxLength: 1500 }) title!: string;
  @ApiProperty({ type: String, nullable: true }) dimensionId!: string | null;
}

export class AssessmentTieBreakQuestionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ maxLength: 1000 }) title!: string;
  @ApiProperty({ type: [String], minItems: 2, maxItems: 4 }) tiedDimensions!: string[];
  @ApiProperty({ type: [AssessmentTieBreakOptionDto], minItems: 2, maxItems: 5 }) options!: AssessmentTieBreakOptionDto[];
}

export class AssessmentScoringPreviewDto {
  @ApiProperty({ format: 'uuid' }) assessmentVersionId!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) questionnaireContentHash!: string;
  @ApiProperty({ enum: ['DIMENSION_RANK', 'DIMENSION_TIEBREAK'] }) algorithmId!: string;
  @ApiProperty({ enum: [1] }) algorithmVersion!: number;
  @ApiProperty({ enum: [true] }) educationalOnly!: true;
  @ApiProperty({ enum: ['UNREVIEWED'] }) reviewState!: string;
  @ApiProperty({ enum: ['INSUFFICIENT_DATA', 'PRIMARY_TIE', 'SECONDARY_TIE', 'SINGLE', 'PAIR', 'FOLLOW_UP_REQUIRED', 'FOLLOW_UP_UNAVAILABLE'] }) status!: string;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'integer', minimum: 0 } }) scores!: Record<string, number>;
  @ApiProperty({ minimum: 0, maximum: 100 }) informativeAnswers!: number;
  @ApiProperty({ type: String, nullable: true }) primary!: string | null;
  @ApiProperty({ type: String, nullable: true }) secondary!: string | null;
  @ApiProperty({ type: [String] }) tiedDimensions!: string[];
  @ApiProperty({ type: AssessmentDraftResultProfileDto, nullable: true, description: 'Unreviewed educational display profile; absent for ties/insufficient evidence.' }) profile!: AssessmentDraftResultProfileDto | null;
  @ApiPropertyOptional({ type: AssessmentTieBreakQuestionDto, nullable: true, description: 'Only the exact server-selected tie-break question; never a second follow-up.' }) followUp?: AssessmentTieBreakQuestionDto | null;
  @ApiPropertyOptional({ description: 'Whether the single allowed follow-up has already been answered.' }) followUpUsed?: boolean;
}
