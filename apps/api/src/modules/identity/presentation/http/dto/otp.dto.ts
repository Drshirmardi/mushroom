import { IsBoolean, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOtpChallengeDto {
  @ApiProperty() @IsString() @MaxLength(32) phone!: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() remember?: boolean;
}
export class VerifyOtpChallengeDto {
  @ApiProperty() @IsString() @Length(4, 8) @Matches(/^\d+$/u) code!: string;
}
export class OtpChallengeResponseDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() challengeId!: string;
  @ApiProperty() expiresAt!: string;
  @ApiProperty() resendAvailableAt!: string;
  @ApiProperty() destinationMasked!: string;
}
