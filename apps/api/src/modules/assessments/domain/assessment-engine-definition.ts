import { ASSESSMENT_SCORING_IDENTITY } from './assessment-scoring';
import { TIEBREAK_ALGORITHM, validateTieBreakPublication } from './assessment-tiebreak-draft';
import { validateAssessmentStructure } from './assessment-structure-validation';

export const isTieBreakStructure = (value: unknown): boolean => value !== null && typeof value === 'object' && (value as { schemaVersion?: unknown }).schemaVersion === 3;
export const assessmentAlgorithm = (value: unknown) => isTieBreakStructure(value) ? TIEBREAK_ALGORITHM : ASSESSMENT_SCORING_IDENTITY;
export function validatePublishableAssessment(value: unknown) {
  if (isTieBreakStructure(value)) validateTieBreakPublication(value);
  else validateAssessmentStructure(value, true);
}
