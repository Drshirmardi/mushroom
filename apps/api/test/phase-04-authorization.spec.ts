import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { AdminDirectoryController } from '../src/modules/directory/admin-directory.controller';
import { PatientDirectoryController } from '../src/modules/directory/patient-directory.controller';
import { AdminSchedulingController } from '../src/modules/scheduling/admin-scheduling.controller';
import { PatientAvailabilityController } from '../src/modules/scheduling/patient-availability.controller';

const context = (handler: Function, target: Function, roles: string[]): ExecutionContext => ({ getHandler: () => handler, getClass: () => target, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);
const protectedAdmin = [AdminDirectoryController.prototype.createDoctor, AdminDirectoryController.prototype.updateDoctorService, AdminSchedulingController.prototype.createRule, AdminSchedulingController.prototype.updateClosure, AdminSchedulingController.prototype.deleteException];
const protectedPatient = [PatientDirectoryController.prototype.listDoctors, PatientDirectoryController.prototype.getDoctor, PatientDirectoryController.prototype.listServices, PatientAvailabilityController.prototype.get];

describe('Phase 04 authorization matrix', () => {
  const guard = new AuthorizationGuard(new Reflector());
  it('permits only admins to mutate directory and scheduling configuration', () => { for (const handler of protectedAdmin) { expect(guard.canActivate(context(handler, handler === AdminDirectoryController.prototype.createDoctor || handler === AdminDirectoryController.prototype.updateDoctorService ? AdminDirectoryController : AdminSchedulingController, ['ADMIN']))).toBe(true); for (const role of ['PATIENT', 'DOCTOR', 'STAFF']) expect(() => guard.canActivate(context(handler, handler === AdminDirectoryController.prototype.createDoctor || handler === AdminDirectoryController.prototype.updateDoctorService ? AdminDirectoryController : AdminSchedulingController, [role]))).toThrow(/Insufficient permissions/); } });
  it('permits only patients to read directory and availability', () => { for (const handler of protectedPatient) { const target = handler === PatientAvailabilityController.prototype.get ? PatientAvailabilityController : PatientDirectoryController; expect(guard.canActivate(context(handler, target, ['PATIENT']))).toBe(true); for (const role of ['ADMIN', 'DOCTOR', 'STAFF']) expect(() => guard.canActivate(context(handler, target, [role]))).toThrow(/Insufficient permissions/); } });
});
