import { ArgumentsHost, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const runFilter = (exception: unknown) => {
  const send = vi.fn();
  const reply = {
    header: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    send,
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: 'test-request' }),
      getResponse: () => reply,
    }),
  } as unknown as ArgumentsHost;

  new HttpExceptionFilter().catch(exception, host);

  return { reply, send };
};

describe('HTTP exception filter stable error codes', () => {
  it('preserves a registered domain code and its response details', () => {
    const { reply, send } = runFilter(new UnauthorizedException({
      code: 'OTP_INVALID',
      message: 'OTP challenge or code is invalid.',
      details: { challengeId: 'challenge-1' },
    }));

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(send).toHaveBeenCalledWith({
      code: 'OTP_INVALID',
      message: 'OTP challenge or code is invalid.',
      requestId: 'test-request',
      details: { challengeId: 'challenge-1' },
    });
  });

  it('maps an unregistered code to the HTTP status fallback', () => {
    const { reply, send } = runFilter(new UnauthorizedException({
      code: 'SOME_UNKNOWN',
      message: 'Unknown error code.',
      details: {},
    }));

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(send).toHaveBeenCalledWith({
      code: 'UNAUTHORIZED',
      message: 'Unknown error code.',
      requestId: 'test-request',
      details: {},
    });
  });
});
