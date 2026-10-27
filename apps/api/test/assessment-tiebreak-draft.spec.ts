import { describe, expect, it } from 'vitest';
import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { previewTieBreakDraft, projectTieBreakQuestionnaire, TIEBREAK_ALGORITHM, validateTieBreakAnswers, validateTieBreakPublication, validateTieBreakDraft, type TieBreakDraft } from '../src/modules/assessments/domain/assessment-tiebreak-draft';
import { validateAssessmentStructure } from '../src/modules/assessments/domain/assessment-structure-validation';
import { ASSESSMENT_STRUCTURE_MAX_BYTES, QUESTION_TEXT_MAX_LENGTH, validateDimensionDraft } from '../src/modules/assessments/domain/assessment-dimension-draft';

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
  it.each(['', ' ', '\n', '\r\n', '\t'])('accepts the pasted owner question with surrounding whitespace %j without changing content', whitespace => {
    const value = draft(); addQuestion(value, [0, 1]);
    const sentence = 'آیا میزان علاقمندی شما به خوردن شیرینی بیشتر است یا ترشی؟';
    value.followUps[0]!.title = `${whitespace}${sentence}${whitespace}`;
    value.sections[0]!.questions[0]!.title = `${whitespace}${sentence}${whitespace}`;
    value.followUps[0]!.options[0]!.title = `${whitespace}پاسخ${whitespace}`;
    value.resultProfiles[0]!.summary = `${whitespace}توضیح نتیجه${whitespace}`;
    const before = structuredClone(value);
    expect(validateTieBreakDraft(value)).toEqual(before);
    expect(value).toEqual(before);
  });
  it.each(['', ' ', '\n\t\r\n'])('still rejects blank-only question text %j', title => {
    const value = draft(); addQuestion(value, [0, 1]);
    value.followUps[0]!.title = title;
    expect(() => validateTieBreakDraft(value)).toThrow();
    value.followUps[0]!.title = 'سؤال';
    value.sections[0]!.questions[0]!.title = title;
    expect(() => validateTieBreakDraft(value)).toThrow();
  });
  it.each([' ', '\n', '\r\n', '\t'])('keeps whitespace invalid in main and follow-up identifiers %j', whitespace => {
    const value = draft(); addQuestion(value, [0, 1]);
    const main = value.sections[0]!.questions[0]!;
    const before = main.id;
    main.id += whitespace;
    expect(() => validateTieBreakDraft(value)).toThrow();
    main.id = before;
    value.followUps[0]!.id += whitespace;
    expect(() => validateTieBreakDraft(value)).toThrow();
  });
  it('preserves the source draft, requires eleven main questions and cannot use the scalar publisher', () => {
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

describe('11+1 publication and patient projection', () => {
  it('accepts long Persian main and follow-up questions through draft, publication and patient projection', () => {
    const value = draft();
    const longText = 'س'.repeat(QUESTION_TEXT_MAX_LENGTH);
    for (const section of value.sections) for (const question of section.questions) question.title = longText;
    for (let first = 0; first < 4; first++) for (let second = first + 1; second < 4; second++) {
      addQuestion(value, [first, second]);
      Object.assign(value.followUps.at(-1)!, { id: `long${first}${second}`, title: longText });
    }
    expect(Buffer.byteLength(JSON.stringify(value), 'utf8')).toBeGreaterThan(131072);
    expect(validateTieBreakDraft(value)).toBe(value);
    expect(validateTieBreakPublication(value)).toBe(value);
    const payload = answers(value, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3]);
    const projection = projectTieBreakQuestionnaire(value, payload);
    expect(projection.sections.flatMap(section => section.questions)).toHaveLength(12);
    expect(projection.sections.flatMap(section => section.questions).every(question => question.text === longText)).toBe(true);
    value.sections[0]!.questions[0]!.title += 'س';
    expect(() => validateTieBreakDraft(value)).toThrow();
    value.sections[0]!.questions[0]!.title = longText;
    value.followUps[0]!.title += 'س';
    expect(() => validateTieBreakPublication(value)).toThrow();
  });
  it('keeps a total byte budget for Persian content and supports long legacy dimension questions', () => {
    const legacy = structuredClone(MIZAJ_DRAFT_PRESET.structure);
    for (const question of legacy.sections[0]!.questions) question.title = 'س'.repeat(QUESTION_TEXT_MAX_LENGTH);
    expect(validateDimensionDraft(legacy)).toBe(legacy);
    const value = draft();
    for (const ids of [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3], [0, 1, 2, 3]]) {
      addQuestion(value, ids);
      Object.assign(value.followUps.at(-1)!, { id: `large${value.followUps.length}`, title: 'س'.repeat(QUESTION_TEXT_MAX_LENGTH) });
    }
    for (const question of value.sections[0]!.questions) question.title = 'س'.repeat(QUESTION_TEXT_MAX_LENGTH);
    expect(Buffer.byteLength(JSON.stringify(value), 'utf8')).toBeGreaterThan(ASSESSMENT_STRUCTURE_MAX_BYTES);
    expect(() => validateTieBreakDraft(value)).toThrow();
  });
  it('requires all six distinct pair cases before allowing physician publication review', () => {
    const value = draft();
    expect(() => validateTieBreakPublication(value)).toThrow();
    for (let first = 0; first < 4; first++) for (let second = first + 1; second < 4; second++) {
      addQuestion(value, [first, second]);
      value.followUps.at(-1)!.id = `clarify${first}${second}`;
    }
    expect(validateTieBreakPublication(value)).toBe(value);
    value.followUps.pop();
    expect(() => validateTieBreakPublication(value)).toThrow();
  });
  it('allows partial saves but rejects unknown, invalid and premature follow-up answers', () => {
    const value = draft(); addQuestion(value, [0, 1]);
    const q = value.sections[0]!.questions[0]!;
    const partial = { [q.id]: q.options[0]!.id };
    expect(validateTieBreakAnswers(value, partial)).toEqual(partial);
    for (const payload of [{ ...partial, clarify: 'choice0' }, { ...partial, unknown: 'answer' }, { [q.id]: 'missing' }]) {
      expect(() => validateTieBreakAnswers(value, payload)).toThrow();
    }
  });
  it('exposes only the exact selected question, retains it after save, and never exposes answer keys', () => {
    const value = draft(); addQuestion(value, [0, 1]);
    const payload = answers(value, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3]);
    expect(projectTieBreakQuestionnaire(value, {}).sections.flatMap(s => s.questions)).toHaveLength(11);
    for (const saved of [payload, { ...payload, clarify: 'choice0' }]) {
      const projection = projectTieBreakQuestionnaire(value, saved);
      const questions = projection.sections.flatMap(s => s.questions);
      expect(questions).toHaveLength(12);
      expect(questions.at(-1)).toMatchObject({ id: 'clarify', phase: 'FOLLOW_UP' });
      expect(projection).not.toHaveProperty('scoring');
      expect(projection).not.toHaveProperty('resultProfiles');
      expect(JSON.stringify(projection)).not.toContain('dimensionId');
      expect(JSON.stringify(projection)).not.toContain('scores');
    }
    const noTie = answers(value, Array(11).fill(0));
    expect(projectTieBreakQuestionnaire(value, noTie).sections.flatMap(s => s.questions)).toHaveLength(11);
    expect(() => projectTieBreakQuestionnaire(value, { ...noTie, clarify: 'choice0' })).toThrow();
  });
});
