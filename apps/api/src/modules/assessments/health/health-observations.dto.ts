import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const metrics = ['PAIN', 'MOOD', 'SLEEP_HOURS', 'STRESS', 'ENERGY', 'WEIGHT'] as const;
const units = ['SCORE_10', 'SCORE_5', 'HOURS', 'KILOGRAMS'] as const;

export class CreateHealthObservationDto {
  @ApiProperty({ enum: metrics }) @IsIn(metrics) metric!: (typeof metrics)[number];
  @ApiProperty({ type: Number }) @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) value!: number;
  @ApiProperty({ format: 'date-time' }) @IsDateString({ strict: true }) observedAt!: string;
}

export class HealthObservationQueryDto {
  @ApiPropertyOptional({ enum: metrics }) @IsOptional() @IsIn(metrics) metric?: (typeof metrics)[number];
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString({ strict: true }) from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString({ strict: true }) to?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') cursor?: string;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class HealthObservationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: metrics }) metric!: (typeof metrics)[number];
  @ApiProperty({ enum: units }) unit!: (typeof units)[number];
  @ApiProperty({ type: Number }) value!: number;
  @ApiProperty({ format: 'date-time' }) observedAt!: Date;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class HealthObservationListResponseDto {
  @ApiProperty({ type: HealthObservationResponseDto, isArray: true }) items!: HealthObservationResponseDto[];
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) nextCursor!: string | null;
}
