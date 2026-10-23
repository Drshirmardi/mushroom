import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PaymentGatewayRequestsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) query?: string;
  @ApiPropertyOptional({ enum: ['CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING', 'VERIFIED', 'FAILED', 'EXPIRED', 'REQUIRES_RECONCILIATION'] }) @IsOptional() @IsIn(['CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING', 'VERIFIED', 'FAILED', 'EXPIRED', 'REQUIRES_RECONCILIATION']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() until?: string;
  @ApiPropertyOptional({ type: Number, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @ApiPropertyOptional({ type: Number, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}

export class PaymentGatewayRequestDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['BILLING', 'COMMERCE'] }) source!: 'BILLING' | 'COMMERCE';
  @ApiProperty() patientId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() name!: string;
  @ApiProperty() purpose!: string;
  @ApiProperty({ type: String, nullable: true }) intentId!: string | null;
  @ApiProperty({ type: String, nullable: true }) orderId!: string | null;
  @ApiProperty() providerOrderId!: string;
  @ApiProperty() revisionNumber!: number;
  @ApiProperty() amountRial!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: String, nullable: true }) resultCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) reference!: string | null;
  @ApiProperty({ type: String, nullable: true }) traceNumber!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: String, nullable: true }) verifiedAt!: string | null;
}
export class PaymentGatewayRequestsPageDto {
  @ApiProperty({ type: [PaymentGatewayRequestDto] }) items!: PaymentGatewayRequestDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class PaymentGatewayTraceDto {
  @ApiProperty() id!: string;
  @ApiProperty() at!: string;
  @ApiProperty() stage!: string;
  @ApiProperty() outcome!: string;
  @ApiProperty({ type: String, nullable: true }) resultCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) errorKind!: string | null;
  @ApiProperty({ type: Number, nullable: true }) httpStatus!: number | null;
  @ApiProperty() durationMs!: number;
}
export class PaymentGatewayRequestDetailDto {
  @ApiProperty({ type: PaymentGatewayRequestDto }) request!: PaymentGatewayRequestDto;
  @ApiProperty({ type: [PaymentGatewayTraceDto] }) events!: PaymentGatewayTraceDto[];
  @ApiProperty() eventsTruncated!: boolean;
}
