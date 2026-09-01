import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PatientAvailabilityQueryDto {
  @ApiProperty({ example: '2026-09-01' }) @IsDateString({ strict: true }) fromDate!: string;
  @ApiProperty({ example: '2026-09-30' }) @IsDateString({ strict: true }) toDate!: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class PatientAvailabilityItemDto { @ApiProperty({ format: 'date-time' }) startsAt!: Date; @ApiProperty({ format: 'date-time' }) endsAt!: Date; @ApiProperty() localDate!: string; @ApiProperty() localStartTime!: string; @ApiProperty() localEndTime!: string; }
export class PatientAvailabilityResponseDto { @ApiProperty({ format: 'uuid' }) doctorServiceId!: string; @ApiProperty() timeZone!: string; @ApiProperty() fromDate!: string; @ApiProperty() toDate!: string; @ApiProperty({ type: PatientAvailabilityItemDto, isArray: true }) items!: PatientAvailabilityItemDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
