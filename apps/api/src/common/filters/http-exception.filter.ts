import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  ApiErrorResponse,
  getApiErrorCode,
  getDefaultErrorMessage,
  isApiErrorCode,
} from '../errors/api-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<{ id: string }>();
    const response = http.getResponse<FastifyReply>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const exceptionBody =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse as Record<string, unknown>
        : undefined;
    const errorCode = isApiErrorCode(exceptionBody?.code)
      ? exceptionBody.code
      : getApiErrorCode(status);
    const exceptionMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionBody && 'message' in exceptionBody
          ? exceptionBody.message
          : undefined;
    const body: ApiErrorResponse = {
      code: errorCode,
      message:
        typeof exceptionMessage === 'string'
          ? exceptionMessage
          : getDefaultErrorMessage(errorCode),
      requestId: request.id,
      details:
        exceptionBody?.details
        && typeof exceptionBody.details === 'object'
        && !Array.isArray(exceptionBody.details)
          ? exceptionBody.details as Record<string, unknown>
          : Array.isArray(exceptionMessage)
            ? { messages: exceptionMessage }
            : {},
    };

    response.header('x-request-id', request.id).status(status).send(body);
  }
}
