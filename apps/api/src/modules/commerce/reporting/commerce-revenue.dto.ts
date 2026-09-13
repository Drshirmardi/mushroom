import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

export const commerceRevenueGranularities = ['DAY', 'WEEK', 'MONTH'] as const;
export type CommerceRevenueGranularity = (typeof commerceRevenueGranularities)[number];

export class CommerceRevenueQueryDto {
  @ApiPropertyOptional({ example: '2026-09-01', description: 'Clinic-local inclusive ISO date.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Clinic-local inclusive ISO date.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  to?: string;

  @ApiPropertyOptional({ enum: commerceRevenueGranularities, default: 'DAY' })
  @IsOptional()
  @IsIn(commerceRevenueGranularities)
  granularity?: CommerceRevenueGranularity;
}

export class CommerceRevenueSeriesPointDto {
  @ApiProperty() date!: string;
  @ApiProperty({ type: String }) grossCapturedToman!: string;
  @ApiProperty({ type: String }) completedRefundToman!: string;
  @ApiProperty({ type: String }) netRevenueToman!: string;
  @ApiProperty() successfulPaymentCount!: number;
}

export class CommerceRevenueDto {
  @ApiProperty({ enum: ['TOMAN'] }) currency!: 'TOMAN';
  @ApiProperty() timeZone!: string;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ type: String }) grossCapturedToman!: string;
  @ApiProperty({ type: String }) completedRefundToman!: string;
  @ApiProperty({ type: String }) netRevenueToman!: string;
  @ApiProperty() successfulPaymentCount!: number;
  @ApiProperty({ type: CommerceRevenueSeriesPointDto, isArray: true }) series!: CommerceRevenueSeriesPointDto[];
}
