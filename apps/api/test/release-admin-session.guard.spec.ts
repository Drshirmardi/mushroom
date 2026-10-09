import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '../src/common/auth/access-token.guard';
import { SKIP_ACTIVE_SESSION_CHECK_KEY } from '../src/common/auth/active-session.decorator';
import { ReleaseAdminSessionGuard } from '../src/common/auth/release-admin-session.guard';
import type { PrismaService } from '../src/database/prisma/prisma.service';

describe('ReleaseAdminSessionGuard', () => {
  const getAllAndOverride = vi.fn();
  const findFirst = vi.fn();
  const guard = new ReleaseAdminSessionGuard(
    { getAllAndOverride } as unknown as Reflector,
    { session: { findFirst } } as unknown as PrismaService,
  );

  beforeEach(() => {
    getAllAndOverride.mockReset().mockReturnValue(false);
    findFirst.mockReset();
  });

  const contextFor = (roles?: AuthenticatedRequest['auth']['roles']): ExecutionContext => {
    const request: Partial<AuthenticatedRequest> = roles
      ? {
          auth: {
            userId: '37694db4-23a5-4498-a49d-135fc98de279',
            sessionId: 'df846b14-c123-45bd-8efe-58220999e940',
            roles,
            tokenId: '62d6fd3b-306d-42bc-ae8f-df508178136a',
            issuedAt: 1_787_397_200,
            expiresAt: 1_787_397_800,
          },
        }
      : {};
    return {
      getHandler: () => 'handler',
      getClass: () => 'controller',
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  it.each(['PATIENT', 'DOCTOR', 'STAFF', 'ADMIN'] as const)(
    'admits a persisted active %s session',
    async (role) => {
      findFirst.mockResolvedValue({ id: 'df846b14-c123-45bd-8efe-58220999e940' });

      await expect(guard.canActivate(contextFor([role]))).resolves.toBe(true);
      expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          revokedAt: null,
          user: { status: 'ACTIVE' },
        }),
      }));
    },
  );

  it('allows an authenticated logout retry to reach its idempotent handler', async () => {
    getAllAndOverride.mockImplementation((key) =>
      key === SKIP_ACTIVE_SESSION_CHECK_KEY ? true : false,
    );

    await expect(guard.canActivate(contextFor(['PATIENT']))).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('admits only a persisted active session', async () => {
    findFirst.mockResolvedValue({ id: 'df846b14-c123-45bd-8efe-58220999e940' });

    await expect(guard.canActivate(contextFor(['ADMIN']))).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        revokedAt: null,
        user: { status: 'ACTIVE' },
      }),
    }));
  });

  it.each(['revoked', 'expired', 'disabled'])(
    'rejects a %s session before a controller can run',
    async () => {
      findFirst.mockResolvedValue(null);

      await expect(guard.canActivate(contextFor(['ADMIN']))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );
});
