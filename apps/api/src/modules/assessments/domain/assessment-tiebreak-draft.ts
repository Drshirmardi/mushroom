import { previewDimensionDraft, validateDimensionDraft, type DimensionDraft, type DimensionPreview } from './assessment-dimension-draft';
import { AssessmentAnswerError } from './assessment-scoring';
import { AssessmentStructureError } from './assessment-structure-validation';

export const TIEBREAK_ALGORITHM = { algorithmId: 'DIMENSION_TIEBREAK', algorithmVersion: 1 } as const;
export type TieBreakQuestion = {
  id: string; title: string; tiedDimensions: string[];
  options: { id: string; title: string; dimensionId: string | null }[];
};
export type TieBreakDraft = Omit<DimensionDraft, 'schemaVersion' | 'scoring'> & {
  schemaVersion: 3;
  scoring: Omit<DimensionDraft['scoring'], 'algorithmId' | 'algorithmVersion'> & typeof TIEBREAK_ALGORITHM;
  followUps: TieBreakQuestion[];
};
export type TieBreakPreview = Omit<DimensionPreview, 'algorithmId' | 'status'> & typeof TIEBREAK_ALGORITHM & {
  status: DimensionPreview['status'] | 'FOLLOW_UP_REQUIRED' | 'FOLLOW_UP_UNAVAILABLE';
  followUp: TieBreakQuestion | null; followUpUsed: boolean;
};

const invalid = (): never => { throw new AssessmentStructureError('The 11+1 draft structure is invalid.'); };
const fail = (): never => { throw new AssessmentAnswerError('ASSESSMENT_ANSWERS_INVALID', 'Answer all 11 main questions and only the server-selected follow-up.'); };
const object = (input: unknown): Record<string, unknown> => input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : invalid();
const id = (input: unknown): string => typeof input === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(input) && !['constructor', 'prototype'].includes(input) ? input : invalid();
const text = (input: unknown, max: number) => typeof input === 'string' && input.trim() === input && input.length > 0 && input.length <= max || invalid();
const sameCandidates = (a: string[], b: string[]) => [...a].sort().join(':') === [...b].sort().join(':');

function baseDraft(draft: TieBreakDraft): DimensionDraft {
  const { followUps: _followUps, ...base } = draft;
  return { ...base, schemaVersion: 2, scoring: { ...base.scoring, algorithmId: 'DIMENSION_RANK', algorithmVersion: 1 } };
}

/** New draft version only: existing scalar and dimension contracts are unchanged. */
export function validateTieBreakDraft(input: unknown): TieBreakDraft {
  const root = object(input);
  const followUps = Array.isArray(root.followUps) ? root.followUps : invalid();
  if (Object.keys(root).length !== 8 || followUps.length > 11 || root.schemaVersion !== 3 || Buffer.byteLength(JSON.stringify(root), 'utf8') > 131072) invalid();
  const scoring = object(root.scoring);
  if (scoring.algorithmId !== TIEBREAK_ALGORITHM.algorithmId || scoring.algorithmVersion !== 1) invalid();
  const draft = input as TieBreakDraft;
  const base = validateDimensionDraft(baseDraft(draft));
  const dimensions = new Set(base.scoring.dimensions.map(dimension => dimension.id));
  const questions = base.sections.flatMap(section => section.questions);
  if (dimensions.size !== 4 || questions.length !== 11 || questions.some(question => !question.required || question.options.length !== 4)) invalid();
  // Membership, not a configurable diagnostic weight. Empty membership is informational.
  for (const question of questions) for (const option of question.options) {
    if (Object.keys(option.scores).length > 1 || Object.values(option.scores).some(value => value !== 1)) invalid();
  }
  const ids = new Set([...base.sections.map(section => section.id), ...questions.map(question => question.id)]);
  const cases = new Set<string>();
  for (const raw of followUps) {
    const question = object(raw);
    if (Object.keys(question).length !== 4) invalid();
    const key = id(question.id); if (ids.has(key)) invalid(); ids.add(key); text(question.title, 1000);
    const tied = Array.isArray(question.tiedDimensions) ? question.tiedDimensions : invalid();
    const options = Array.isArray(question.options) ? question.options : invalid();
    if (tied.length < 2 || tied.length > 4 || new Set(tied).size !== tied.length || tied.some(value => typeof value !== 'string' || !dimensions.has(value))) invalid();
    const caseKey = [...tied].sort().join(':'); if (cases.has(caseKey)) invalid(); cases.add(caseKey);
    if (options.length < 2 || options.length > 5) invalid();
    const optionIds = new Set<string>(); const represented = new Set<string>();
    for (const rawOption of options) {
      const option = object(rawOption);
      if (Object.keys(option).length !== 3) invalid();
      const optionId = id(option.id); if (optionIds.has(optionId)) invalid(); optionIds.add(optionId); text(option.title, 1500);
      if (option.dimensionId !== null) {
        const dimensionId = typeof option.dimensionId === 'string' ? option.dimensionId : invalid();
        if (!tied.includes(dimensionId)) invalid();
        represented.add(dimensionId);
      }
    }
    if (represented.size !== tied.length) invalid();
  }
  return draft;
}

/** Stateless ADMIN simulation. A tie-break orders the tied candidates; it never changes main-answer counts. */
export function previewTieBreakDraft(input: unknown, rawAnswers: unknown): TieBreakPreview {
  const draft = validateTieBreakDraft(input);
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) fail();
  const answers = rawAnswers as Record<string, unknown>;
  const mainIds = new Set(draft.sections.flatMap(section => section.questions.map(question => question.id)));
  const mainAnswers = Object.fromEntries(Object.entries(answers).filter(([key]) => mainIds.has(key)));
  const base = previewDimensionDraft(baseDraft(draft), mainAnswers);
  const result: TieBreakPreview = { ...base, ...TIEBREAK_ALGORITHM, followUp: null, followUpUsed: false };
  const extras = Object.keys(answers).filter(key => !mainIds.has(key));
  if (base.status !== 'PRIMARY_TIE' && base.status !== 'SECONDARY_TIE') {
    if (extras.length) fail();
    return result;
  }
  const question = draft.followUps.find(item => sameCandidates(item.tiedDimensions, base.tiedDimensions));
  if (!question) {
    if (extras.length) fail();
    return { ...result, status: 'FOLLOW_UP_UNAVAILABLE' };
  }
  if (extras.some(key => key !== question.id) || extras.length > 1) fail();
  if (!Object.prototype.hasOwnProperty.call(answers, question.id)) return { ...result, status: 'FOLLOW_UP_REQUIRED', followUp: question };
  const option = question.options.find(item => item.id === answers[question.id]) ?? fail();
  result.followUpUsed = true;
  if (option.dimensionId === null) return result;
  if (base.status === 'SECONDARY_TIE') {
    result.secondary = option.dimensionId;
    result.tiedDimensions = [];
  } else {
    result.primary = option.dimensionId;
    const remaining = base.tiedDimensions.filter(dimension => dimension !== option.dimensionId);
    if (remaining.length > 1) return { ...result, status: 'SECONDARY_TIE', tiedDimensions: remaining };
    result.secondary = remaining[0] ?? null;
    result.tiedDimensions = [];
  }
  result.status = result.secondary ? 'PAIR' : 'SINGLE';
  result.profile = draft.resultProfiles.find(profile => profile.primary === result.primary && profile.secondary === result.secondary) ?? null;
  return result;
}
