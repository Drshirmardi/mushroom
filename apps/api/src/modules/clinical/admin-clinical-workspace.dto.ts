import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator';

const clinicalRecordKinds = ['DIAGNOSIS', 'ALLERGY', 'CONDITION', 'MEDICATION_STATEMENT'] as const;

export class CreateClinicalNoteDto {
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsInt() @Min(0) expectedRevision!: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50_000) content!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrivate?: boolean;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_value, summary) => summary !== null) @IsString() @MaxLength(10_000) patientSummary?: string | null;
}

export class SaveClinicalNoteDto extends CreateClinicalNoteDto {
  @ApiPropertyOptional({ maxLength: 120, nullable: true }) @IsOptional() @ValidateIf((_value, reason) => reason !== null) @IsString() @MaxLength(120) amendmentReasonCategory?: string | null;
}

export class SignClinicalRevisionDto {
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) revisionNumber!: number;
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
}

export class PublishClinicalNoteDto extends SignClinicalRevisionDto {}

export class ReconcileClinicalRecordDto {
  @ApiProperty({ enum: clinicalRecordKinds }) @IsIn(clinicalRecordKinds) kind!: (typeof clinicalRecordKinds)[number];
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') encounterId?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') sourceIntakeId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') sourceIntakeRevisionId!: string;
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) sourceIntakeRevisionNumber!: number;
  @ApiProperty({ type: Object }) @IsObject() reviewedContent!: Record<string, unknown>;
}

export class ReviseClinicalRecordDto {
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ type: Object }) @IsObject() reviewedContent!: Record<string, unknown>;
  @ApiPropertyOptional({ maxLength: 120, nullable: true }) @IsOptional() @ValidateIf((_value, reason) => reason !== null) @IsString() @MaxLength(120) amendmentReasonCategory?: string | null;
}
