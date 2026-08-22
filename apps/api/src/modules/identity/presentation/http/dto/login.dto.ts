import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: '09123456789', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  phone!: string;

  @ApiProperty({ writeOnly: true, maxLength: 128 })
  @IsString()
  password!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}

export class AuthenticatedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '+989123456789' })
  phone!: string;

  @ApiProperty({ example: ['PATIENT'], isArray: true })
  roles!: string[];
}

export class AuthenticationResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 600 })
  expiresIn!: number;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}
