import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PERMISSIONS, permissionsFor } from '../src/common/auth/authorization.policy';
import { PatientAppointmentsController } from '../src/modules/appointments/patient-appointments.controller';

const context = (handler: Function, roles: string[]): ExecutionContext => ({ getHandler: () => handler, getClass: () => PatientAppointmentsController, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);

describe('patient appointment create authorization', () => {
  it('grants create only to patients', () => {
    const guard = new AuthorizationGuard(new Reflector());
    expect(permissionsFor(['PATIENT'])).toContain(PERMISSIONS.APPOINTMENTS_CREATE_SELF);
    expect(guard.canActivate(context(PatientAppointmentsController.prototype.create, ['PATIENT']))).toBe(true);
    for (const role of ['ADMIN', 'DOCTOR', 'STAFF']) expect(() => guard.canActivate(context(PatientAppointmentsController.prototype.create, [role]))).toThrow(/Insufficient permissions/);
  });

  it('grants patient-only read and change operations', () => {
    const guard = new AuthorizationGuard(new Reflector());
    expect(permissionsFor(['PATIENT'])).toContain(PERMISSIONS.APPOINTMENTS_READ_SELF);
    expect(permissionsFor(['PATIENT'])).toContain(PERMISSIONS.APPOINTMENTS_CHANGE_SELF);
    for (const handler of [PatientAppointmentsController.prototype.list, PatientAppointmentsController.prototype.get, PatientAppointmentsController.prototype.cancel, PatientAppointmentsController.prototype.reschedule]) {
      expect(guard.canActivate(context(handler, ['PATIENT']))).toBe(true);
      for (const role of ['ADMIN', 'DOCTOR', 'STAFF']) expect(() => guard.canActivate(context(handler, [role]))).toThrow(/Insufficient permissions/);
    }
  });
});
