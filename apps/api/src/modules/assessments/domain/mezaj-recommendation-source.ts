import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { prepareAssessmentResultBands, verifyAssessmentResultProvenance } from './assessment-result-provenance';
import { canonicalAssessmentJson } from './assessment-canonical-json';
import { validateTieBreakDraft } from './assessment-tiebreak-draft';
import { validateDimensionDraft } from './assessment-dimension-draft';

export const MEZAJ_PAIR_CODES = ['damavi', 'safravi', 'balgami', 'sodavi'] as const;
export type MezajPairCode = typeof MEZAJ_PAIR_CODES[number];
type Source = { status: 'READY'; primary: MezajPairCode; secondary: MezajPairCode; submissionId: string } | { status: 'NO_RESULT' | 'RESULT_UNSUPPORTED' | 'REVIEW_REQUIRED' | 'NOT_CONFIGURED'; primary: null; secondary: null; submissionId: string | null };
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const dimensionCodes = new Map<string, MezajPairCode>([['DAMAVI','damavi'],['SAFRAVI','safravi'],['BALGHAMI','balgami'],['SODAVI','sodavi'],...MEZAJ_PAIR_CODES.map(code => [code,code] as [string,MezajPairCode])]);
const canonicalDimension = (value: unknown): MezajPairCode | null => dimensionCodes.get(String(value)) ?? null;

type DimensionStructure = ReturnType<typeof validateDimensionDraft> | ReturnType<typeof validateTieBreakDraft>;
type VersionMetadata = { assessmentVersionId: string; contentHash: string };
type PreparedVersion =
  | { kind: 'dimension'; structure: DimensionStructure }
  | { kind: 'bands'; bands: ReturnType<typeof prepareAssessmentResultBands> };
const preparedVersions = new Map<string, PreparedVersion>();
const PREPARED_VERSION_LIMIT = 128;

async function prepareVersion(tx: Prisma.TransactionClient, version: VersionMetadata, algorithm: string) {
  const key = `${version.assessmentVersionId}:${version.contentHash}:${algorithm}`;
  const cached = preparedVersions.get(key);
  if (cached) {
    preparedVersions.delete(key);
    preparedVersions.set(key, cached);
    return cached;
  }
  const { structure } = await tx.assessmentVersion.findUniqueOrThrow({
    where: { id: version.assessmentVersionId },
    select: { structure: true },
  });
  // Another transaction may have prepared this immutable version while this read was in flight.
  const preparedWhileReading = preparedVersions.get(key);
  if (preparedWhileReading) return preparedWhileReading;
  let prepared: PreparedVersion;
  try {
    prepared = algorithm === 'DIMENSION_TIEBREAK'
      ? { kind: 'dimension', structure: validateTieBreakDraft(structure) }
      : algorithm === 'DIMENSION_RANK'
        ? { kind: 'dimension', structure: validateDimensionDraft(structure) }
        : { kind: 'bands', bands: prepareAssessmentResultBands(structure) };
  } catch {
    return null;
  }
  preparedVersions.set(key, prepared);
  if (preparedVersions.size > PREPARED_VERSION_LIMIT) {
    const oldest = preparedVersions.keys().next().value;
    if (oldest !== undefined) preparedVersions.delete(oldest);
  }
  return prepared;
}

