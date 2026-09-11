import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentProviderRevisionDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' }, description: 'Write-only secret values; never returned.' }) @IsOptional() @IsObject() credential?: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
export class UpdatePaymentProviderConfigDto { @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean; @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean; }
export class PaymentProviderConfigDto { @ApiProperty({ type: String }) code!: string; @ApiProperty({ type: String }) displayName!: string; @ApiProperty() configured!: boolean; @ApiProperty() enabled!: boolean; @ApiProperty() isDefault!: boolean; @ApiProperty({ type: String }) providerUnit!: string; @ApiProperty() goLiveReady!: boolean; @ApiPropertyOptional({ type: Number, nullable: true }) activeRevisionNumber!: number | null; @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } }) capabilities!: Record<string, string>; @ApiPropertyOptional({ type: String, nullable: true }) updatedAt!: string | null; }
export class CreatePaymentAttemptDto { @ApiPropertyOptional({ maxLength: 240 }) @IsOptional() @IsString() @MaxLength(240) providerCode?: string; }
export class PaymentAttemptDto { @ApiProperty() id!: string; @ApiProperty({ type: String }) providerOrderId!: string; @ApiProperty() providerCode!: string; @ApiProperty() status!: string; @ApiProperty({ type: String }) commerceAmountToman!: string; @ApiPropertyOptional({ type: String, nullable: true }) providerAmount!: string | null; @ApiProperty() providerUnit!: string; }
