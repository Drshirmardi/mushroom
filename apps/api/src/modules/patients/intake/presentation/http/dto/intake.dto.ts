import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const declarationStatuses = ['NONE', 'UNKNOWN', 'PRESENT'] as const;
const sexAtBirthValues = ['FEMALE', 'MALE', 'INTERSEX', 'UNKNOWN', 'PREFER_NOT_TO_SAY'] as const;
const bloodTypeValues = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN'] as const;
const sleepValues = ['LESS_THAN_5_HOURS', 'FROM_5_TO_LESS_THAN_7_HOURS', 'FROM_7_TO_9_HOURS', 'MORE_THAN_9_HOURS', 'UNKNOWN'] as const;
const exerciseValues = ['NONE', 'ONCE_OR_TWICE_WEEKLY', 'THREE_OR_FOUR_TIMES_WEEKLY', 'DAILY', 'UNKNOWN'] as const;
const stressValues = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'UNKNOWN'] as const;
const tobaccoValues = ['NEVER', 'FORMER', 'CURRENT', 'UNKNOWN'] as const;

export class MedicalDeclarationDto {
  @ApiProperty({ enum: declarationStatuses })
  @IsIn(declarationStatuses)
  status!: (typeof declarationStatuses)[number];

  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  items!: string[];
}

export class IntakeSnapshotDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsString() birthDate?: string | null;
  @ApiPropertyOptional({ enum: sexAtBirthValues }) @IsOptional() @IsIn(sexAtBirthValues) sexAtBirth?: (typeof sexAtBirthValues)[number] | null;
  @ApiPropertyOptional({ minimum: 30, maximum: 300 }) @IsOptional() @IsInt() @Min(30) @Max(300) heightCm?: number | null;
  @ApiPropertyOptional({ minimum: 2, maximum: 500 }) @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(2) @Max(500) weightKg?: number | null;
  @ApiPropertyOptional({ enum: bloodTypeValues }) @IsOptional() @IsIn(bloodTypeValues) bloodType?: (typeof bloodTypeValues)[number] | null;
  @ApiPropertyOptional({ type: MedicalDeclarationDto }) @IsOptional() @IsObject() allergyReport?: MedicalDeclarationDto | null;
  @ApiPropertyOptional({ type: MedicalDeclarationDto }) @IsOptional() @IsObject() chronicConditionReport?: MedicalDeclarationDto | null;
  @ApiPropertyOptional({ type: MedicalDeclarationDto }) @IsOptional() @IsObject() currentMedicationReport?: MedicalDeclarationDto | null;
  @ApiPropertyOptional({ enum: sleepValues }) @IsOptional() @IsIn(sleepValues) sleepDurationBand?: (typeof sleepValues)[number] | null;
  @ApiPropertyOptional({ enum: exerciseValues }) @IsOptional() @IsIn(exerciseValues) exerciseFrequency?: (typeof exerciseValues)[number] | null;
  @ApiPropertyOptional({ enum: stressValues }) @IsOptional() @IsIn(stressValues) stressLevel?: (typeof stressValues)[number] | null;
  @ApiPropertyOptional({ enum: tobaccoValues }) @IsOptional() @IsIn(tobaccoValues) tobaccoUse?: (typeof tobaccoValues)[number] | null;
}

export class SaveIntakeDraftDto extends IntakeSnapshotDto {
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) expectedRevision!: number;
}

export class CompleteIntakeDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
}

export class AcceptConsentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() policyVersionId!: string;
  @ApiProperty({ minLength: 64, maxLength: 64 }) @IsString() @MaxLength(64) contentHash!: string;
}

export class ConsentPolicyResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() policyKey!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() locale!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() contentHash!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) acceptedConsentRecordId!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) acceptedAt!: Date | null;
}

export class ConsentRecordResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) policyVersionId!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: Date;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) withdrawnAt!: Date | null;
}

export class MedicalIntakeResponseDto {
  @ApiPropertyOptional({ enum: ['DRAFT', 'COMPLETE'], nullable: true }) submissionState!: 'DRAFT' | 'COMPLETE' | null;
  @ApiProperty({ minimum: 0 }) currentRevision!: number;
  @ApiPropertyOptional({ minimum: 1, nullable: true }) completedRevision!: number | null;
  @ApiPropertyOptional({ nullable: true, type: IntakeSnapshotDto }) snapshot!: IntakeSnapshotDto | null;
}
