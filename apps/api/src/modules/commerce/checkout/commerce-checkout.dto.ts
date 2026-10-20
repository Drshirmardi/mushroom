import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const shippingMethods = ['PICKUP', 'COURIER'] as const;

export class CreateCommerceAddressDto {
  @ApiProperty({ maxLength: 100 }) @IsString() @MaxLength(100) label!: string;
  @ApiProperty({ maxLength: 160 }) @IsString() @MaxLength(160) recipientName!: string;
  @ApiProperty({ maxLength: 32 }) @IsString() @MaxLength(32) phone!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MaxLength(100) province!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MaxLength(100) city!: string;
  @ApiProperty({ maxLength: 500 }) @IsString() @MaxLength(500) line1!: string;
  @ApiPropertyOptional({ maxLength: 32 }) @IsOptional() @IsString() @MaxLength(32) postalCode?: string;
  @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @IsString() @MaxLength(500) line2?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateCommerceAddressDto {
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @MaxLength(100) label?: string;
  @ApiPropertyOptional({ maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) recipientName?: string;
  @ApiPropertyOptional({ maxLength: 32 }) @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @MaxLength(100) province?: string;
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @IsString() @MaxLength(500) line1?: string;
  @ApiPropertyOptional({ maxLength: 32, nullable: true }) @IsOptional() @IsString() @MaxLength(32) postalCode?: string | null;
  @ApiPropertyOptional({ maxLength: 500, nullable: true }) @IsOptional() @IsString() @MaxLength(500) line2?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class CheckoutCommerceOrderDto {
  @ApiProperty({ enum: shippingMethods }) @IsIn(shippingMethods) shippingMethod!: (typeof shippingMethods)[number];
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID('4') addressId?: string;
  @ApiPropertyOptional({ minLength: 3, maxLength: 40, description: 'Optional commerce discount code; the server canonicalizes and prices it.' }) @IsOptional() @IsString() @MaxLength(80) discountCode?: string;
}

export class PreviewCommerceDiscountDto {
  @ApiProperty({ minLength: 3, maxLength: 40 }) @IsString() @MaxLength(80) discountCode!: string;
}

export class CommerceDiscountPreviewDto {
  @ApiProperty() code!: string;
  @ApiProperty({ type: String }) subtotalAmountToman!: string;
  @ApiProperty({ type: String }) taxAmountToman!: string;
  @ApiProperty({ type: String }) discountAmountToman!: string;
}

export class UpdateCourierShippingRateDto {
  @ApiProperty({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER, description: 'Integer TOMAN.' }) @Type(() => Number) @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) amountToman!: number;
  @ApiProperty() @IsBoolean() isActive!: boolean;
}

export class CommerceAddressDto {
  @ApiProperty() id!: string; @ApiProperty() label!: string; @ApiProperty() recipientName!: string; @ApiProperty() phone!: string;
  @ApiProperty() province!: string; @ApiProperty() city!: string; @ApiPropertyOptional({ nullable: true }) postalCode!: string | null;
  @ApiProperty() line1!: string; @ApiPropertyOptional({ nullable: true }) line2!: string | null; @ApiProperty() isDefault!: boolean;
}

export class CommerceShippingOptionDto {
  @ApiProperty({ enum: shippingMethods }) method!: (typeof shippingMethods)[number];
  @ApiProperty({ type: String, description: 'Integer TOMAN.' }) amountToman!: string;
}

export class CommerceCourierShippingRateDto {
  @ApiProperty({ enum: ['COURIER'] }) method!: 'COURIER';
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Integer TOMAN when configured.' }) amountToman!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() isConfigured!: boolean;
}

export class CommerceOrderLineDto {
  @ApiProperty() skuCode!: string; @ApiProperty() productTitle!: string; @ApiProperty() quantity!: number;
  @ApiProperty({ type: String }) unitPriceToman!: string; @ApiProperty({ type: String }) unitTaxToman!: string;
  @ApiProperty({ type: String }) discountAmountToman!: string; @ApiProperty({ type: String }) lineTotalToman!: string;
}

export class CommerceOrderDto {
  @ApiPropertyOptional({ type: String, nullable: true }) paymentMethod?: string | null;
  @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ type: String }) orderNumber!: string; @ApiProperty() status!: string;
  @ApiProperty({ enum: shippingMethods }) shippingMethod!: (typeof shippingMethods)[number];
  @ApiPropertyOptional({ type: CommerceAddressDto, nullable: true }) shippingAddress!: CommerceAddressDto | null;
  @ApiProperty({ type: String }) subtotalAmountToman!: string; @ApiProperty({ type: String }) taxAmountToman!: string;
  @ApiProperty({ type: String }) discountAmountToman!: string; @ApiProperty({ type: String }) shippingAmountToman!: string;
  @ApiProperty({ type: String }) totalAmountToman!: string; @ApiProperty({ type: CommerceOrderLineDto, isArray: true }) lines!: CommerceOrderLineDto[];
  @ApiPropertyOptional({ type: String, nullable: true }) carrierName!: string | null; @ApiPropertyOptional({ type: String, nullable: true }) trackingCode!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uri' }) trackingUrl!: string | null; @ApiPropertyOptional({ type: String, nullable: true }) paymentStatus!: string | null;
  @ApiProperty({ type: String, isArray: true, description: 'Read-only refund lifecycle statuses for a verified order payment.' }) refundStatuses!: string[];
  @ApiProperty() createdAt!: string;
}

export class CommerceOrderPageDto {
  @ApiProperty({ type: CommerceOrderDto, isArray: true }) items!: CommerceOrderDto[];
}

export class PatientCommerceReceiptDto {
  @ApiPropertyOptional({ enum: ['GATEWAY', 'WALLET', 'FREE'] }) method?: string;
  @ApiProperty({ format: 'uuid' }) orderId!: string; @ApiProperty({ type: String }) orderNumber!: string;
  @ApiProperty({ type: String }) totalAmountToman!: string; @ApiProperty() status!: string; @ApiProperty() verifiedAt!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) providerReferenceId!: string | null; @ApiPropertyOptional({ type: String, nullable: true }) providerTraceNumber!: string | null;
  @ApiProperty({ type: CommerceOrderDto }) order!: CommerceOrderDto;
}
