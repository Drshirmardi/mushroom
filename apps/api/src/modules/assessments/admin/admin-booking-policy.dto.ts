import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

export class UpdateBookingAssessmentPolicyDto {
  @ApiProperty({ enum: ['NOT_REQUIRED', 'REQUIRED'] })
  @IsIn(['NOT_REQUIRED', 'REQUIRED'])
  assessmentRequirement!: 'NOT_REQUIRED' | 'REQUIRED';

  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @ValidateIf((body) => body.assessmentRequirement === 'REQUIRED')
  @IsUUID('4')
  requiredAssessmentVersionId?: string;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  validityDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  requireLatestPublishedVersion?: boolean;
}

export class BookingAssessmentPolicyResponseDto {
  @ApiProperty({ enum: ['NOT_REQUIRED', 'REQUIRED'] }) assessmentRequirement!: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' }) requiredAssessmentVersionId!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1 }) validityDays!: number | null;
  @ApiProperty() requireLatestPublishedVersion!: boolean;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' }) updatedAt!: Date | null;
}
