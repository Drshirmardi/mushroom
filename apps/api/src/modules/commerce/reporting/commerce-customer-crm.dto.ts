import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const customerCrmSegments = [
  'POTENTIAL',
  'ONE_TIME',
  'RETURNING',
  'VIP',
] as const;

export const customerCrmSorts = [
  'NET_SPEND',
  'SUCCESSFUL_PURCHASE_COUNT',
  'LAST_PURCHASE_AT',
  'DISPLAY_NAME',
] as const;

export const customerCrmDirections = ['ASC', 'DESC'] as const;

export type CustomerCrmSegment = (typeof customerCrmSegments)[number];
export type CustomerCrmSort = (typeof customerCrmSorts)[number];
export type CustomerCrmDirection = (typeof customerCrmDirections)[number];

export class CommerceCustomerCrmQueryDto {
  @ApiProperty({ format: 'uuid', description: 'Required existing ADMIN-authorized clinic scope.' })
  @IsUUID('4')
  clinicId!: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 25 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @ApiPropertyOptional({ maxLength: 120, description: 'Trimmed substring of the canonical display name.' })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: customerCrmSegments })
  @IsOptional()
  @IsIn(customerCrmSegments)
  segment?: CustomerCrmSegment;

  @ApiPropertyOptional({ enum: customerCrmSorts, default: 'NET_SPEND' })
  @IsOptional()
  @IsIn(customerCrmSorts)
  sort: CustomerCrmSort = 'NET_SPEND';

  @ApiPropertyOptional({ enum: customerCrmDirections, default: 'DESC' })
  @IsOptional()
  @IsIn(customerCrmDirections)
  direction: CustomerCrmDirection = 'DESC';
}

export class CommerceCustomerCrmSummaryDto {
  @ApiProperty()
  totalCustomerCount!: number;

  @ApiProperty()
  vipCustomerCount!: number;

  @ApiProperty({ type: String, description: 'Integer TOMAN.' })
  netSpendToman!: string;

  @ApiProperty({ type: String, description: 'Integer-truncated TOMAN average; zero for an empty population.' })
  averageNetSpendToman!: string;
}

export class CommerceCustomerCrmItemDto {
  @ApiProperty({ format: 'uuid' })
  patientId!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'] })
  accountStatus!: 'ACTIVE' | 'DISABLED';

  @ApiProperty({ enum: customerCrmSegments })
  segment!: CustomerCrmSegment;

  @ApiProperty()
  successfulPurchaseCount!: number;

  @ApiProperty({ type: String, description: 'Integer TOMAN.' })
  grossToman!: string;

  @ApiProperty({ type: String, description: 'Integer TOMAN.' })
  completedRefundToman!: string;

  @ApiProperty({ type: String, description: 'Integer TOMAN.' })
  netSpendToman!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  topProduct!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastPurchaseAt!: Date | null;
}

export class CommerceCustomerCrmPageDto {
  @ApiProperty({ format: 'uuid' })
  clinicId!: string;

  @ApiProperty({ enum: ['TOMAN'] })
  currency!: 'TOMAN';

  @ApiProperty({ example: 'Asia/Tehran' })
  timeZone!: string;

  @ApiProperty({ format: 'date-time' })
  asOf!: Date;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalCustomerCount!: number;

  @ApiProperty({ type: CommerceCustomerCrmSummaryDto })
  summary!: CommerceCustomerCrmSummaryDto;

  @ApiProperty({ type: CommerceCustomerCrmItemDto, isArray: true })
  items!: CommerceCustomerCrmItemDto[];
}
