import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

import { ROLE_CODES } from '../../../../../common/auth/authorization.policy';

export class RegisterRequestDto {
  @ApiProperty({ example: '09123456789', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  phone!: string;

  @ApiProperty({
    example: 'correct horse battery staple',
    minLength: 15,
    maxLength: 128,
    writeOnly: true,
  })
  @IsString()
  password!: string;
}

export class RegisterResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '+989123456789' })
  phone!: string;

  @ApiProperty({ enum: ROLE_CODES, example: ['PATIENT'], isArray: true })
  roles!: string[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
