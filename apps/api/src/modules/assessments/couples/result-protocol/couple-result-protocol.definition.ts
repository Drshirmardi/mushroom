import { createHash } from 'node:crypto';
import { canonicalAssessmentJson } from '../../domain/assessment-canonical-json';
import { validateAssessmentStructure } from '../../domain/assessment-structure-validation';

export const COUPLE_RESULT_ALGORITHM = { algorithmId: 'APPROVED_PAIR_LOOKUP', algorithmVersion: 1 } as const;
export type CoupleResultPair = { firstBandId: string; secondBandId: string; guidanceContentIds: string[]; recommendConsultation: boolean };
export const coupleProtocolHash = (value: unknown) => createHash('sha256').update(canonicalAssessmentJson(value)).digest('hex');

// Select professional-authored education; never derive a medical compatibility score.
export function normalizeCouplePairs(structure: unknown, input: CoupleResultPair[]) {
  validateAssessmentStructure(structure, true);
  const bands = (structure as { resultBands?: { id: string; requiresReview?: boolean }[] }).resultBands;
  if (!bands?.length || bands.length > 32 || bands.some(b => b.requiresReview === true) || bands.some(b => b.id.length > 100)) throw new Error('Supported reviewed bands required.');
  const indices = new Map(bands.map((band, index) => [band.id, index])); const seen = new Set<string>();
  if (!input.length || input.length > 528) throw new Error('Bounded explicit pairs required.');
  const pairs = input.map(pair => {
    const a = indices.get(pair.firstBandId), b = indices.get(pair.secondBandId);
    if (a === undefined || b === undefined || !pair.guidanceContentIds.length || pair.guidanceContentIds.length > 5 || typeof pair.recommendConsultation !== 'boolean') throw new Error('Exact source bands and content required.');
    const first = Math.min(a, b), second = Math.max(a, b), key = `${first}:${second}`;
    if (seen.has(key)) throw new Error('Duplicate unordered pair.'); seen.add(key);
    const ids = pair.guidanceContentIds.map(id => id.toLowerCase()); if (new Set(ids).size !== ids.length) throw new Error('Duplicate content.');
    return { firstBandId: bands[first]!.id, secondBandId: bands[second]!.id, guidanceContentIds: ids, recommendConsultation: pair.recommendConsultation };
  }).sort((a, b) => indices.get(a.firstBandId)! - indices.get(b.firstBandId)! || indices.get(a.secondBandId)! - indices.get(b.secondBandId)!);
  const ids = [...new Set(pairs.flatMap(pair => pair.guidanceContentIds))]; if (ids.length > 50 || Buffer.byteLength(JSON.stringify(pairs)) > 131072) throw new Error('Bounded content references required.');
  return { pairs, ids, complete: pairs.length === bands.length * (bands.length + 1) / 2 };
}

export function selectCouplePair(pairs: CoupleResultPair[], firstBandId: string, secondBandId: string) {
  return pairs.find(pair => pair.firstBandId === firstBandId && pair.secondBandId === secondBandId || pair.firstBandId === secondBandId && pair.secondBandId === firstBandId) ?? null;
}
