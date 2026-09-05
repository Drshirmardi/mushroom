import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class PrescriptionItemDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @IsNotEmpty() @MaxLength(255) medicationName!: string;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) doseText?: string;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) frequencyText?: string;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) durationText?: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsInt() @Min(0) expectedRevision!: number;
  @ApiProperty({ type: () => PrescriptionItemDto, isArray: true, maxItems: 100 }) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => PrescriptionItemDto) items!: PrescriptionItemDto[];
}

export class SavePrescriptionDraftDto extends CreatePrescriptionDto {
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) amendmentReasonCategory?: string;
}

export class IssuePrescriptionDto {
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) revisionNumber!: number;
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
}
