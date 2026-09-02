import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const visitModes = ['IN_PERSON', 'ONLINE'] as const;
const exceptionKinds = ['AVAILABLE', 'UNAVAILABLE'] as const;

class PageQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}

export class AvailabilityRuleListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorId?: string;
  @ApiPropertyOptional({ enum: visitModes }) @IsOptional() @IsIn(visitModes) visitMode?: (typeof visitModes)[number];
  @ApiPropertyOptional({ minimum: 1, maximum: 7 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(7) isoWeekday?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class ClinicClosureListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601({ strict: true }) from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601({ strict: true }) to?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class DoctorAvailabilityExceptionListQueryDto extends ClinicClosureListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorId?: string;
  @ApiPropertyOptional({ enum: exceptionKinds }) @IsOptional() @IsIn(exceptionKinds) kind?: (typeof exceptionKinds)[number];
  @ApiPropertyOptional({ enum: visitModes }) @IsOptional() @IsIn(visitModes) visitMode?: (typeof visitModes)[number];
}

export class CreateAvailabilityRuleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') doctorId!: string;
  @ApiProperty({ enum: visitModes }) @IsIn(visitModes) visitMode!: (typeof visitModes)[number];
  @ApiProperty({ minimum: 1, maximum: 7 }) @Type(() => Number) @IsInt() @Min(1) @Max(7) isoWeekday!: number;
  @ApiProperty({ example: '09:00' }) @IsString() @MaxLength(5) startLocalTime!: string;
  @ApiProperty({ example: '17:00' }) @IsString() @MaxLength(5) endLocalTime!: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateAvailabilityRuleDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorId?: string;
  @ApiPropertyOptional({ enum: visitModes }) @IsOptional() @IsIn(visitModes) visitMode?: (typeof visitModes)[number];
  @ApiPropertyOptional({ minimum: 1, maximum: 7 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(7) isoWeekday?: number;
  @ApiPropertyOptional({ example: '09:00' }) @IsOptional() @IsString() @MaxLength(5) startLocalTime?: string;
  @ApiPropertyOptional({ example: '17:00' }) @IsOptional() @IsString() @MaxLength(5) endLocalTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

class IntervalDto {
  @ApiProperty({ format: 'date-time' }) @IsISO8601({ strict: true }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) @IsISO8601({ strict: true }) endsAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateClinicClosureDto extends IntervalDto {
  @ApiProperty({ maxLength: 160 }) @IsString() @MaxLength(160) label!: string;
}
export class UpdateClinicClosureDto {
  @ApiPropertyOptional({ maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) label?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601({ strict: true }) startsAt?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601({ strict: true }) endsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateDoctorAvailabilityExceptionDto extends IntervalDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') doctorId!: string;
  @ApiProperty({ enum: exceptionKinds }) @IsIn(exceptionKinds) kind!: (typeof exceptionKinds)[number];
  @ApiPropertyOptional({ enum: visitModes, nullable: true }) @ValidateIf((value) => value.kind !== 'UNAVAILABLE' || value.visitMode !== null) @IsOptional() @IsIn(visitModes) visitMode?: (typeof visitModes)[number] | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) label?: string | null;
}

export class UpdateDoctorAvailabilityExceptionDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorId?: string;
  @ApiPropertyOptional({ enum: exceptionKinds }) @IsOptional() @IsIn(exceptionKinds) kind?: (typeof exceptionKinds)[number];
  @ApiPropertyOptional({ enum: visitModes, nullable: true }) @ValidateIf((value) => value.visitMode !== null) @IsOptional() @IsIn(visitModes) visitMode?: (typeof visitModes)[number] | null;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601({ strict: true }) startsAt?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601({ strict: true }) endsAt?: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) label?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AvailabilityRuleResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ format: 'uuid' }) doctorId!: string; @ApiProperty({ enum: visitModes }) visitMode!: string; @ApiProperty() isoWeekday!: number; @ApiProperty() startLocalTime!: string; @ApiProperty() endLocalTime!: string; @ApiProperty() isActive!: boolean; @ApiProperty({ format: 'date-time' }) createdAt!: Date; @ApiProperty({ format: 'date-time' }) updatedAt!: Date; }
export class ClinicClosureResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ format: 'date-time' }) startsAt!: Date; @ApiProperty({ format: 'date-time' }) endsAt!: Date; @ApiProperty() label!: string; @ApiProperty() isActive!: boolean; @ApiProperty({ format: 'date-time' }) createdAt!: Date; @ApiProperty({ format: 'date-time' }) updatedAt!: Date; }
export class DoctorAvailabilityExceptionResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ format: 'uuid' }) doctorId!: string; @ApiProperty({ enum: exceptionKinds }) kind!: string; @ApiPropertyOptional({ enum: visitModes, nullable: true }) visitMode!: string | null; @ApiProperty({ format: 'date-time' }) startsAt!: Date; @ApiProperty({ format: 'date-time' }) endsAt!: Date; @ApiPropertyOptional({ nullable: true }) label!: string | null; @ApiProperty() isActive!: boolean; @ApiProperty({ format: 'date-time' }) createdAt!: Date; @ApiProperty({ format: 'date-time' }) updatedAt!: Date; }
export class AvailabilityRulePageResponseDto { @ApiProperty({ type: AvailabilityRuleResponseDto, isArray: true }) items!: AvailabilityRuleResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
export class ClinicClosurePageResponseDto { @ApiProperty({ type: ClinicClosureResponseDto, isArray: true }) items!: ClinicClosureResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
export class DoctorAvailabilityExceptionPageResponseDto { @ApiProperty({ type: DoctorAvailabilityExceptionResponseDto, isArray: true }) items!: DoctorAvailabilityExceptionResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
