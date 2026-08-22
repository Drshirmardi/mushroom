import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from '../src/common/auth/access-token.guard';
import type {
  AccessTokenPrincipal,
  AccessTokenService,
} from '../src/common/auth/access-token.service';

describe('AccessTokenGuard', () => {
  const principal: AccessTokenPrincipal = {
    userId: '37694db4-23a5-4498-a49d-135fc98de279',
    sessionId: 'df846b14-c123-45bd-8efe-58220999e940',
    roles: ['PATIENT'],
    tokenId: '62d6fd3b-306d-42bc-ae8f-df508178136a',
    issuedAt: 1_787_397_200,
    expiresAt: 1_787_397_800,
  };
  const getAllAndOverride = vi.fn();
  const verify = vi.fn();
  const guard = new AccessTokenGuard(
    { getAllAndOverride } as unknown as Reflector,
    { verify } as unknown as AccessTokenService,
  );

  beforeEach(() => {
    getAllAndOverride.mockReset();
    verify.mockReset();
  });

  const contextFor = (
    authorization?: string,
  ): { context: ExecutionContext; request: Partial<AuthenticatedRequest> } => {
    const request = { headers: { authorization } };
    const context = {
      getHandler: () => 'handler',
      getClass: () => 'controller',
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('bypasses token parsing only for explicitly public handlers', async () => {
    getAllAndOverride.mockReturnValue(true);
    const { context } = contextFor();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('verifies a bearer token and attaches the validated principal', async () => {
    getAllAndOverride.mockReturnValue(false);
    verify.mockResolvedValue(principal);
    const { context, request } = contextFor('Bearer compact.jwt.token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith('compact.jwt.token');
    expect(request.auth).toEqual(principal);
  });

  it.each([
    undefined,
    '',
    'Basic credentials',
    'Bearer',
    'Bearer first second',
    'Bearer first,second',
  ])('rejects a missing or malformed Authorization header', async (header) => {
    getAllAndOverride.mockReturnValue(false);
    const { context } = contextFor(header);

    const result = guard.canActivate(context);
    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toMatchObject({
      response: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
        details: {},
      },
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it('maps every token verification failure to one public error', async () => {
    getAllAndOverride.mockReturnValue(false);
    verify.mockRejectedValue(new Error('signature detail'));
    const { context } = contextFor('bearer compact.jwt.token');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
        details: {},
      },
    });
  });
});
