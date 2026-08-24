import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import type { AuthenticatedRequest } from '../src/common/auth/access-token.guard';
import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import type { RoleCode } from '../src/common/auth/authorization.policy';
import { IntakeController } from '../src/modules/patients/intake/presentation/http/intake.controller';

const contextFor = (roles: RoleCode[]): ExecutionContext => ({
  getHandler: () => IntakeController.prototype.get,
  getClass: () => IntakeController,
  switchToHttp: () => ({
    getRequest: () => ({
      auth: {
        userId: '37694db4-23a5-4498-a49d-135fc98de279',
        sessionId: 'df846b14-c123-45bd-8efe-58220999e940',
        roles,
        tokenId: '62d6fd3b-306d-42bc-ae8f-df508178136a',
        issuedAt: 1_787_397_200,
        expiresAt: 1_787_397_800,
      },
    } satisfies Partial<AuthenticatedRequest>),
  }),
}) as unknown as ExecutionContext;

describe('intake and consent self-route authorization', () => {
  const guard = new AuthorizationGuard(new Reflector());

  it('rejects ADMIN despite inherited self-service intake permissions', () => {
    expect(() => guard.canActivate(contextFor(['ADMIN']))).toThrow(ForbiddenException);
  });

  it('allows the PATIENT role on self intake endpoints', () => {
    expect(guard.canActivate(contextFor(['PATIENT']))).toBe(true);
  });
});
