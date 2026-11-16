import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const normalizeDigits = (value: unknown) => typeof value === 'string' ? value.trim().replace(/[۰-۹٠-٩]/gu, c => String(c.charCodeAt(0) >= 0x6f0 ? c.charCodeAt(0) - 0x6f0 : c.charCodeAt(0) - 0x660)) : value;
export class BillingPageQuery {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}
export class BillingAdminQuery extends BillingPageQuery {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') patientId?: string;
  @ApiPropertyOptional({ enum: ['TOPUP', 'ORDER', 'APPOINTMENT', 'ASSESSMENT', 'PROGRAM', 'ENTRY_ASSESSMENT', 'MARRIAGE_REQUEST'] }) @IsOptional() @IsIn(['TOPUP', 'ORDER', 'APPOINTMENT', 'ASSESSMENT', 'PROGRAM', 'ENTRY_ASSESSMENT', 'MARRIAGE_REQUEST']) purpose?: string;
  @ApiPropertyOptional({ enum: ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'COMPENSATED'] }) @IsOptional() @IsIn(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'COMPENSATED']) status?: string;
}
export class WalletAmountDto {
  @ApiProperty({ type: String, description: 'Integer TOMAN; normalized Persian and Arabic digits accepted.' }) @Transform(({ value }) => normalizeDigits(value)) @Matches(/^(0|[1-9][0-9]{0,17})$/u) amountToman!: string;
}
export class WalletAdjustmentDto extends WalletAmountDto {
  @ApiProperty({ enum: ['CREDIT', 'DEBIT', 'SET_BALANCE'] }) @IsIn(['CREDIT', 'DEBIT', 'SET_BALANCE']) type!: 'CREDIT' | 'DEBIT' | 'SET_BALANCE';
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) @Max(2147483646) expectedVersion!: number;
  @ApiProperty({ maxLength: 500 }) @IsString() @MaxLength(500) reason!: string;
}
export class WalletStatusDto {
  @ApiProperty() @IsBoolean() frozen!: boolean;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) @Max(2147483646) expectedVersion!: number;
  @ApiProperty({ maxLength: 500 }) @IsString() @MaxLength(500) reason!: string;
}
export class BillingOrderIntentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') orderId!: string;
}
export class BillingAppointmentIntentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') doctorServiceId!: string;
  @ApiProperty({ format: 'date-time' }) @IsISO8601({ strict: true }) startsAt!: string;
}
export class BillingRefundRequestDto {
  @ApiProperty({ type: String, description: 'Exact integer IRR, including service-price remainders smaller than one TOMAN.' }) @Transform(({ value }) => normalizeDigits(value)) @Matches(/^(0|[1-9][0-9]{0,18})$/u) amountRial!: string;
  @ApiProperty({ maxLength: 500 }) @IsString() @MaxLength(500) reason!: string;
}
export class BillingRefundCompleteDto {
  @ApiProperty({ maxLength: 500 }) @IsString() @MaxLength(500) evidenceReference!: string;
}
export class WalletSummaryDto {
  @ApiProperty() patientId!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ type: String }) balanceRial!: string;
  @ApiProperty() version!: number;
  @ApiProperty() frozen!: boolean;
  @ApiProperty({ format: 'date-time' }) asOf!: string;
}
export class WalletAdjustmentResultDto {
  @ApiProperty() patientId!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() beforeRial!: string;
  @ApiProperty() balanceRial!: string;
  @ApiProperty() deltaRial!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ type: String, nullable: true }) journalId!: string | null;
}
export class WalletTransactionDto {
  @ApiProperty() id!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() deltaRial!: string;
  @ApiProperty() balanceAfterRial!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'ADMIN projection only' }) actorUserId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'ADMIN projection only' }) actorDisplayName?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'ADMIN projection only' }) reason?: string | null;
  @ApiPropertyOptional({ description: 'ADMIN projection only' }) balanceBeforeRial?: string;
}
export class WalletTransactionPageDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: WalletTransactionDto, isArray: true }) items!: WalletTransactionDto[];
}
export class BillingRefundDto {
  @ApiProperty() id!: string;
  @ApiProperty() status!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ type: String, nullable: true }) completedAt!: string | null;
}
export class BillingAttemptStatusDto {
  @ApiProperty() id!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: String, nullable: true }) reference!: string | null;
  @ApiProperty({ type: String, nullable: true }) traceNumber!: string | null;
  @ApiProperty({ type: String, nullable: true }) verifiedAt!: string | null;
}
export class BillingPaymentMethodDto {
  @ApiProperty({ enum: ['WALLET', 'GATEWAY'] }) code!: string;
  @ApiProperty() available!: boolean;
  @ApiProperty({ type: String, nullable: true }) balanceRial!: string | null;
}
export class BillingIntentDto {
  @ApiPropertyOptional({ type: String, format: 'uuid', description: 'Present for the APPOINTMENT target only' }) doctorId?: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid', description: 'Present for the PROGRAM target only' }) programPurchaseId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid', description: 'Present for the ASSESSMENT target only' }) assessmentPurchaseId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid', description: 'Present for the MARRIAGE_REQUEST target only' }) marriagePublicationId?: string | null;
  @ApiPropertyOptional({ type: BillingPaymentMethodDto, isArray: true }) methods?: BillingPaymentMethodDto[];
  @ApiProperty() id!: string;
  @ApiProperty() purpose!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: String, nullable: true }) method!: string | null;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ type: String, nullable: true }) orderId!: string | null;
  @ApiProperty({ type: String, nullable: true }) appointmentId!: string | null;
  @ApiProperty({ type: String, nullable: true }) expiresAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) paidAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional({ type: BillingAttemptStatusDto, isArray: true }) attempts?: BillingAttemptStatusDto[];
  @ApiPropertyOptional({ type: BillingRefundDto, isArray: true }) refunds?: BillingRefundDto[];
}
export class AdminBillingIntentDto extends BillingIntentDto {
  @ApiProperty({ format: 'uuid' }) patientId!: string;
}
export class BillingIntentPageDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: AdminBillingIntentDto, isArray: true }) items!: AdminBillingIntentDto[];
}
export class BillingGatewayAttemptDto {
  @ApiProperty() id!: string;
  @ApiProperty() intentId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ type: String, nullable: true }) redirectUrl!: string | null;
}
export class WalletStatusResultDto {
  @ApiProperty() frozen!: boolean;
  @ApiProperty() version!: number;
}
export class BillingSummaryDto {
  @ApiProperty() currency!: string;
  @ApiProperty() asOf!: string;
  @ApiProperty() walletLiabilityRial!: string;
  @ApiProperty() gatewayReceivedRial!: string;
  @ApiProperty() topupReceivedRial!: string;
  @ApiProperty() orderPaidRial!: string;
  @ApiProperty() appointmentPaidRial!: string;
  @ApiProperty() refundedRial!: string;
  @ApiProperty() administrativeCreditRial!: string;
  @ApiProperty() administrativeDebitRial!: string;
  @ApiProperty() ledgerMismatchCount!: number;
  @ApiProperty() source!: string;
}
export class BillingReconciliationItemDto extends BillingAttemptStatusDto {
  @ApiProperty() providerOrderId!: string;
  @ApiProperty({ type: String, nullable: true }) resultCode!: string | null;
  @ApiProperty() intentId!: string;
  @ApiProperty() amountRial!: string;
  @ApiProperty() createdAt!: string;
}
export class BillingReconciliationPageDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: BillingReconciliationItemDto, isArray: true }) items!: BillingReconciliationItemDto[];
}
