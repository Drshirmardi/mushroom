import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSelfProfileDto {
  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string | null;

  @ApiPropertyOptional({ format: 'email', maxLength: 254, nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cityName?: string | null;
}

export class SelfProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  patientId!: string;

  @ApiProperty({ example: '+989123456789' })
  phone!: string;

  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'] })
  accountStatus!: 'ACTIVE' | 'DISABLED';

  @ApiPropertyOptional({ nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'email' })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cityName!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  updatedAt!: Date | null;
}

export class OnboardingStatusResponseDto {
  @ApiProperty({ enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] })
  onboardingState!: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'COMPLETE'], nullable: true })
  submissionState!: string | null;

  @ApiProperty()
  isComplete!: boolean;

  @ApiProperty()
  requiredCount!: number;

  @ApiProperty()
  answeredRequiredCount!: number;

  @ApiProperty({ isArray: true, type: String })
  missingFields!: string[];

  @ApiProperty({ isArray: true, type: String })
  blockerCodes!: string[];

  @ApiProperty()
  nextAction!: string;

  @ApiPropertyOptional({ nullable: true })
  assignedSchemaVersion!: number | null;

  @ApiProperty()
  evaluatedSchemaVersion!: number;

  @ApiProperty()
  currentRevision!: number;

  @ApiPropertyOptional({ nullable: true })
  completedRevision!: number | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  currentPolicyVersionId!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  activeConsentRecordId!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  updatedAt!: Date | null;
}
