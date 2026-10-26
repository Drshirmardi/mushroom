import { canonicalAssessmentJson } from './assessment-canonical-json';
import { ASSESSMENT_SCORING_IDENTITY } from './assessment-scoring';
import { validateAssessmentStructure } from './assessment-structure-validation';

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export type AssessmentResultProvenance = { status: 'PROVENANCE_UNRECORDED' | 'PROVENANCE_UNSUPPORTED' | 'CLINICAL_REVIEW_REQUIRED' } | { status: 'SUPPORTED'; bandId: string; band: Record<string, unknown> };

// Validate persisted engine metadata without querying responses or running another scoring engine.
export function assessmentResultProvenance(source: { contentHash: string; structure: unknown }, rawSnapshot: unknown, completionPayloadHash: string | null): AssessmentResultProvenance {
  const snapshot = object(rawSnapshot);
  if (snapshot.algorithmId == null || snapshot.algorithmVersion == null || snapshot.questionnaireContentHash == null || snapshot.answerPayloadHash == null) return { status: 'PROVENANCE_UNRECORDED' };
  if (snapshot.algorithmId !== ASSESSMENT_SCORING_IDENTITY.algorithmId || snapshot.algorithmVersion !== ASSESSMENT_SCORING_IDENTITY.algorithmVersion || snapshot.questionnaireContentHash !== source.contentHash || typeof snapshot.answerPayloadHash !== 'string' || !/^[a-f0-9]{64}$/u.test(snapshot.answerPayloadHash) || snapshot.answerPayloadHash !== completionPayloadHash) return { status: 'PROVENANCE_UNSUPPORTED' };
  try {
    validateAssessmentStructure(source.structure, true);
    const actualBand = (source.structure as { resultBands?: Record<string, unknown>[] }).resultBands?.find(b => b.id === String(object(snapshot.resultBand).id));
    if (!actualBand) return { status: 'PROVENANCE_UNSUPPORTED' };
    const expected = { id: actualBand.id, title: actualBand.title, riskLevel: actualBand.riskLevel ?? 'NONE', requiresReview: actualBand.requiresReview ?? false };
    if (canonicalAssessmentJson(expected) !== canonicalAssessmentJson(snapshot.resultBand)) return { status: 'PROVENANCE_UNSUPPORTED' };
    if (expected.requiresReview === true) return { status: 'CLINICAL_REVIEW_REQUIRED' };
    return { status: 'SUPPORTED', bandId: String(actualBand.id), band: actualBand };
  } catch { return { status: 'PROVENANCE_UNSUPPORTED' }; }
}
