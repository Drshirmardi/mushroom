import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { assessmentResultProvenance } from './assessment-result-provenance';
import { canonicalAssessmentJson } from './assessment-canonical-json';
import { validateTieBreakDraft } from './assessment-tiebreak-draft';
import { validateDimensionDraft } from './assessment-dimension-draft';

export const MEZAJ_PAIR_CODES = ['damavi', 'safravi', 'balgami', 'sodavi'] as const;
export type MezajPairCode = typeof MEZAJ_PAIR_CODES[number];
type Source = { status: 'READY'; primary: MezajPairCode; secondary: MezajPairCode; submissionId: string } | { status: 'NO_RESULT' | 'RESULT_UNSUPPORTED' | 'REVIEW_REQUIRED' | 'NOT_CONFIGURED'; primary: null; secondary: null; submissionId: string | null };
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const dimensionCodes = new Map<string, MezajPairCode>([['DAMAVI','damavi'],['SAFRAVI','safravi'],['BALGHAMI','balgami'],['SODAVI','sodavi'],...MEZAJ_PAIR_CODES.map(code => [code,code] as [string,MezajPairCode])]);
const canonicalDimension = (value: unknown): MezajPairCode | null => dimensionCodes.get(String(value)) ?? null;

/** Validate persisted provenance, never infer a pair from patient text or recompute private answers. */
export function dimensionRecommendationPair(source: { structure: unknown; contentHash: string }, raw: unknown, payloadHash: string | null): { primary: MezajPairCode; secondary: MezajPairCode } | null {
  const snapshot = object(raw);
  try {
    const structure = snapshot.algorithmId === 'DIMENSION_TIEBREAK' ? validateTieBreakDraft(source.structure) : snapshot.algorithmId === 'DIMENSION_RANK' ? validateDimensionDraft(source.structure) : null;
    if (!structure || snapshot.algorithmVersion !== structure.scoring.algorithmVersion || snapshot.reviewState !== 'ADMIN_PUBLISHED' || snapshot.questionnaireContentHash !== source.contentHash || !/^[a-f0-9]{64}$/.test(payloadHash ?? '') || snapshot.answerPayloadHash !== payloadHash || !['PAIR', 'SINGLE'].includes(String(snapshot.status))) return null;
    const primary = snapshot.primary, secondary = snapshot.status === 'SINGLE' && snapshot.secondary === null ? primary : snapshot.secondary;
    if (!canonicalDimension(primary) || !canonicalDimension(secondary)) return null;
    const profile = structure.resultProfiles.find(item => item.primary === primary && item.secondary === snapshot.secondary);
    if (!profile || canonicalAssessmentJson(profile) !== canonicalAssessmentJson(snapshot.profile) || object(snapshot.resultBand).id !== profile.id) return null;
    return { primary: canonicalDimension(primary)!, secondary: canonicalDimension(secondary)! };
  } catch { return null; }
}

export async function resolveMezajRecommendationSource(tx: Prisma.TransactionClient, patient: { id: string; clinicId: string }, submissionId?: string): Promise<Source> {
  const [row] = await tx.$queryRaw<{ id: string; assessmentVersionId: string; snapshot: Prisma.JsonValue; payloadHash: string | null }[]>(Prisma.sql`
    SELECT s.id,s.assessment_version_id AS "assessmentVersionId",s.result_snapshot-ARRAY['answers','score'] AS snapshot,s.completion_payload_hash AS "payloadHash"
    FROM patient_assessment_submissions s JOIN assessment_versions v ON v.id=s.assessment_version_id
    WHERE s.patient_id=${patient.id}::uuid AND v.clinic_id=${patient.clinicId}::uuid AND v.assessment_key IN ('MEZAJ','MIZAJ')
      AND s.state='COMPLETE' AND s.invalidated_at IS NULL AND assessment_submission_access_allowed(s.id,${patient.id}::uuid)
      ${submissionId ? Prisma.sql`AND s.id=${submissionId}::uuid` : Prisma.empty}
    ORDER BY s.completed_at DESC,s.id DESC LIMIT 1`);
  if (!row && submissionId) throw new NotFoundException({ code: 'ASSESSMENT_NOT_FOUND', message: 'Owned accessible completed result unavailable.', details: {} });
  const empty = (status: Exclude<Source['status'], 'READY'>): Source => ({ status, primary: null, secondary: null, submissionId: row?.id ?? null });
  if (!row) return empty('NO_RESULT');
  const version = await tx.assessmentVersion.findUniqueOrThrow({ where: { id: row.assessmentVersionId }, select: { contentHash: true, structure: true, status: true } });
  if (!['PUBLISHED', 'RETIRED'].includes(version.status)) return empty('RESULT_UNSUPPORTED');
  if (['DIMENSION_TIEBREAK', 'DIMENSION_RANK'].includes(String(object(row.snapshot).algorithmId))) {
    const pair = dimensionRecommendationPair(version, row.snapshot, row.payloadHash);
    return pair ? { status: 'READY', ...pair, submissionId: row.id } : empty('RESULT_UNSUPPORTED');
  }
  const provenance = assessmentResultProvenance(version, row.snapshot, row.payloadHash);
  if (provenance.status !== 'SUPPORTED') return empty(provenance.status === 'CLINICAL_REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'RESULT_UNSUPPORTED');
  const source = await tx.commerceMezajCollectionSource.findUnique({ where: { assessmentVersionId_resultBandId: { assessmentVersionId: row.assessmentVersionId, resultBandId: provenance.bandId } }, include: { collection: true } });
  if (!source || source.clinicId !== patient.clinicId || source.sourceContentHash !== version.contentHash) return empty('NOT_CONFIGURED');
  return { status: 'READY', primary: source.collection.primary as MezajPairCode, secondary: source.collection.secondary as MezajPairCode, submissionId: row.id };
}
