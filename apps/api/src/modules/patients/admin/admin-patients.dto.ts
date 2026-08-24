import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const declarationStatuses = ['NONE', 'UNKNOWN', 'PRESENT'] as const;
const sexAtBirthValues = ['FEMALE', 'MALE', 'INTERSEX', 'UNKNOWN', 'PREFER_NOT_TO_SAY'] as const;
const bloodTypeValues = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN'] as const;
const sleepValues = ['LESS_THAN_5_HOURS', 'FROM_5_TO_LESS_THAN_7_HOURS', 'FROM_7_TO_9_HOURS', 'MORE_THAN_9_HOURS', 'UNKNOWN'] as const;
const exerciseValues = ['NONE', 'ONCE_OR_TWICE_WEEKLY', 'THREE_OR_FOUR_TIMES_WEEKLY', 'DAILY', 'UNKNOWN'] as const;
const stressValues = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'UNKNOWN'] as const;
const tobaccoValues = ['NEVER', 'FORMER', 'CURRENT', 'UNKNOWN'] as const;

export class MedicalDeclarationDto {
  @IsIn(declarationStatuses)
  status!: (typeof declarationStatuses)[number];

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  items!: string[];
}

export class AdminPatientListQueryDto {
  @IsOptional() @IsString() @MaxLength(100)
  query?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  pageSize = 20;
}

export class CreateAdminPatientDto {
  @IsString() @MaxLength(64)
  phone!: string;

  @IsOptional() @IsString() @MaxLength(80)
  firstName?: string;

  @IsOptional() @IsString() @MaxLength(100)
  lastName?: string;

  @IsOptional() @IsEmail() @MaxLength(254)
  email?: string;

  @IsOptional() @IsString() @MaxLength(100)
  cityName?: string;
}

export class UpdateAdminPatientDto {
  @IsOptional() @IsString() @MaxLength(80)
  firstName?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  lastName?: string | null;

  @IsOptional() @IsEmail() @MaxLength(254)
  email?: string | null;

  @IsOptional() @IsString() @MaxLength(100)
  cityName?: string | null;
}

export class AdminMedicalIntakeCorrectionDto {
  @IsInt() @Min(0)
  expectedRevision!: number;

  @IsString() @MaxLength(500)
  correctionReason!: string;

  @IsOptional() @IsString()
  birthDate?: string | null;
  @IsOptional() @IsIn(sexAtBirthValues)
  sexAtBirth?: (typeof sexAtBirthValues)[number] | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(20) @Max(300)
  heightCm?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.5) @Max(1000)
  weightKg?: number | null;
  @IsOptional() @IsIn(bloodTypeValues)
  bloodType?: (typeof bloodTypeValues)[number] | null;
  @IsOptional() @ValidateIf((_, value) => value !== null)
  allergyReport?: MedicalDeclarationDto | null;
  @IsOptional() @ValidateIf((_, value) => value !== null)
  chronicConditionReport?: MedicalDeclarationDto | null;
  @IsOptional() @ValidateIf((_, value) => value !== null)
  currentMedicationReport?: MedicalDeclarationDto | null;
  @IsOptional() @IsIn(sleepValues)
  sleepDurationBand?: (typeof sleepValues)[number] | null;
  @IsOptional() @IsIn(exerciseValues)
  exerciseFrequency?: (typeof exerciseValues)[number] | null;
  @IsOptional() @IsIn(stressValues)
  stressLevel?: (typeof stressValues)[number] | null;
  @IsOptional() @IsIn(tobaccoValues)
  tobaccoUse?: (typeof tobaccoValues)[number] | null;
}

export class AdminPatientListItemResponseDto {
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) ageYears!: number | null;
  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'] }) accountStatus!: string;
  @ApiProperty({ enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] }) onboardingState!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class AdminPatientListResponseDto {
  @ApiProperty({ type: AdminPatientListItemResponseDto, isArray: true }) items!: AdminPatientListItemResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}

export class AdminPatientCreateResponseDto {
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'] }) accountStatus!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class AdminPatientProfileUpdateResponseDto {
  @ApiPropertyOptional({ type: String, nullable: true }) firstName!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) lastName!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) email!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) cityName!: string | null;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class AdminOnboardingSummaryResponseDto {
  @ApiProperty({ format: 'date-time' }) asOf!: Date;
  @ApiProperty({ example: 'Asia/Tehran' }) timeZone!: string;
  @ApiProperty() newPatientsToday!: number;
  @ApiProperty() onboardingCompletePatients!: number;
  @ApiProperty() onboardingIncompletePatients!: number;
}

export class AdminMedicalIntakeRevisionResponseDto {
  @ApiProperty() revisionNumber!: number;
  @ApiProperty({ enum: ['DRAFT', 'COMPLETE'] }) revisionState!: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date' }) birthDate!: string | null;
  @ApiPropertyOptional({ nullable: true, enum: sexAtBirthValues }) sexAtBirth!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) heightCm!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Decimal value serialized as a string.' }) weightKg!: string | null;
  @ApiPropertyOptional({ nullable: true, enum: bloodTypeValues }) bloodType!: string | null;
  @ApiPropertyOptional({ nullable: true, type: MedicalDeclarationDto }) allergyReport!: MedicalDeclarationDto | null;
  @ApiPropertyOptional({ nullable: true, type: MedicalDeclarationDto }) chronicConditionReport!: MedicalDeclarationDto | null;
  @ApiPropertyOptional({ nullable: true, type: MedicalDeclarationDto }) currentMedicationReport!: MedicalDeclarationDto | null;
  @ApiProperty({ enum: ['PATIENT_SELF_REPORTED'] }) provenance!: string;
}

export class AdminPatientProfileResponseDto {
  @ApiPropertyOptional({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'] }) accountStatus!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) firstName!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) lastName!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) email!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) cityName!: string | null;
}

export class AdminPatientConsentResponseDto {
  @ApiProperty() active!: boolean;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' }) policyVersionId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' }) consentRecordId!: string | null;
}

export class AdminPatientIntakeResponseDto {
  @ApiPropertyOptional({ type: Number, nullable: true }) assignedSchemaVersion!: number | null;
  @ApiProperty() currentRevision!: number;
  @ApiProperty({ enum: ['PATIENT_SELF_REPORTED'] }) provenance!: string;
  @ApiProperty({ enum: ['AVAILABLE', 'CONSENT_REQUIRED', 'NOT_STARTED'] }) status!: string;
  @ApiPropertyOptional({ nullable: true, type: AdminMedicalIntakeRevisionResponseDto }) value!: AdminMedicalIntakeRevisionResponseDto | null;
}

export class AdminPatientDetailResponseDto {
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ type: () => AdminPatientProfileResponseDto }) profile!: AdminPatientProfileResponseDto;
  @ApiProperty({ type: () => AdminPatientConsentResponseDto }) consent!: AdminPatientConsentResponseDto;
  @ApiProperty({ type: () => AdminPatientIntakeResponseDto }) intake!: AdminPatientIntakeResponseDto;
}