/** Verify the patient's persisted snapshot against the validated version. */
function dimensionRecommendationPair(structure: DimensionStructure, contentHash: string, snapshot: Record<string, unknown>, payloadHash: string | null): { primary: MezajPairCode; secondary: MezajPairCode } | null {
  try {
    if (snapshot.algorithmVersion !== structure.scoring.algorithmVersion || snapshot.reviewState !== 'ADMIN_PUBLISHED' || snapshot.questionnaireContentHash !== contentHash || !/^[a-f0-9]{64}$/.test(payloadHash ?? '') || snapshot.answerPayloadHash !== payloadHash || !['PAIR', 'SINGLE'].includes(String(snapshot.status))) return null;
    const primary = snapshot.primary, secondary = snapshot.status === 'SINGLE' && snapshot.secondary === null ? primary : snapshot.secondary;
    if (!canonicalDimension(primary) || !canonicalDimension(secondary)) return null;
    const profile = structure.resultProfiles.find(item => item.primary === primary && item.secondary === snapshot.secondary);
    if (!profile || canonicalAssessmentJson(profile) !== canonicalAssessmentJson(snapshot.profile) || object(snapshot.resultBand).id !== profile.id) return null;
    return { primary: canonicalDimension(primary)!, secondary: canonicalDimension(secondary)! };
  } catch { return null; }
}

export async function resolveMezajRecommendationSource(tx: Prisma.TransactionClient, patient: { id: string; clinicId: string }, submissionId?: string): Promise<Source> {
  const [row] = await tx.$queryRaw<(VersionMetadata & { id: string; versionStatus: string; snapshot: Prisma.JsonValue; payloadHash: string | null })[]>(Prisma.sql`
    SELECT s.id,s.assessment_version_id AS "assessmentVersionId",
      v.status::text AS "versionStatus",v.content_hash AS "contentHash",
      s.result_snapshot-ARRAY['answers','score'] AS snapshot,s.completion_payload_hash AS "payloadHash"
    FROM patient_assessment_submissions s JOIN assessment_versions v ON v.id=s.assessment_version_id
    WHERE s.patient_id=${patient.id}::uuid AND v.clinic_id=${patient.clinicId}::uuid AND v.assessment_key IN ('MEZAJ','MIZAJ')
      AND s.state='COMPLETE' AND s.invalidated_at IS NULL AND assessment_submission_access_allowed(s.id,${patient.id}::uuid)
      ${submissionId ? Prisma.sql`AND s.id=${submissionId}::uuid` : Prisma.empty}
    ORDER BY s.completed_at DESC,s.id DESC LIMIT 1`);
  if (!row && submissionId) throw new NotFoundException({ code: 'ASSESSMENT_NOT_FOUND', message: 'Owned accessible completed result unavailable.', details: {} });
  const empty = (status: Exclude<Source['status'], 'READY'>): Source => ({ status, primary: null, secondary: null, submissionId: row?.id ?? null });
  if (!row) return empty('NO_RESULT');
  if (!['PUBLISHED', 'RETIRED'].includes(row.versionStatus)) return empty('RESULT_UNSUPPORTED');
  const snapshot = object(row.snapshot);
  const algorithm = snapshot.algorithmId === 'DIMENSION_TIEBREAK' || snapshot.algorithmId === 'DIMENSION_RANK'
    ? snapshot.algorithmId
    : 'BANDS';
  const version = await prepareVersion(tx, row, algorithm);
  if (!version) return empty('RESULT_UNSUPPORTED');
  if (version.kind === 'dimension') {
    const pair = dimensionRecommendationPair(version.structure, row.contentHash, snapshot, row.payloadHash);
    return pair ? { status: 'READY', ...pair, submissionId: row.id } : empty('RESULT_UNSUPPORTED');
  }
  const provenance = verifyAssessmentResultProvenance(row.contentHash, () => version.bands, snapshot, row.payloadHash);
  if (provenance.status !== 'SUPPORTED') return empty(provenance.status === 'CLINICAL_REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'RESULT_UNSUPPORTED');
  const source = await tx.commerceMezajCollectionSource.findUnique({ where: { assessmentVersionId_resultBandId: { assessmentVersionId: row.assessmentVersionId, resultBandId: provenance.bandId } }, include: { collection: true } });
  if (!source || source.clinicId !== patient.clinicId || source.sourceContentHash !== row.contentHash) return empty('NOT_CONFIGURED');
  return { status: 'READY', primary: source.collection.primary as MezajPairCode, secondary: source.collection.secondary as MezajPairCode, submissionId: row.id };
}
