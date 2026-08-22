import { ApiResponse } from '@nestjs/swagger';

import { ApiErrorResponseDto } from './api-error.dto';

export const ApiErrorResponse = (
  status: number,
  description: string,
): MethodDecorator & ClassDecorator =>
  ApiResponse({ status, description, type: ApiErrorResponseDto });
