import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SadadPaymentCredentialDto {
  @ApiProperty({ maxLength: 128, writeOnly: true, description: 'Sadad merchant identifier issued to the clinic.' }) @IsString() @IsNotEmpty() @MaxLength(128) merchantId!: string;
  @ApiProperty({ maxLength: 128, writeOnly: true, description: 'Sadad terminal identifier issued to the clinic.' }) @IsString() @IsNotEmpty() @MaxLength(128) terminalId!: string;
  @ApiProperty({ maxLength: 4096, writeOnly: true, description: 'Sadad Base64 TripleDES terminal key; encrypted at rest and never returned.' }) @IsString() @IsNotEmpty() @MaxLength(4096) terminalKey!: string;
}

export class CreatePaymentProviderRevisionDto {
  @ApiProperty({ type: SadadPaymentCredentialDto, description: 'Write-only Sadad credential set; values are encrypted and never returned.' }) @IsDefined() @ValidateNested() @Type(() => SadadPaymentCredentialDto) credential!: SadadPaymentCredentialDto;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
export class UpdatePaymentProviderConfigDto { @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean; @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean; }
export class PaymentProviderConfigDto { @ApiProperty({ type: String }) code!: string; @ApiProperty({ type: String }) displayName!: string; @ApiProperty() configured!: boolean; @ApiProperty() activationAvailable!: boolean; @ApiProperty() enabled!: boolean; @ApiProperty() isDefault!: boolean; @ApiProperty({ type: String }) providerUnit!: string; @ApiProperty() goLiveReady!: boolean; @ApiPropertyOptional({ type: Number, nullable: true }) activeRevisionNumber!: number | null; @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } }) capabilities!: Record<string, string>; @ApiPropertyOptional({ type: String, nullable: true }) updatedAt!: string | null; }
export class CreatePaymentAttemptDto { @ApiPropertyOptional({ maxLength: 240 }) @IsOptional() @IsString() @MaxLength(240) providerCode?: string; }
export class PaymentAttemptDto { @ApiProperty() id!: string; @ApiProperty({ type: String }) providerOrderId!: string; @ApiProperty() providerCode!: string; @ApiProperty() status!: string; @ApiProperty({ type: String }) commerceAmountToman!: string; @ApiPropertyOptional({ type: String, nullable: true }) providerAmount!: string | null; @ApiProperty() providerUnit!: string; @ApiPropertyOptional({ type: String, nullable: true }) redirectUrl!: string | null; }
