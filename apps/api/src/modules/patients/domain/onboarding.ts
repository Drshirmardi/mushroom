export const REQUIRED_ONBOARDING_FIELDS = [
  'firstName',
  'lastName',
  'birthDate',
  'sexAtBirth',
  'allergyReport',
  'chronicConditionReport',
  'currentMedicationReport',
  'activeCurrentConsent',
] as const;

export type RequiredOnboardingField = (typeof REQUIRED_ONBOARDING_FIELDS)[number];

export type MedicalDeclarationStatus = 'NONE' | 'UNKNOWN' | 'PRESENT';

export const SEX_AT_BIRTH_VALUES = [
  'FEMALE', 'MALE', 'INTERSEX', 'UNKNOWN', 'PREFER_NOT_TO_SAY',
] as const;
export type SexAtBirth = (typeof SEX_AT_BIRTH_VALUES)[number];

export interface MedicalDeclaration {
  status: MedicalDeclarationStatus;
  items: string[];
}

export interface OnboardingRequirements {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  birthDate: string | null | undefined;
  sexAtBirth: string | null | undefined;
  allergyReport: MedicalDeclaration | null | undefined;
  chronicConditionReport: MedicalDeclaration | null | undefined;
  currentMedicationReport: MedicalDeclaration | null | undefined;
  activeCurrentConsent: boolean;
  activeConsentRecordId: string | null;
  completedConsentRecordId: string | null;
  hasConsentDecision: boolean;
  consentPolicyAvailable: boolean;
  submissionState: 'DRAFT' | 'COMPLETE' | null;
  currentRevision: number;
  completedRevision: number | null;
}

export type OnboardingBlockerCode =
  | 'PROFILE_FIELDS_INCOMPLETE'
  | 'CONSENT_POLICY_NOT_AVAILABLE'
  | 'CONSENT_REQUIRED'
  | 'MEDICAL_INTAKE_INCOMPLETE';

export type OnboardingNextAction =
  | 'COMPLETE_PROFILE'
  | 'CONSENT_UNAVAILABLE'
  | 'REVIEW_CONSENT'
  | 'START_MEDICAL_INTAKE'
  | 'CONTINUE_MEDICAL_INTAKE'
  | 'COMPLETE_ONBOARDING'
  | 'NONE';

export type OnboardingState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

export interface OnboardingEvaluation {
  state: OnboardingState;
  isComplete: boolean;
  requiredCount: number;
  answeredRequiredCount: number;
  missingFields: RequiredOnboardingField[];
  blockerCodes: OnboardingBlockerCode[];
  nextAction: OnboardingNextAction;
}

export class PatientDomainError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_MEDICAL_DECLARATION'
      | 'PROFILE_FIELDS_INCOMPLETE'
      | 'MEDICAL_INTAKE_INCOMPLETE',
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export const normalizeStructuredDigits = (value: string): string =>
  [...value].map((character) => {
    const persianIndex = persianDigits.indexOf(character);
    if (persianIndex >= 0) return String(persianIndex);
    const arabicIndex = arabicDigits.indexOf(character);
    return arabicIndex >= 0 ? String(arabicIndex) : character;
  }).join('');

export const canonicalizePatientText = (value: string): string | null => {
  const canonical = normalizeStructuredDigits(value)
    .normalize('NFC')
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .trim()
    .replace(/\s+/gu, ' ');

  return canonical === '' ? null : canonical;
};

export const canonicalizeRequiredPatientText = (
  value: string,
  maxLength: number,
): string => {
  const canonical = canonicalizePatientText(value);
  if (!canonical || canonical.length > maxLength) {
    throw new PatientDomainError(
      'PROFILE_FIELDS_INCOMPLETE',
      `Profile text must contain 1 to ${maxLength} characters.`,
    );
  }
  return canonical;
};

