import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { AdminBookingPolicyController } from '../src/modules/assessments/admin/admin-booking-policy.controller';
import { AdminBookingPolicyService } from '../src/modules/assessments/admin/admin-booking-policy.service';

const clinicId = '00000000-0000-4000-8000-000000000001';
const contextFor = (handler: Function, roles: string[]): ExecutionContext => ({ getHandler: () => handler, getClass: () => AdminBookingPolicyController, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);
const auditContext = { actorUserId: '00000000-0000-4000-8000-000000000002', actorSessionId: '00000000-0000-4000-8000-000000000003', requestId: 'request', ipAddress: '127.0.0.1' };

describe('Admin booking assessment policy contract', () => {
  it('allows only ADMIN to read and update the clinic policy', () => {
    const guard = new AuthorizationGuard(new Reflector());
    for (const handler of [AdminBookingPolicyController.prototype.get, AdminBookingPolicyController.prototype.update]) {
      expect(guard.canActivate(contextFor(handler, ['ADMIN']))).toBe(true);
      expect(() => guard.canActivate(contextFor(handler, ['PATIENT']))).toThrow(/Insufficient permissions/);
    }
  });

  it('returns safe disabled defaults when no policy has been configured', async () => {
    const service = new AdminBookingPolicyService({ clinic: { findFirst: async () => ({ id: clinicId }) }, bookingEligibilityPolicy: { findUnique: async () => null } } as never);
    await expect(service.get()).resolves.toEqual({ assessmentRequirement: 'NOT_REQUIRED', requiredAssessmentVersionId: null, validityDays: null, requireLatestPublishedVersion: false, updatedAt: null });
  });

  it('rejects a required policy unless the selected version is published by the same clinic', async () => {
    let writes = 0;
    const service = new AdminBookingPolicyService({ clinic: { findFirst: async () => ({ id: clinicId }) }, assessmentVersion: { findFirst: async () => null }, bookingEligibilityPolicy: { upsert: async () => { writes += 1; } } } as never);
    await expect(service.update({ assessmentRequirement: 'REQUIRED', requiredAssessmentVersionId: '00000000-0000-4000-8000-000000000004' }, auditContext)).rejects.toMatchObject({ response: { code: 'REQUIRED_ASSESSMENT_VERSION_INVALID' } });
    expect(writes).toBe(0);
  });

  it('clears the required version and resets optional flags when disabled', async () => {
    let mutation: Record<string, unknown> | undefined;
    const policy = { id: '00000000-0000-4000-8000-000000000005', assessmentRequirement: 'NOT_REQUIRED', requiredAssessmentVersionId: null, validityDays: null, requireLatestPublishedVersion: false, updatedAt: new Date() };
    const service = new AdminBookingPolicyService({ clinic: { findFirst: async () => ({ id: clinicId }) }, bookingEligibilityPolicy: { upsert: async (value: Record<string, unknown>) => { mutation = value; return policy; } }, auditEvent: { create: async () => undefined } } as never);
    await expect(service.update({ assessmentRequirement: 'NOT_REQUIRED', validityDays: 14, requireLatestPublishedVersion: true }, auditContext)).resolves.toMatchObject({ assessmentRequirement: policy.assessmentRequirement, requiredAssessmentVersionId: null, validityDays: null, requireLatestPublishedVersion: false });
    expect(mutation).toMatchObject({ update: { requiredAssessmentVersionId: null, validityDays: null, requireLatestPublishedVersion: false } });
  });
});
