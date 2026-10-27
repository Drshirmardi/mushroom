import { AssessmentAnswerError } from './assessment-scoring';
import { AssessmentStructureError } from './assessment-structure-validation';

export const DIMENSION_DRAFT_ALGORITHM = { algorithmId: 'DIMENSION_RANK', algorithmVersion: 1 } as const;
export const QUESTION_TEXT_MAX_LENGTH = 20_000;
export const ASSESSMENT_STRUCTURE_MAX_BYTES = 768 * 1024;
type Dimension = { id: string; title: string };
type Option = { id: string; title: string; scores: Record<string, number> };
type Question = { id: string; title: string; type: 'SINGLE_CHOICE'; required: boolean; options: Option[] };
export type DimensionProfile = { id: string; primary: string; secondary: string | null; title: string; summary: string; strengths: string[]; attentionPoints: string[]; nextStep: string };
export type DimensionDraft = {
  schemaVersion: 2; reviewState: 'UNREVIEWED'; educationalOnly: true;
  source: { kind: 'OWNER_CSV'; sha256: string };
  scoring: typeof DIMENSION_DRAFT_ALGORITHM & { dimensions: Dimension[]; minInformativeAnswers: number };
  sections: { id: string; title: string; questions: Question[] }[];
  resultProfiles: DimensionProfile[];
};
type Row = Record<string, unknown>;
const invalid = (): never => { throw new AssessmentStructureError('Dimension scoring is supported only as a bounded unreviewed draft.'); };
const object = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : invalid();
const fields = (value: Row, keys: string[]) => { if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) invalid(); };
const list = (value: unknown, min: number, max: number): unknown[] => Array.isArray(value) && value.length >= min && value.length <= max ? value : invalid();
const text = (value: unknown, max: number): string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max ? value : invalid();
const id = (value: unknown) => { const result = text(value, 64); if (!/^[A-Za-z][A-Za-z0-9_-]*$/u.test(result) || ['constructor', 'prototype'].includes(result)) invalid(); return result; };
const unique = (value: string, ids: Set<string>) => { if (ids.has(value)) invalid(); ids.add(value); };
const integer = (value: unknown, min: number, max: number): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : invalid();

/** Technical draft syntax only. Publication and patient scoring intentionally retain schema v1. */
export function validateDimensionDraft(input: unknown): DimensionDraft {
  const root = object(input);
  fields(root, ['schemaVersion', 'reviewState', 'educationalOnly', 'source', 'scoring', 'sections', 'resultProfiles']);
  if (root.schemaVersion !== 2 || root.reviewState !== 'UNREVIEWED' || root.educationalOnly !== true || Buffer.byteLength(JSON.stringify(root), 'utf8') > ASSESSMENT_STRUCTURE_MAX_BYTES) invalid();
  const source = object(root.source); fields(source, ['kind', 'sha256']);
  if (source.kind !== 'OWNER_CSV' || typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(source.sha256)) invalid();
  const scoring = object(root.scoring); fields(scoring, ['algorithmId', 'algorithmVersion', 'dimensions', 'minInformativeAnswers']);
  if (scoring.algorithmId !== DIMENSION_DRAFT_ALGORITHM.algorithmId || scoring.algorithmVersion !== DIMENSION_DRAFT_ALGORITHM.algorithmVersion) invalid();
  const dimensionIds = new Set<string>();
  for (const raw of list(scoring.dimensions, 2, 8)) { const row = object(raw); fields(row, ['id', 'title']); unique(id(row.id), dimensionIds); text(row.title, 100); }
  const ids = new Set<string>(); const contributingDimensions = new Set<string>(); let questionCount = 0; let contributingQuestions = 0;
  for (const rawSection of list(root.sections, 1, 20)) {
    const section = object(rawSection); fields(section, ['id', 'title', 'questions']); unique(id(section.id), ids); text(section.title, 200);
    for (const rawQuestion of list(section.questions, 1, 100)) {
      questionCount++; const question = object(rawQuestion); fields(question, ['id', 'title', 'type', 'required', 'options']);
      unique(id(question.id), ids); text(question.title, QUESTION_TEXT_MAX_LENGTH);
      if (question.type !== 'SINGLE_CHOICE' || typeof question.required !== 'boolean') invalid();
      const optionIds = new Set<string>(); let contributes = false;
      for (const rawOption of list(question.options, 2, 10)) {
        const option = object(rawOption); fields(option, ['id', 'title', 'scores']); unique(id(option.id), optionIds); text(option.title, 1500);
        const scores = object(option.scores);
        for (const [key, value] of Object.entries(scores)) {
          if (!dimensionIds.has(key)) invalid();
          if (integer(value, 0, 1000) > 0) { contributes = true; contributingDimensions.add(key); }
        }
      }
      if (contributes) contributingQuestions++;
    }
  }
  if (questionCount > 100 || contributingDimensions.size !== dimensionIds.size) invalid();
  integer(scoring.minInformativeAnswers, 1, contributingQuestions);
  const profileIds = new Set<string>(); const pairs = new Set<string>();
  for (const raw of list(root.resultProfiles, dimensionIds.size ** 2, dimensionIds.size ** 2)) {
    const profile = object(raw); fields(profile, ['id', 'primary', 'secondary', 'title', 'summary', 'strengths', 'attentionPoints', 'nextStep']); unique(id(profile.id), profileIds);
    if (typeof profile.primary !== 'string' || !dimensionIds.has(profile.primary) || profile.secondary !== null && (typeof profile.secondary !== 'string' || !dimensionIds.has(profile.secondary) || profile.primary === profile.secondary)) invalid();
    unique(`${profile.primary}:${profile.secondary ?? ''}`, pairs);
    text(profile.title, 200); text(profile.summary, 2000); text(profile.nextStep, 1000);
    for (const key of ['strengths', 'attentionPoints']) for (const item of list(profile[key], 1, 5)) text(item, 500);
  }
  return input as DimensionDraft;
}

