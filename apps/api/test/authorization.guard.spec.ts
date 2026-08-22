import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '../src/common/auth/access-token.guard';
import {
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
} from '../src/common/auth/authorization.decorator';
import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import {
  PERMISSIONS,
  permissionsFor,
  type Permission,
  type RoleCode,
} from '../src/common/auth/authorization.policy';

describe('authorization policy', () => {
  it.each([
    ['PATIENT', false, false],
    ['DOCTOR', true, false],
    ['STAFF', true, false],
    ['ADMIN', true, true],
  ] as const)(
    'maps %s to the expected dashboard and identity capabilities',
    (role, dashboard, identityManagement) => {
      const permissions = permissionsFor([role]);

      expect(permissions.has(PERMISSIONS.ACCOUNT_READ_SELF)).toBe(true);
      expect(permissions.has(PERMISSIONS.ACCOUNT_UPDATE_SELF)).toBe(true);
      expect(permissions.has(PERMISSIONS.SESSION_READ_SELF)).toBe(true);
      expect(permissions.has(PERMISSIONS.SESSION_REVOKE_SELF)).toBe(true);
      expect(permissions.has(PERMISSIONS.DASHBOARD_ACCESS)).toBe(dashboard);
      expect(permissions.has(PERMISSIONS.IDENTITY_USERS_MANAGE)).toBe(
        identityManagement,
      );
      expect(permissions.has(PERMISSIONS.IDENTITY_ROLES_MANAGE)).toBe(
        identityManagement,
      );
    },
  );

  it('combines permissions for a user with multiple roles', () => {
    expect(permissionsFor(['PATIENT', 'STAFF'])).toContain(
      PERMISSIONS.DASHBOARD_ACCESS,
    );
  });

  it('grants nothing for an unexpected runtime role', () => {
    expect(permissionsFor(['SUPER_ADMIN' as RoleCode])).toEqual(new Set());
  });
});

describe('AuthorizationGuard', () => {
  const getAllAndOverride = vi.fn();
  const getAllAndMerge = vi.fn();
  const guard = new AuthorizationGuard({
    getAllAndOverride,
    getAllAndMerge,
  } as unknown as Reflector);

  beforeEach(() => {
    getAllAndOverride.mockReset().mockReturnValue(false);
    getAllAndMerge.mockReset().mockReturnValue([]);
  });

  const contextFor = (roles?: RoleCode[]): ExecutionContext => {
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

  const require = (roles: RoleCode[], permissions: Permission[]) => {
    getAllAndMerge.mockImplementation((key: string) => {
      if (key === REQUIRED_ROLES_KEY) return roles;
      if (key === REQUIRED_PERMISSIONS_KEY) return permissions;
      return [];
    });
  };

  it('bypasses authorization metadata on public routes', () => {
    getAllAndOverride.mockReturnValue(true);
    require(['ADMIN'], [PERMISSIONS.IDENTITY_USERS_MANAGE]);

    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it('allows authenticated routes without an authorization requirement', () => {
    expect(guard.canActivate(contextFor(['PATIENT']))).toBe(true);
  });

  it('requires an authenticated principal when metadata is present', () => {
    require([], [PERMISSIONS.ACCOUNT_READ_SELF]);

    expect(() => guard.canActivate(contextFor())).toThrow(UnauthorizedException);
  });

  it.each([
    ['PATIENT', false],
    ['DOCTOR', true],
    ['STAFF', true],
    ['ADMIN', true],
  ] as const)('enforces the dashboard permission for %s', (role, allowed) => {
    require([], [PERMISSIONS.DASHBOARD_ACCESS]);

    if (allowed) {
      expect(guard.canActivate(contextFor([role]))).toBe(true);
    } else {
      expect(() => guard.canActivate(contextFor([role]))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('treats required roles as any-of and permissions as all-of', () => {
    require(
      ['STAFF', 'ADMIN'],
      [PERMISSIONS.DASHBOARD_ACCESS, PERMISSIONS.IDENTITY_USERS_MANAGE],
    );

    expect(guard.canActivate(contextFor(['ADMIN']))).toBe(true);
    expect(() => guard.canActivate(contextFor(['STAFF']))).toThrow(
      ForbiddenException,
    );
  });

  it('returns one stable denial without exposing policy details', () => {
    require(['ADMIN'], [PERMISSIONS.IDENTITY_ROLES_MANAGE]);

    expect(() => guard.canActivate(contextFor(['PATIENT']))).toThrowError(
      expect.objectContaining({
        response: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions.',
          details: {},
        },
      }),
    );
  });
});
