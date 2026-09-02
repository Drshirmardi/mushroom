import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PERMISSIONS, permissionsFor } from '../src/common/auth/authorization.policy';
import { AdminSchedulingController } from '../src/modules/scheduling/admin-scheduling.controller';

const contextFor = (handler: Function, roles: string[]): ExecutionContext => ({ getHandler: () => handler, getClass: () => AdminSchedulingController, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);

describe('Admin scheduling authorization contract', () => {
  const guard = new AuthorizationGuard(new Reflector());
  const handlers = [
    AdminSchedulingController.prototype.listRules, AdminSchedulingController.prototype.createRule, AdminSchedulingController.prototype.getRule, AdminSchedulingController.prototype.updateRule, AdminSchedulingController.prototype.deleteRule,
    AdminSchedulingController.prototype.listClosures, AdminSchedulingController.prototype.createClosure, AdminSchedulingController.prototype.getClosure, AdminSchedulingController.prototype.updateClosure, AdminSchedulingController.prototype.deleteClosure,
    AdminSchedulingController.prototype.listExceptions, AdminSchedulingController.prototype.createException, AdminSchedulingController.prototype.getException, AdminSchedulingController.prototype.updateException, AdminSchedulingController.prototype.deleteException,
  ];
  it('maps SCHEDULING_MANAGE only to ADMIN and protects every route', () => {
    expect(permissionsFor(['ADMIN'])).toContain(PERMISSIONS.SCHEDULING_MANAGE);
    for (const role of ['PATIENT', 'DOCTOR', 'STAFF']) expect(permissionsFor([role as 'PATIENT'])).not.toContain(PERMISSIONS.SCHEDULING_MANAGE);
    for (const handler of handlers) { expect(guard.canActivate(contextFor(handler, ['ADMIN']))).toBe(true); expect(() => guard.canActivate(contextFor(handler, ['PATIENT']))).toThrow(/Insufficient permissions/); }
  });
});
