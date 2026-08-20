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
    const errorCode = getApiErrorCode(status);
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const exceptionMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' &&
            exceptionResponse !== null &&
            'message' in exceptionResponse
          ? exceptionResponse.message
          : undefined;
    const body: ApiErrorResponse = {
      code: errorCode,
      message:
        typeof exceptionMessage === 'string'
          ? exceptionMessage
          : getDefaultErrorMessage(errorCode),
      requestId: request.id,
      details: Array.isArray(exceptionMessage)
        ? { messages: exceptionMessage }
        : {},
    };

    response.header('x-request-id', request.id).status(status).send(body);
  }
}
