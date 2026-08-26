import { describe, expect, it } from 'vitest';

import {
  canonicalizeMedicalDeclaration,
  canonicalizeBirthDate,
  canonicalizePatientText,
  canonicalizeRequiredPatientText,
  evaluateOnboarding,
  PatientDomainError,
} from '../src/modules/patients/domain/onboarding';

describe('patient onboarding domain rules', () => {
  it('canonicalizes Persian text, digits and whitespace without retaining empty values', () => {
    expect(canonicalizePatientText('  علي\tكاظمي ۱۲ ')).toBe('علی کاظمی 12');
    expect(canonicalizePatientText(' \n ')).toBeNull();
  });

  it('validates profile text limits and Gregorian birth dates after digit normalization', () => {
    expect(canonicalizeRequiredPatientText('  سارا  ', 80)).toBe('سارا');
    expect(() => canonicalizeRequiredPatientText(' ', 80)).toThrow(PatientDomainError);
    expect(canonicalizeBirthDate('۱۹۹۵-۰۱-۰۲')).toBe('1995-01-02');
    expect(() => canonicalizeBirthDate('2025-02-30')).toThrow(PatientDomainError);
  });

  it('keeps NONE and UNKNOWN distinct from an unanswered declaration', () => {
    expect(canonicalizeMedicalDeclaration(undefined)).toBeNull();
    expect(canonicalizeMedicalDeclaration({ status: 'NONE', items: [] }))
      .toEqual({ status: 'NONE', items: [] });
    expect(() => canonicalizeMedicalDeclaration({ status: 'NONE', items: ['گرده'] }))
      .toThrow(PatientDomainError);
    expect(() => canonicalizeMedicalDeclaration({ status: 'PRESENT', items: [] }))
      .toThrow(PatientDomainError);
  });

  it('normalizes, de-duplicates and bounds self-reported declaration items', () => {
    expect(canonicalizeMedicalDeclaration({
      status: 'PRESENT', items: ['  گرده  ', 'پنی سیلین'],
    })).toEqual({ status: 'PRESENT', items: ['گرده', 'پنی سیلین'] });
    expect(() => canonicalizeMedicalDeclaration({
      status: 'PRESENT', items: ['Aspirin', 'aspirin'],
    })).toThrow(PatientDomainError);
  });

  it('derives deterministic blockers and next actions', () => {
    const result = evaluateOnboarding({
      firstName: 'سارا', lastName: 'رضایی', birthDate: null, sexAtBirth: null,
      allergyReport: null, chronicConditionReport: null, currentMedicationReport: null,
      activeCurrentConsent: false, consentPolicyAvailable: true,
      activeConsentRecordId: null, completedConsentRecordId: null, hasConsentDecision: false,
      submissionState: null, currentRevision: 0, completedRevision: null,
    });
    expect(result).toMatchObject({
      state: 'IN_PROGRESS', requiredCount: 8, answeredRequiredCount: 2,
      missingFields: ['birthDate', 'sexAtBirth', 'allergyReport', 'chronicConditionReport', 'currentMedicationReport', 'activeCurrentConsent'],
      blockerCodes: ['CONSENT_REQUIRED', 'MEDICAL_INTAKE_INCOMPLETE'],
      nextAction: 'REVIEW_CONSENT',
    });
  });

  it('requires an explicit current completion even when all requirements are answered', () => {
    const base = {
      firstName: 'سارا', lastName: 'رضایی', birthDate: '1995-01-01', sexAtBirth: 'UNKNOWN',
      allergyReport: { status: 'NONE' as const, items: [] },
      chronicConditionReport: { status: 'UNKNOWN' as const, items: [] },
      currentMedicationReport: { status: 'NONE' as const, items: [] },
      activeCurrentConsent: true, consentPolicyAvailable: true,
      activeConsentRecordId: 'current-grant', completedConsentRecordId: null,
      hasConsentDecision: true, currentRevision: 1,
    };
    expect(evaluateOnboarding({ ...base, submissionState: 'DRAFT', completedRevision: null }))
      .toMatchObject({ isComplete: false, nextAction: 'COMPLETE_ONBOARDING' });
    expect(evaluateOnboarding({ ...base, submissionState: 'COMPLETE', completedRevision: 1, completedConsentRecordId: 'current-grant' }))
      .toMatchObject({ state: 'COMPLETE', isComplete: true, nextAction: 'NONE' });
  });

  it('requires completion against the currently active consent grant', () => {
    const result = evaluateOnboarding({
      firstName: 'سارا', lastName: 'رضایی', birthDate: '1995-01-01', sexAtBirth: 'UNKNOWN',
      allergyReport: { status: 'NONE', items: [] }, chronicConditionReport: { status: 'NONE', items: [] },
      currentMedicationReport: { status: 'NONE', items: [] }, activeCurrentConsent: true,
      consentPolicyAvailable: true, activeConsentRecordId: 'new-grant', completedConsentRecordId: 'old-grant',
      hasConsentDecision: true, submissionState: 'COMPLETE', currentRevision: 2, completedRevision: 2,
    });
    expect(result).toMatchObject({ state: 'IN_PROGRESS', nextAction: 'COMPLETE_ONBOARDING' });
  });

  it('distinguishes starting medical intake from continuing it and started consent state', () => {
    const base = {
      firstName: 'سارا', lastName: 'رضایی', birthDate: null, sexAtBirth: null,
      allergyReport: null, chronicConditionReport: null, currentMedicationReport: null,
      activeCurrentConsent: true, consentPolicyAvailable: true, activeConsentRecordId: 'grant',
      completedConsentRecordId: null, hasConsentDecision: true, completedRevision: null,
    };
    expect(evaluateOnboarding({ ...base, submissionState: null, currentRevision: 0 }))
      .toMatchObject({ state: 'IN_PROGRESS', nextAction: 'START_MEDICAL_INTAKE' });
    expect(evaluateOnboarding({ ...base, submissionState: 'DRAFT', currentRevision: 1 }))
      .toMatchObject({ nextAction: 'CONTINUE_MEDICAL_INTAKE' });
  });
});
