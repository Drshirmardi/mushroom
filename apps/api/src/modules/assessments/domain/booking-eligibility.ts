export type BookingAssessmentPolicy = Readonly<{
  assessmentRequirement: 'NOT_REQUIRED' | 'REQUIRED';
  requiredAssessmentVersionId: string | null;
}>;

export type AssessmentCompletion = Readonly<{
  assessmentVersionId: string;
  state: 'IN_PROGRESS' | 'COMPLETE' | 'INVALIDATED';
  completedAt: Date | null;
  invalidatedAt: Date | null;
  score: number | null;
}>;

export type BookingAssessmentEligibility = Readonly<{
  eligible: boolean;
  reason: 'NOT_REQUIRED' | 'VALID_COMPLETION' | 'ASSESSMENT_REQUIRED';
}>;

export const evaluateBookingAssessmentEligibility = (
  policy: BookingAssessmentPolicy,
  completions: readonly AssessmentCompletion[],
): BookingAssessmentEligibility => {
  if (policy.assessmentRequirement === 'NOT_REQUIRED') {
    return { eligible: true, reason: 'NOT_REQUIRED' };
  }

  if (!policy.requiredAssessmentVersionId) {
    throw new Error('Required assessment policy must reference a version.');
  }

  const hasValidCompletion = completions.some((completion) =>
    completion.assessmentVersionId === policy.requiredAssessmentVersionId
    && completion.state === 'COMPLETE'
    && completion.completedAt !== null
    && completion.invalidatedAt === null,
  );

  return hasValidCompletion
    ? { eligible: true, reason: 'VALID_COMPLETION' }
    : { eligible: false, reason: 'ASSESSMENT_REQUIRED' };
};
