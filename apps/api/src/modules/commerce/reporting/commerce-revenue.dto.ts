import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

export const commerceRevenueGranularities = ['DAY', 'WEEK', 'MONTH'] as const;
export type CommerceRevenueGranularity = (typeof commerceRevenueGranularities)[number];

export class CommerceReportingKpiDefinitionResponseDto {
  @ApiProperty({ enum: ['KPI-17', 'KPI-18', 'KPI-19', 'KPI-20', 'KPI-21'] }) id!: string;
  @ApiProperty() formula!: string;
  @ApiProperty() dataOwner!: 'Commerce';
  @ApiProperty() sourceOfTruth!: string;
  @ApiProperty({ enum: ['tenant-and-clinic'] }) scope!: 'tenant-and-clinic';
  @ApiProperty({ example: 'Asia/Tehran' }) timeZone!: 'Asia/Tehran';
  @ApiProperty({ enum: ['TOMAN', 'NONE'] }) currency!: 'TOMAN' | 'NONE';
  @ApiProperty() rounding!: string;
  @ApiProperty() zeroOrNotApplicableRule!: string;
  @ApiProperty() partialDataRule!: string;
  @ApiProperty() staleDataRule!: string;
}

export const commerceReportingKpiDefinitions = [
  { id: 'KPI-17', formula: 'sum(Payment.commerceAmountToman) where Payment.verifiedAt in range', dataOwner: 'Commerce', sourceOfTruth: 'PostgreSQL Payment joined through order clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', currency: 'TOMAN', rounding: 'integer TOMAN', zeroOrNotApplicableRule: 'zero when no verified payment', partialDataRule: 'identify the unavailable Payment range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-18', formula: 'sum(Refund.amountToman) where Refund.status=COMPLETED and completedAt in range', dataOwner: 'Commerce', sourceOfTruth: 'PostgreSQL Refund → Payment → Order clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', currency: 'TOMAN', rounding: 'integer TOMAN', zeroOrNotApplicableRule: 'zero when no completed refund', partialDataRule: 'identify the unavailable Refund range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-19', formula: 'KPI-17 - KPI-18 per whole range and per time bucket', dataOwner: 'Commerce', sourceOfTruth: 'PostgreSQL verified Payment and completed Refund', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', currency: 'TOMAN', rounding: 'integer TOMAN', zeroOrNotApplicableRule: 'operational revenue may be negative; it is not Sadad settlement', partialDataRule: 'identify the unavailable payment/refund range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-20', formula: 'count(Payment.id) with verifiedAt in range', dataOwner: 'Commerce', sourceOfTruth: 'PostgreSQL Payment → Order clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', currency: 'NONE', rounding: 'count', zeroOrNotApplicableRule: 'zero when no verified payment; callback, attempt, and order are excluded', partialDataRule: 'identify the unavailable Payment range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-21', formula: 'count(Refund.id) where status in {REQUESTED, APPROVED} at asOf', dataOwner: 'Commerce', sourceOfTruth: 'PostgreSQL Refund → Payment → Order clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', currency: 'NONE', rounding: 'count', zeroOrNotApplicableRule: 'zero when no pending refund; no monetary projection', partialDataRule: 'identify the unavailable Refund snapshot source; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
] as const satisfies readonly CommerceReportingKpiDefinitionResponseDto[];

export class CommerceRevenueQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Explicit active clinic scope when more than one active clinic exists.' })
  @IsOptional()
  @IsUUID('4')
  clinicId?: string;

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
  @ApiProperty({ format: 'uuid' }) clinicId!: string;
  @ApiProperty({ enum: ['TOMAN'] }) currency!: 'TOMAN';
  @ApiProperty() timeZone!: string;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ format: 'date-time' }) asOf!: Date;
  @ApiProperty({ enum: ['current', 'partial', 'stale'] }) sourceStatus!: 'current' | 'partial' | 'stale';
  @ApiProperty({ enum: ['operational revenue'] }) revenueLabel!: 'operational revenue';
  @ApiProperty({ type: String }) grossCapturedToman!: string;
  @ApiProperty({ type: String }) completedRefundToman!: string;
  @ApiProperty({ type: String }) netRevenueToman!: string;
  @ApiProperty() successfulPaymentCount!: number;
  @ApiProperty({ type: CommerceRevenueSeriesPointDto, isArray: true }) series!: CommerceRevenueSeriesPointDto[];
}
