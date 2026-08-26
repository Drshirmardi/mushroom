import { describe, expect, it } from 'vitest';

import {
  evaluateBookingAssessmentEligibility,
  type AssessmentCompletion,
} from '../src/modules/assessments/domain/booking-eligibility';

const requiredVersionId = 'assessment-version-2';
const completion = (
  overrides: Partial<AssessmentCompletion> = {},
): AssessmentCompletion => ({
  assessmentVersionId: requiredVersionId,
  state: 'COMPLETE',
  completedAt: new Date('2026-08-26T07:00:00.000Z'),
  invalidatedAt: null,
  score: null,
  ...overrides,
});

describe('assessment booking contract', () => {
  it('allows booking when the assessment prerequisite is disabled', () => {
    expect(evaluateBookingAssessmentEligibility({
      assessmentRequirement: 'NOT_REQUIRED',
      requiredAssessmentVersionId: null,
    }, [])).toEqual({ eligible: true, reason: 'NOT_REQUIRED' });
  });

  it.each([null, 0, 12.5, 100])(
    'uses valid completion rather than score (%s)',
    (score) => {
      expect(evaluateBookingAssessmentEligibility({
        assessmentRequirement: 'REQUIRED',
        requiredAssessmentVersionId: requiredVersionId,
      }, [completion({ score })])).toEqual({
        eligible: true,
        reason: 'VALID_COMPLETION',
      });
    },
  );

  it.each([
    completion({ assessmentVersionId: 'old-version' }),
    completion({ state: 'IN_PROGRESS', completedAt: null }),
    completion({ state: 'INVALIDATED', invalidatedAt: new Date('2026-08-26T08:00:00.000Z') }),
  ])('rejects a missing, incomplete, invalidated, or wrong-version completion', (candidate) => {
    expect(evaluateBookingAssessmentEligibility({
      assessmentRequirement: 'REQUIRED',
      requiredAssessmentVersionId: requiredVersionId,
    }, [candidate])).toEqual({
      eligible: false,
      reason: 'ASSESSMENT_REQUIRED',
    });
  });

  it('fails closed for an inconsistent required policy', () => {
    expect(() => evaluateBookingAssessmentEligibility({
      assessmentRequirement: 'REQUIRED',
      requiredAssessmentVersionId: null,
    }, [])).toThrow('must reference a version');
  });
});
