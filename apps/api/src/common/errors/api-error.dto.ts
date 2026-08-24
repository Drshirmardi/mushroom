import { ApiProperty } from '@nestjs/swagger';

import { API_ERROR_CODES, type ApiErrorCode } from './api-error';

export class ApiErrorResponseDto {
  @ApiProperty({ enum: API_ERROR_CODES, example: 'UNAUTHORIZED' })
  code!: ApiErrorCode;

  @ApiProperty({ example: 'Request failed' })
  message!: string;

  @ApiProperty({ example: '0d43e245-9b4f-48c6-b6d8-88c472d87890' })
  requestId!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  details!: Record<string, unknown>;
}
