import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PERMISSIONS, permissionsFor } from '../src/common/auth/authorization.policy';
import { PatientDirectoryController } from '../src/modules/directory/patient-directory.controller';
import { PatientAvailabilityController } from '../src/modules/scheduling/patient-availability.controller';

const contextFor = (handler: Function, controller: Function, roles: string[]): ExecutionContext => ({ getHandler: () => handler, getClass: () => controller, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);

describe('patient directory and availability authorization contract', () => {
  const guard = new AuthorizationGuard(new Reflector());
  it('grants patient-only directory and availability reads', () => {
    expect(permissionsFor(['PATIENT'])).toContain(PERMISSIONS.DIRECTORY_READ_SELF);
    expect(permissionsFor(['PATIENT'])).toContain(PERMISSIONS.AVAILABILITY_READ_SELF);
    for (const [handler, controller] of [[PatientDirectoryController.prototype.listDoctors, PatientDirectoryController], [PatientDirectoryController.prototype.getDoctor, PatientDirectoryController], [PatientDirectoryController.prototype.listServices, PatientDirectoryController], [PatientAvailabilityController.prototype.get, PatientAvailabilityController]] as const) {
      expect(guard.canActivate(contextFor(handler, controller, ['PATIENT']))).toBe(true);
      expect(() => guard.canActivate(contextFor(handler, controller, ['ADMIN']))).toThrow(/Insufficient permissions/);
      expect(() => guard.canActivate(contextFor(handler, controller, ['DOCTOR']))).toThrow(/Insufficient permissions/);
    }
  });
});