export type DimensionPreviewStatus = 'INSUFFICIENT_DATA' | 'PRIMARY_TIE' | 'SECONDARY_TIE' | 'SINGLE' | 'PAIR';
export type DimensionPreview = typeof DIMENSION_DRAFT_ALGORITHM & {
  educationalOnly: true; reviewState: 'UNREVIEWED'; status: DimensionPreviewStatus; scores: Record<string, number>;
  informativeAnswers: number; primary: string | null; secondary: string | null; tiedDimensions: string[]; profile: DimensionProfile | null;
};

/** Stateless candidate calculation. No patient lifecycle, approval, persistence or clinical claim. */
export function previewDimensionDraft(input: unknown, rawAnswers: unknown): DimensionPreview {
  const structure = validateDimensionDraft(input);
  const fail = (): never => { throw new AssessmentAnswerError('ASSESSMENT_ANSWERS_INVALID', 'Synthetic preview answers do not match the draft questions.'); };
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) fail();
  const answers = rawAnswers as Row;
  const questions = structure.sections.flatMap(section => section.questions);
  const questionIds = new Set(questions.map(question => question.id));
  if (Object.keys(answers).some(key => !questionIds.has(key))) fail();
  const scores = Object.fromEntries(structure.scoring.dimensions.map(dimension => [dimension.id, 0]));
  let informativeAnswers = 0;
  for (const question of questions) {
    const supplied = Object.prototype.hasOwnProperty.call(answers, question.id);
    if (!supplied) { if (question.required) fail(); continue; }
    const option = question.options.find(item => item.id === answers[question.id]);
    if (!option) fail();
    if (Object.values(option!.scores).some(value => value > 0)) informativeAnswers++;
    for (const [dimension, value] of Object.entries(option!.scores)) scores[dimension] = scores[dimension]! + value;
  }
  const result: DimensionPreview = { ...DIMENSION_DRAFT_ALGORITHM, educationalOnly: true, reviewState: 'UNREVIEWED', status: 'INSUFFICIENT_DATA', scores, informativeAnswers, primary: null, secondary: null, tiedDimensions: [], profile: null };
  if (informativeAnswers < structure.scoring.minInformativeAnswers) return result;
  const ranked = Object.entries(scores).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return result;
  const leaders = ranked.filter(([, value]) => value === ranked[0]![1]);
  if (leaders.length > 1) return { ...result, status: 'PRIMARY_TIE', tiedDimensions: leaders.map(([key]) => key).sort() };
  result.primary = leaders[0]![0];
  const remaining = ranked.filter(([key]) => key !== result.primary);
  const runners = remaining.filter(([, value]) => value === remaining[0]![1]);
  if (runners.length > 1) return { ...result, status: 'SECONDARY_TIE', tiedDimensions: runners.map(([key]) => key).sort() };
  result.secondary = runners[0]?.[0] ?? null;
  result.status = result.secondary ? 'PAIR' : 'SINGLE';
  result.profile = structure.resultProfiles.find(profile => profile.primary === result.primary && profile.secondary === result.secondary)!;
  return result;
}