export const canonicalizeBirthDate = (value: string): string => {
  const canonical = normalizeStructuredDigits(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(canonical)) {
    throw new PatientDomainError('MEDICAL_INTAKE_INCOMPLETE', 'Birth date must be an ISO date.');
  }
  const date = new Date(`${canonical}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== canonical
    || canonical > new Date().toISOString().slice(0, 10)) {
    throw new PatientDomainError('MEDICAL_INTAKE_INCOMPLETE', 'Birth date must be valid and not in the future.');
  }
  return canonical;
};

const declarationItemKey = (item: string): string =>
  /[A-Za-z]/u.test(item) ? item.toLocaleLowerCase('en-US') : item;

export const canonicalizeMedicalDeclaration = (
  value: MedicalDeclaration | null | undefined,
): MedicalDeclaration | null => {
  if (!value) return null;

  if (!['NONE', 'UNKNOWN', 'PRESENT'].includes(value.status) || !Array.isArray(value.items)) {
    throw new PatientDomainError('INVALID_MEDICAL_DECLARATION', 'Medical declaration status or items are invalid.');
  }

  const items = value.items.map((item) => canonicalizePatientText(item));
  if (items.some((item) => !item || item.length > 200)) {
    throw new PatientDomainError(
      'INVALID_MEDICAL_DECLARATION',
      'Medical declaration items must contain 1 to 200 characters.',
    );
  }
  const canonicalItems = items as string[];
  if (canonicalItems.length > 50
    || new Set(canonicalItems.map(declarationItemKey)).size !== canonicalItems.length) {
    throw new PatientDomainError(
      'INVALID_MEDICAL_DECLARATION',
      'Medical declaration items must be unique and contain at most 50 values.',
    );
  }
  if ((value.status === 'NONE' || value.status === 'UNKNOWN') && canonicalItems.length > 0) {
    throw new PatientDomainError(
      'INVALID_MEDICAL_DECLARATION',
      'NONE and UNKNOWN declarations cannot include items.',
    );
  }
  if (value.status === 'PRESENT' && canonicalItems.length === 0) {
    throw new PatientDomainError(
      'INVALID_MEDICAL_DECLARATION',
      'PRESENT declarations require at least one item.',
    );
  }

  return { status: value.status, items: canonicalItems };
};

const isAnswered = (value: unknown): boolean =>
  value !== null && value !== undefined && (!(typeof value === 'string') || value.trim() !== '');

export const evaluateOnboarding = (
  requirements: OnboardingRequirements,
): OnboardingEvaluation => {
  const missingFields = REQUIRED_ONBOARDING_FIELDS.filter((field) => {
    if (field === 'activeCurrentConsent') return !requirements.activeCurrentConsent;
    return !isAnswered(requirements[field]);
  });
  const profileMissing = missingFields.some((field) => field === 'firstName' || field === 'lastName');
  const medicalMissing = missingFields.some((field) => !['firstName', 'lastName', 'activeCurrentConsent'].includes(field));
  const blockerCodes: OnboardingBlockerCode[] = [];
  if (profileMissing) blockerCodes.push('PROFILE_FIELDS_INCOMPLETE');
  if (!requirements.consentPolicyAvailable) blockerCodes.push('CONSENT_POLICY_NOT_AVAILABLE');
  else if (!requirements.activeCurrentConsent) blockerCodes.push('CONSENT_REQUIRED');
  if (medicalMissing) blockerCodes.push('MEDICAL_INTAKE_INCOMPLETE');

  const requirementsSatisfied = missingFields.length === 0;
  const completionCurrent = requirements.submissionState === 'COMPLETE'
    && requirements.currentRevision > 0
    && requirements.currentRevision === requirements.completedRevision
    && requirements.completedConsentRecordId !== null
    && requirements.completedConsentRecordId === requirements.activeConsentRecordId;
  const isComplete = requirementsSatisfied && completionCurrent;
  const state: OnboardingState = isComplete
    ? 'COMPLETE'
    : requirements.currentRevision === 0 && !requirements.firstName && !requirements.lastName
      && !requirements.hasConsentDecision
      ? 'NOT_STARTED'
      : 'IN_PROGRESS';
  const nextAction: OnboardingNextAction = profileMissing
    ? 'COMPLETE_PROFILE'
    : !requirements.consentPolicyAvailable
      ? 'CONSENT_UNAVAILABLE'
      : !requirements.activeCurrentConsent
        ? 'REVIEW_CONSENT'
        : medicalMissing && requirements.currentRevision === 0
          ? 'START_MEDICAL_INTAKE'
          : medicalMissing
            ? 'CONTINUE_MEDICAL_INTAKE'
          : !completionCurrent
            ? 'COMPLETE_ONBOARDING'
            : 'NONE';

  return {
    state,
    isComplete,
    requiredCount: REQUIRED_ONBOARDING_FIELDS.length,
    answeredRequiredCount: REQUIRED_ONBOARDING_FIELDS.length - missingFields.length,
    missingFields,
    blockerCodes,
    nextAction,
  };
};
