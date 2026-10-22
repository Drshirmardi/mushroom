import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

import { Type } from 'class-transformer';
import { CommerceOrderStatus } from '../../../generated/prisma/client';

export class OrderSearchQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: 10000 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiPropertyOptional({ maxLength: 120 }) @IsOptional() @IsString() @MaxLength(120) query?: string;
  @ApiPropertyOptional({ enum: CommerceOrderStatus }) @IsOptional() @IsEnum(CommerceOrderStatus) status?: CommerceOrderStatus;
  @ApiPropertyOptional({ enum: ['PICKUP', 'COURIER'] }) @IsOptional() @IsIn(['PICKUP', 'COURIER']) shippingMethod?: 'PICKUP' | 'COURIER';
}
export class OrderSearchPageDto {
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } }) items!: Record<string, unknown>[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class OrderTransitionDto { @ApiProperty({ enum: ['FULFILLMENT_PENDING', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED'] }) @IsIn(['FULFILLMENT_PENDING', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED']) status!: string; }
export class OrderTrackingDto { @ApiProperty({ example: 'Post' }) @IsString() @MaxLength(160) carrierName!: string; @ApiProperty({ example: 'PK-123' }) @IsString() @MaxLength(160) trackingCode!: string; @ApiPropertyOptional({ example: 'https://carrier.example/track/PK-123' }) @IsOptional() @IsString() @MaxLength(2048) trackingUrl?: string; }
export class OrderRequestDto { @ApiPropertyOptional({ example: 'Customer requested cancellation' }) @IsOptional() @IsString() @MaxLength(500) reason?: string; }
export class RefundRequestDto { @ApiProperty({ example: '25000', description: 'Positive integer TOMAN' }) @Matches(/^[1-9][0-9]*$/u) amountToman!: string; @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string; }
export class RefundCompleteDto { @ApiPropertyOptional({ description: 'Non-sensitive bank-transfer reference or evidence locator; required only when completing a refund' }) @IsOptional() @IsString() @MaxLength(512) evidenceReference?: string; }
export class ReconciliationDto { @ApiProperty({ enum: ['VERIFIED', 'FAILED'] }) @IsIn(['VERIFIED', 'FAILED']) resolution!: 'VERIFIED' | 'FAILED'; @ApiProperty({ description: 'Non-sensitive reviewed evidence locator' }) @IsString() @MaxLength(512) evidenceReference!: string; }
