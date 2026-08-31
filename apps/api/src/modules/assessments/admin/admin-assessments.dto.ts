import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'RETIRED'] }) status!: string;
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
