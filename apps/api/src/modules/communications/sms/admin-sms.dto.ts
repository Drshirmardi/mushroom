import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSmsProviderRevisionDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } }) @IsObject() config!: Record<string, string>;
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' }, writeOnly: true }) @IsOptional() @IsObject() credential?: Record<string, string>;
}
export class UpdateSmsProviderStateDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
export class TestSmsDto { @ApiProperty() @IsString() @MaxLength(32) phone!: string; }
export class UpdateOtpPolicyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(4) @Max(8) codeLength?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(60) @Max(600) expiresInSeconds?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(30) @Max(600) resendCooldownSeconds?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(3) @Max(10) maxVerifyAttempts?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10) phoneRequestLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(300) @Max(3600) requestWindowSeconds?: number;
}
export class SmsAttemptsQueryDto {
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}
export class SmsProviderFieldDto { @ApiProperty() key!: string; @ApiProperty() label!: string; @ApiProperty() help!: string; @ApiProperty() type!: string; @ApiProperty() required!: boolean; @ApiProperty() secret!: boolean; @ApiPropertyOptional() defaultValue?: string; @ApiPropertyOptional() placeholder?: string; @ApiProperty() order!: number; @ApiProperty() maxLength!: number; }
export class SmsProviderConfigDto { @ApiProperty() code!: string; @ApiProperty() displayName!: string; @ApiProperty() description!: string; @ApiProperty({ type: [String] }) capabilities!: string[]; @ApiProperty({ type: [SmsProviderFieldDto] }) fields!: SmsProviderFieldDto[]; @ApiProperty() runtimeAvailable!: boolean; @ApiProperty() enabled!: boolean; @ApiProperty() isDefault!: boolean; @ApiProperty() credentialConfigured!: boolean; @ApiPropertyOptional({ nullable: true }) activeRevisionNumber!: number | null; @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } }) config!: Record<string, string>; @ApiPropertyOptional({ nullable: true }) updatedAt!: string | null; }
export class OtpPolicyDto { @ApiProperty() id!: string; @ApiProperty() enabled!: boolean; @ApiProperty() codeLength!: number; @ApiProperty() expiresInSeconds!: number; @ApiProperty() resendCooldownSeconds!: number; @ApiProperty() maxVerifyAttempts!: number; @ApiProperty() phoneRequestLimit!: number; @ApiProperty() requestWindowSeconds!: number; @ApiProperty() updatedAt!: string; }
export class SmsDeliveryAttemptDto { @ApiProperty() id!: string; @ApiProperty() recipientMasked!: string; @ApiProperty() status!: string; @ApiPropertyOptional({ nullable: true }) providerReference!: string | null; @ApiPropertyOptional({ nullable: true }) errorCategory!: string | null; @ApiProperty() isTest!: boolean; @ApiProperty() createdAt!: string; @ApiPropertyOptional({ nullable: true }) resolvedAt!: string | null; @ApiPropertyOptional({ nullable: true }) providerCode!: string | null; }
