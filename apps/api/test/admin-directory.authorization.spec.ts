import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PERMISSIONS, permissionsFor } from '../src/common/auth/authorization.policy';
import { AdminDirectoryController } from '../src/modules/directory/admin-directory.controller';

const contextFor = (handler: Function, roles: string[]): ExecutionContext => ({
  getHandler: () => handler,
  getClass: () => AdminDirectoryController,
  switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }),
} as unknown as ExecutionContext);

describe('Admin directory authorization contract', () => {
  const guard = new AuthorizationGuard(new Reflector());
  const handlers = [
    AdminDirectoryController.prototype.getClinic,
    AdminDirectoryController.prototype.updateClinic,
    AdminDirectoryController.prototype.listDoctors,
    AdminDirectoryController.prototype.createDoctor,
    AdminDirectoryController.prototype.getDoctor,
    AdminDirectoryController.prototype.updateDoctor,
    AdminDirectoryController.prototype.deleteDoctor,
    AdminDirectoryController.prototype.listSpecialties,
    AdminDirectoryController.prototype.createSpecialty,
    AdminDirectoryController.prototype.getSpecialty,
    AdminDirectoryController.prototype.updateSpecialty,
    AdminDirectoryController.prototype.deleteSpecialty,
    AdminDirectoryController.prototype.listServices,
    AdminDirectoryController.prototype.createService,
    AdminDirectoryController.prototype.getService,
    AdminDirectoryController.prototype.updateService,
    AdminDirectoryController.prototype.deleteService,
    AdminDirectoryController.prototype.listDoctorServices,
    AdminDirectoryController.prototype.createDoctorService,
    AdminDirectoryController.prototype.getDoctorService,
    AdminDirectoryController.prototype.updateDoctorService,
    AdminDirectoryController.prototype.deleteDoctorService,
  ];

  it('maps DIRECTORY_MANAGE only to ADMIN and protects every route', () => {
    expect(permissionsFor(['ADMIN'])).toContain(PERMISSIONS.DIRECTORY_MANAGE);
    for (const role of ['PATIENT', 'DOCTOR', 'STAFF']) {
      expect(permissionsFor([role as 'PATIENT'])).not.toContain(PERMISSIONS.DIRECTORY_MANAGE);
    }
    for (const handler of handlers) {
      expect(guard.canActivate(contextFor(handler, ['ADMIN']))).toBe(true);
      expect(() => guard.canActivate(contextFor(handler, ['PATIENT']))).toThrow(/Insufficient permissions/);
    }
  });
});
