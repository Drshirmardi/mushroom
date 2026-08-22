import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

import { ROLE_CODES } from '../../../../../common/auth/authorization.policy';

export class CurrentAccountResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '+989123456789' })
  phone!: string;

  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'], example: 'ACTIVE' })
  status!: 'ACTIVE' | 'DISABLED';

  @ApiProperty({ enum: ROLE_CODES, example: ['PATIENT'], isArray: true })
  roles!: string[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  passwordChangedAt!: Date;
}

export class UpdateCurrentAccountDto {
  @ApiProperty({ example: 'correct horse battery staple', writeOnly: true })
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: '09123456789', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  phone!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ writeOnly: true, maxLength: 128 })
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ writeOnly: true, maxLength: 128 })
  @IsString()
  @MaxLength(128)
  newPassword!: string;
}
