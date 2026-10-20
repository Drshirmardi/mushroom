import { describe, expect, it } from 'vitest';
import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { previewTieBreakDraft, TIEBREAK_ALGORITHM, validateTieBreakDraft, type TieBreakDraft } from '../src/modules/assessments/domain/assessment-tiebreak-draft';
import { validateAssessmentStructure } from '../src/modules/assessments/domain/assessment-structure-validation';

function draft(): TieBreakDraft {
  const base = structuredClone(MIZAJ_DRAFT_PRESET.structure);
  for (const section of base.sections) for (const question of section.questions) {
    question.options.forEach((option, index) => { option.scores = { [base.scoring.dimensions[index]!.id]: 1 }; });
  }
  return { ...base, schemaVersion: 3, scoring: { ...base.scoring, ...TIEBREAK_ALGORITHM, minInformativeAnswers: 1 }, followUps: [] };
}
const answers = (value: TieBreakDraft, selected: number[]) => Object.fromEntries(value.sections.flatMap(section => section.questions).map((question, index) => [question.id, question.options[selected[index]!]!.id]));
function addQuestion(value: TieBreakDraft, candidates: number[]) {
  const ids = candidates.map(index => value.scoring.dimensions[index]!.id);
  value.followUps.push({ id: 'clarify', title: 'Synthetic distinction, not clinical content', tiedDimensions: ids, options: [...ids.map((dimensionId, index) => ({ id: `choice${index}`, title: `Synthetic ${index}`, dimensionId })), { id: 'unknown', title: 'Cannot distinguish', dimensionId: null }] });
}

describe('11 main answers plus at most one exact tie-break draft', () => {
  it('preserves the source draft, requires eleven main questions and stays unpublishable', () => {
    const value = draft(); const before = structuredClone(value);
    expect(validateTieBreakDraft(value)).toEqual(before);
    expect(value).toEqual(before);
    expect(() => validateAssessmentStructure(value, true)).toThrow();
    value.sections[0]!.questions.pop();
    expect(() => validateTieBreakDraft(value)).toThrow();
  });
  it('does not ask a follow-up without a tie and rejects an injected answer', () => {
    const value = draft(); addQuestion(value, [0, 1]);
    const payload = answers(value, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(previewTieBreakDraft(value, payload)).toMatchObject({ status: 'SINGLE', followUp: null, followUpUsed: false, secondary: null });
    expect(() => previewTieBreakDraft(value, { ...payload, clarify: 'choice0' })).toThrow();
  });
  it('selects the exact two-way primary tie and resolves order without changing main counts', () => {
    const value = draft(); addQuestion(value, [1, 0]);
    const payload = answers(value, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3]);
    const first = previewTieBreakDraft(value, payload);
    expect(first).toMatchObject({ status: 'FOLLOW_UP_REQUIRED', followUp: { id: 'clarify' }, followUpUsed: false });
    const result = previewTieBreakDraft(value, { ...payload, clarify: 'choice0' });
    expect(result).toMatchObject({ status: 'PAIR', primary: value.scoring.dimensions[1]!.id, secondary: value.scoring.dimensions[0]!.id, followUp: null, followUpUsed: true, tiedDimensions: [] });
    expect(result.scores).toEqual(first.scores);
    expect(() => previewTieBreakDraft(value, { ...payload, clarify: 'choice0', another: 'answer' })).toThrow();
  });
  it('retains the primary and resolves only the tied secondary candidates', () => {
    const value = draft(); addQuestion(value, [1, 2]);
    const payload = answers(value, [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3]);
    expect(previewTieBreakDraft(value, payload)).toMatchObject({ status: 'FOLLOW_UP_REQUIRED', primary: value.scoring.dimensions[0]!.id });
    expect(previewTieBreakDraft(value, { ...payload, clarify: 'choice1' })).toMatchObject({ status: 'PAIR', primary: value.scoring.dimensions[0]!.id, secondary: value.scoring.dimensions[2]!.id });
  });
  it('preserves a tie for a nondistinguishing answer, without asking again', () => {
    const value = draft(); addQuestion(value, [0, 1]);
    const payload = answers(value, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3]);
    expect(previewTieBreakDraft(value, { ...payload, clarify: 'unknown' })).toMatchObject({ status: 'PRIMARY_TIE', primary: null, followUp: null, followUpUsed: true });
  });
  it('never picks a pair from a three-way tie and never asks a second follow-up', () => {
    const value = draft(); addQuestion(value, [0, 1]);
    const payload = answers(value, [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3]);
    expect(previewTieBreakDraft(value, payload)).toMatchObject({ status: 'FOLLOW_UP_UNAVAILABLE', primary: null });
    value.followUps = []; addQuestion(value, [0, 1, 2]);
    expect(previewTieBreakDraft(value, { ...payload, clarify: 'choice0' })).toMatchObject({ status: 'SECONDARY_TIE', primary: value.scoring.dimensions[0]!.id, secondary: null, followUp: null, followUpUsed: true, profile: null });
  });
  it('rejects skipped main questions, invalid choices and duplicate tie-case definitions', () => {
    const value = draft(); addQuestion(value, [0, 1]);
    const payload = answers(value, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3]);
    delete payload[value.sections[0]!.questions[0]!.id];
    expect(() => previewTieBreakDraft(value, payload)).toThrow();
    const complete = answers(value, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3]);
    expect(() => previewTieBreakDraft(value, { ...complete, clarify: 'missing' })).toThrow();
    value.followUps.push({ ...structuredClone(value.followUps[0]!), id: 'another', tiedDimensions: [...value.followUps[0]!.tiedDimensions].reverse() });
    expect(() => validateTieBreakDraft(value)).toThrow();
  });
});
