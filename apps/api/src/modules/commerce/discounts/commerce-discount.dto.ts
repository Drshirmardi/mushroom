import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const kinds = ['FIXED_AMOUNT', 'PERCENTAGE'] as const;

export class CreateCommerceDiscountDto {
  @ApiProperty({ minLength: 3, maxLength: 40 }) @IsString() @MaxLength(80) code!: string;
  @ApiProperty({ maxLength: 160 }) @IsString() @MaxLength(160) title!: string;
  @ApiProperty({ enum: kinds }) @IsIn(kinds) kind!: (typeof kinds)[number];
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Positive integer TOMAN for FIXED_AMOUNT only.' }) @IsOptional() @IsString() @MaxLength(20) amountToman?: string | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 10000, nullable: true, description: 'Basis points for PERCENTAGE only.' }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) percentageBasisPoints?: number | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) @IsOptional() @IsISO8601() startsAt?: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) @IsOptional() @IsISO8601() endsAt?: string | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPatientUsageLimit?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCommerceDiscountDto {
  @ApiPropertyOptional({ maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) title?: string;
  @ApiPropertyOptional({ enum: kinds }) @IsOptional() @IsIn(kinds) kind?: (typeof kinds)[number];
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(20) amountToman?: string | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 10000, nullable: true }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) percentageBasisPoints?: number | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) @IsOptional() @IsISO8601() startsAt?: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) @IsOptional() @IsISO8601() endsAt?: string | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) perPatientUsageLimit?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CommerceDiscountResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() code!: string; @ApiProperty() title!: string; @ApiProperty({ enum: kinds }) kind!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) amountToman!: string | null; @ApiPropertyOptional({ type: Number, nullable: true }) percentageBasisPoints!: number | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) startsAt!: string | null; @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) endsAt!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) usageLimit!: number | null; @ApiPropertyOptional({ type: Number, nullable: true }) perPatientUsageLimit!: number | null; @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: Number }) reservedCount!: number; @ApiProperty({ type: Number }) consumedCount!: number; @ApiPropertyOptional({ type: Number, nullable: true }) remainingGlobalCapacity!: number | null;
}
