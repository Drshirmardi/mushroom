import { describe, expect, it } from 'vitest';
import { homeJourney, type JourneySummary } from '../src/modules/patients/journey/home-journey.projection';

function summary(complete = true): JourneySummary {
  return {
    evaluatedAt: new Date(), onboarding: { state: complete ? 'COMPLETE' : 'IN_PROGRESS', isComplete: complete, requiredCount: 6, answeredRequiredCount: complete ? 6 : 0, missingFields: complete ? [] : ['firstName', 'lastName', 'birthDate', 'allergyReport', 'chronicConditionReport', 'currentMedicationReport'], blockerCodes: [], nextAction: complete ? 'NONE' : 'COMPLETE_PROFILE' },
    bookingEligibility: { eligible: true, reason: 'ELIGIBLE', nextAction: null },
    assessments: { items: [], hasMore: false }, appointments: { items: [], hasMore: false }, pendingPayments: { items: [], hasMore: false }, pendingOrders: { items: [], hasMore: false }, treatmentPlans: { items: [], hasMore: false }, coupleLinks: { items: [], hasMore: false }, coupleAssessments: { items: [], hasMore: false }, assessmentPurchases: { items: [], hasMore: false }, programPurchases: { items: [], hasMore: false }, customPrograms: { items: [], hasMore: false }, storeAvailable: true,
  };
}
const sources = () => ({ latestAssessment: null, activeTreatmentPlanId: null });

describe('Home setup, status and pending action projection', () => {
  it('keeps setup incomplete until authoritative final completion, even when all fields are answered', () => {
    const s = summary(false); s.onboarding.missingFields = [];
    expect(homeJourney(s, sources()).setupSteps.map(step => step.state)).toEqual(['COMPLETE', 'COMPLETE', 'CURRENT']);
    s.onboarding.isComplete = true;
    expect(homeJourney(s, sources()).setupSteps.every(step => step.state === 'COMPLETE')).toBe(true);
  });
  it('keeps missing birth details in the same basic-details step as the form', () => {
    const s = summary(false); s.onboarding.missingFields = ['birthDate'];
    expect(homeJourney(s, sources()).setupSteps[0].state).toBe('CURRENT');
  });
  it('does not make a separate sharing policy a prerequisite for the health step', () => {
    const s = summary(false); s.onboarding.missingFields = []; s.onboarding.blockerCodes = ['CONSENT_POLICY_NOT_AVAILABLE'];
    expect(homeJourney(s, sources()).setupSteps.map(step => step.state)).toEqual(['COMPLETE', 'COMPLETE', 'CURRENT']);
  });
  it('does not turn completed results, completed plans or available content into pending tasks', () => {
    const s = summary(); s.treatmentPlans.items = [{ id: 'completed', state: 'COMPLETED', updatedAt: new Date() }];
    const result = homeJourney(s, { ...sources(), latestAssessment: { id: 'result', title: 'Actual source', completedAt: new Date() } });
    expect(result.actions).toEqual([]); expect(result.latestAssessment?.id).toBe('result');
  });
  it('excludes voluntary top-ups', () => {
    expect(homeJourney(summary(), { ...sources(), payment: { id: 'topup', purpose: 'TOPUP', amountRial: 5000n, orderId: null } }).actions).toEqual([]);
  });
  it('preserves exact selected resources beyond capped previews and integer money', () => {
    const result = homeJourney(summary(), { ...sources(), appointmentId: 'appointment', payment: { id: 'old-payment', purpose: 'ASSESSMENT', amountRial: 9007199254740993n, orderId: null }, resumableId: 'old-attempt', unusedGrantId: 'unused', activeTreatmentPlanId: 'active' });
    expect(result.actions.map(item => item.code)).toEqual(['OPEN_APPOINTMENT', 'CONTINUE_PAYMENT', 'START_PAID_ASSESSMENT', 'RESUME_ASSESSMENT', 'VIEW_TREATMENT_PLAN']);
    expect(result.actions[1].amountRial).toBe('9007199254740993');
  });
  it('does not duplicate the selected order payment or couple assessment grant', () => {
    const s = summary(); s.pendingOrders.items = [{ id: 'order', totalAmountToman: '500', currency: 'TOMAN' }];
    const result = homeJourney(s, { ...sources(), payment: { id: 'payment', purpose: 'ORDER', amountRial: 5000n, orderId: 'order' }, unusedGrantId: 'grant', pendingCouple: { id: 'couple', title: 'Couple', ownAccessGrantId: 'grant', ownSubmissionId: null } });
    expect(result.actions.map(item => item.code)).toEqual(['CONTINUE_PAYMENT', 'START_PAID_ASSESSMENT']);
  });
  it('does not duplicate onboarding as a booking requirement before setup is complete', () => {
    const s = summary(false); s.bookingEligibility = { eligible: false, reason: 'PROFILE_INCOMPLETE', nextAction: 'COMPLETE_ONBOARDING' };
    expect(homeJourney(s, sources()).actions).toEqual([]);
    s.onboarding.isComplete = true;
    expect(homeJourney(s, sources()).actions[0].code).toBe('REVIEW_BOOKING_REQUIREMENTS');
  });
});
