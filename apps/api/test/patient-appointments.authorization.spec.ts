import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PERMISSIONS, permissionsFor } from '../src/common/auth/authorization.policy';
import { PatientAppointmentsController } from '../src/modules/appointments/patient-appointments.controller';

const context = (roles: string[]): ExecutionContext => ({ getHandler: () => PatientAppointmentsController.prototype.create, getClass: () => PatientAppointmentsController, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);

describe('patient appointment create authorization', () => {
  it('grants create only to patients', () => {
    const guard = new AuthorizationGuard(new Reflector());
    expect(permissionsFor(['PATIENT'])).toContain(PERMISSIONS.APPOINTMENTS_CREATE_SELF);
    expect(guard.canActivate(context(['PATIENT']))).toBe(true);
    for (const role of ['ADMIN', 'DOCTOR', 'STAFF']) expect(() => guard.canActivate(context([role]))).toThrow(/Insufficient permissions/);
  });
});
