import { describe, expect, it } from 'vitest';
import { PatientBookingEligibilityService } from '../src/modules/assessments/patient/patient-booking-eligibility.service';

describe('patient booking eligibility', () => {
  it('blocks incomplete onboarding before any assessment lookup', async () => { const service = new PatientBookingEligibilityService({ patientProfile: { findUnique: () => { throw new Error('assessment data must not be read'); } } } as never, { getOnboardingStatus: async () => ({ state: 'IN_PROGRESS' }) } as never); await expect(service.get('user')).resolves.toEqual({ eligible: false, reason: 'PROFILE_INCOMPLETE', nextAction: 'COMPLETE_ONBOARDING' }); });
  it('allows a complete patient when the policy is disabled without reading submissions', async () => { const service = new PatientBookingEligibilityService({ patientProfile: { findUnique: async () => ({ id: 'patient', clinicId: 'clinic' }) }, bookingEligibilityPolicy: { findUnique: async () => ({ assessmentRequirement: 'NOT_REQUIRED' }) }, patientAssessmentSubmission: { findFirst: () => { throw new Error('score/submission must not be read'); } } } as never, { getOnboardingStatus: async () => ({ state: 'COMPLETE' }) } as never); await expect(service.get('user')).resolves.toEqual({ eligible: true, reason: 'ELIGIBLE', nextAction: null }); });
});
