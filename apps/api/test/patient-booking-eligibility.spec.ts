import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AuthorizationGuard } from '../src/common/auth/authorization.guard';
import { PatientBookingEligibilityController } from '../src/modules/assessments/patient/patient-booking-eligibility.controller';
import { PatientBookingEligibilityService } from '../src/modules/assessments/patient/patient-booking-eligibility.service';

const contextFor = (roles: string[]): ExecutionContext => ({ getHandler: () => PatientBookingEligibilityController.prototype.get, getClass: () => PatientBookingEligibilityController, switchToHttp: () => ({ getRequest: () => ({ auth: { roles } }) }) } as unknown as ExecutionContext);
const completeProfile = { getOnboardingStatus: async () => ({ state: 'COMPLETE' }) } as never;
const requiredVersion = { id: 'version', assessmentKey: 'MAIN', locale: 'fa-IR' };

describe('patient booking eligibility', () => {
  it('blocks incomplete onboarding before any assessment lookup', async () => { const service = new PatientBookingEligibilityService({ patientProfile: { findUnique: () => { throw new Error('assessment data must not be read'); } } } as never, { getOnboardingStatus: async () => ({ state: 'IN_PROGRESS' }) } as never); await expect(service.get('user')).resolves.toEqual({ eligible: false, reason: 'PROFILE_INCOMPLETE', nextAction: 'COMPLETE_ONBOARDING' }); });
  it('allows a complete patient when the policy is disabled without reading submissions', async () => { const service = new PatientBookingEligibilityService({ patientProfile: { findUnique: async () => ({ id: 'patient', clinicId: 'clinic' }) }, bookingEligibilityPolicy: { findUnique: async () => ({ assessmentRequirement: 'NOT_REQUIRED' }) }, patientAssessmentSubmission: { findFirst: () => { throw new Error('score/submission must not be read'); } } } as never, { getOnboardingStatus: async () => ({ state: 'COMPLETE' }) } as never); await expect(service.get('user')).resolves.toEqual({ eligible: true, reason: 'ELIGIBLE', nextAction: null }); });
  it('returns a stable expired blocker without reading score', async () => { const service = new PatientBookingEligibilityService({ patientProfile: { findUnique: async () => ({ id: 'patient', clinicId: 'clinic' }) }, bookingEligibilityPolicy: { findUnique: async () => ({ assessmentRequirement: 'REQUIRED', requiredAssessmentVersionId: 'version', validityDays: 1, requireLatestPublishedVersion: false }) }, assessmentVersion: { findUnique: async () => ({ id: 'version', assessmentKey: 'MAIN', locale: 'fa-IR' }) }, patientAssessmentSubmission: { findFirst: async () => ({ completedAt: new Date(0), score: 100 }) } } as never, { getOnboardingStatus: async () => ({ state: 'COMPLETE' }) } as never); await expect(service.get('user')).resolves.toEqual({ eligible: false, reason: 'ASSESSMENT_EXPIRED', nextAction: 'RETAKE_ASSESSMENT' }); });

  it('requires a valid completion of the policy version without considering score', async () => {
    let query: Record<string, unknown> | undefined;
    const service = new PatientBookingEligibilityService({
      patientProfile: { findUnique: async () => ({ id: 'patient', clinicId: 'clinic' }) },
      bookingEligibilityPolicy: { findUnique: async () => ({ assessmentRequirement: 'REQUIRED', requiredAssessmentVersionId: 'version', validityDays: null, requireLatestPublishedVersion: false }) },
      assessmentVersion: { findUnique: async () => requiredVersion },
      patientAssessmentSubmission: { findFirst: async (value: Record<string, unknown>) => { query = value; return { completedAt: new Date() }; } },
    } as never, completeProfile);

    await expect(service.get('user')).resolves.toEqual({ eligible: true, reason: 'ELIGIBLE', nextAction: null });
    expect(query).toMatchObject({ where: { patientId: 'patient', assessmentVersionId: 'version', state: 'COMPLETE', invalidatedAt: null }, select: { completedAt: true } });
  });

  it('blocks a complete profile without a valid required-version completion', async () => {
    const service = new PatientBookingEligibilityService({
      patientProfile: { findUnique: async () => ({ id: 'patient', clinicId: 'clinic' }) },
      bookingEligibilityPolicy: { findUnique: async () => ({ assessmentRequirement: 'REQUIRED', requiredAssessmentVersionId: 'version', validityDays: null, requireLatestPublishedVersion: false }) },
      assessmentVersion: { findUnique: async () => requiredVersion },
      patientAssessmentSubmission: { findFirst: async () => null },
    } as never, completeProfile);

    await expect(service.get('user')).resolves.toEqual({ eligible: false, reason: 'MAIN_ASSESSMENT_REQUIRED', nextAction: 'COMPLETE_ASSESSMENT' });
  });

  it('requires a completion of a newer published version when that policy is enabled', async () => {
    let completionQuery: Record<string, unknown> | undefined;
    const service = new PatientBookingEligibilityService({
      patientProfile: { findUnique: async () => ({ id: 'patient', clinicId: 'clinic' }) },
      bookingEligibilityPolicy: { findUnique: async () => ({ assessmentRequirement: 'REQUIRED', requiredAssessmentVersionId: 'version', validityDays: null, requireLatestPublishedVersion: true }) },
      assessmentVersion: { findUnique: async () => requiredVersion, findFirst: async () => ({ id: 'latest-version' }) },
      patientAssessmentSubmission: { findFirst: async (value: Record<string, unknown>) => { completionQuery = value; return null; } },
    } as never, completeProfile);

    await expect(service.get('user')).resolves.toEqual({ eligible: false, reason: 'LATEST_VERSION_REQUIRED', nextAction: 'COMPLETE_ASSESSMENT' });
    expect(completionQuery).toMatchObject({ where: { assessmentVersionId: 'latest-version' }, select: { completedAt: true } });
  });

  it('allows a completion of the latest published version without considering score or risk', async () => {
    let calls = 0;
    const service = new PatientBookingEligibilityService({
      patientProfile: { findUnique: async () => ({ id: 'patient', clinicId: 'clinic' }) },
      bookingEligibilityPolicy: { findUnique: async () => ({ assessmentRequirement: 'REQUIRED', requiredAssessmentVersionId: 'version', validityDays: null, requireLatestPublishedVersion: true }) },
      assessmentVersion: { findUnique: async () => requiredVersion, findFirst: async () => ({ id: 'latest-version' }) },
      patientAssessmentSubmission: { findFirst: async () => ({ completedAt: new Date(), score: calls++ === 0 ? 0 : 100, risk: 'HIGH' }) },
    } as never, completeProfile);

    await expect(service.get('user')).resolves.toEqual({ eligible: true, reason: 'ELIGIBLE', nextAction: null });
  });

  it('allows PATIENT and rejects ADMIN for the eligibility endpoint', () => {
    const guard = new AuthorizationGuard(new Reflector());
    expect(guard.canActivate(contextFor(['PATIENT']))).toBe(true);
    expect(() => guard.canActivate(contextFor(['ADMIN']))).toThrow(/Insufficient permissions/);
  });
});
