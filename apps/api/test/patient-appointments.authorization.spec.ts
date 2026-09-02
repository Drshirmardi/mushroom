import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PERMISSIONS, permissionsFor } from '../src/common/auth/authorization.policy';
import { PatientAppointmentsController } from '../src/modules/appointments/patient-appointments.controller';
import { AdminAppointmentsController } from '../src/modules/appointments/admin-appointments.controller';

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
    for (const handler of [PatientAppointmentsController.prototype.list, PatientAppointmentsController.prototype.get, PatientAppointmentsController.prototype.history, PatientAppointmentsController.prototype.cancel, PatientAppointmentsController.prototype.reschedule]) {
      expect(guard.canActivate(context(handler, ['PATIENT']))).toBe(true);
      for (const role of ['ADMIN', 'DOCTOR', 'STAFF']) expect(() => guard.canActivate(context(handler, [role]))).toThrow(/Insufficient permissions/);
    }
  });

  it('grants clinic appointment operations only to administrators', () => {
    const guard = new AuthorizationGuard(new Reflector());
    const adminContext = (handler: Function, roles: string[]): ExecutionContext => ({ getHandler: () => handler, getClass: () => AdminAppointmentsController, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);
    expect(permissionsFor(['ADMIN'])).toContain(PERMISSIONS.APPOINTMENTS_MANAGE);
    for (const handler of [AdminAppointmentsController.prototype.create, AdminAppointmentsController.prototype.list, AdminAppointmentsController.prototype.activities, AdminAppointmentsController.prototype.queueList, AdminAppointmentsController.prototype.dashboardSummary, AdminAppointmentsController.prototype.history, AdminAppointmentsController.prototype.confirm, AdminAppointmentsController.prototype.cancel, AdminAppointmentsController.prototype.reschedule, AdminAppointmentsController.prototype.checkIn, AdminAppointmentsController.prototype.queue, AdminAppointmentsController.prototype.start, AdminAppointmentsController.prototype.complete, AdminAppointmentsController.prototype.noShow, AdminAppointmentsController.prototype.callNext]) {
      expect(guard.canActivate(adminContext(handler, ['ADMIN']))).toBe(true);
      for (const role of ['PATIENT', 'DOCTOR', 'STAFF']) expect(() => guard.canActivate(adminContext(handler, [role]))).toThrow(/Insufficient permissions/);
    }
  });
});
