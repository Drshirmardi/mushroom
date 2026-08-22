import { HttpStatus } from '@nestjs/common';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_PHONE_NUMBER'
  | 'PHONE_ALREADY_REGISTERED'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_UNSUPPORTED_CHARACTERS'
  | 'PASSWORD_BLOCKED'
  | 'INVALID_CREDENTIALS'
  | 'LOGIN_RATE_LIMITED'
  | 'INVALID_REFRESH_TOKEN'
  | 'ORIGIN_NOT_ALLOWED'
  | 'HTTP_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  requestId: string;
  details: Record<string, unknown>;
}

const apiErrorCodes = new Set<ApiErrorCode>([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'UNPROCESSABLE_ENTITY',
  'TOO_MANY_REQUESTS',
  'SERVICE_UNAVAILABLE',
  'INVALID_PHONE_NUMBER',
  'PHONE_ALREADY_REGISTERED',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'PASSWORD_UNSUPPORTED_CHARACTERS',
  'PASSWORD_BLOCKED',
  'INVALID_CREDENTIALS',
  'LOGIN_RATE_LIMITED',
  'INVALID_REFRESH_TOKEN',
  'ORIGIN_NOT_ALLOWED',
  'HTTP_ERROR',
  'INTERNAL_SERVER_ERROR',
]);

export const isApiErrorCode = (value: unknown): value is ApiErrorCode =>
  typeof value === 'string' && apiErrorCodes.has(value as ApiErrorCode);

const errorCodeByStatus: Partial<Record<HttpStatus, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'UNSUPPORTED_MEDIA_TYPE',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

export const getApiErrorCode = (status: HttpStatus): ApiErrorCode =>
  errorCodeByStatus[status] ??
  (status >= HttpStatus.INTERNAL_SERVER_ERROR
    ? 'INTERNAL_SERVER_ERROR'
    : 'HTTP_ERROR');

export const getDefaultErrorMessage = (code: ApiErrorCode): string =>
  code === 'INTERNAL_SERVER_ERROR' ? 'Internal server error' : 'Request failed';
