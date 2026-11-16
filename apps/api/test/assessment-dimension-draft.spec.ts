import { describe, expect, it } from 'vitest';
import { previewDimensionDraft, validateDimensionDraft, type DimensionDraft } from '../src/modules/assessments/domain/assessment-dimension-draft';
import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { validateAssessmentStructure } from '../src/modules/assessments/domain/assessment-structure-validation';

const draft = (): DimensionDraft => structuredClone(MIZAJ_DRAFT_PRESET.structure);
const dimensionIds = ['DAMAVI', 'SAFRAVI', 'BALGHAMI', 'SODAVI'];
const questions = () => draft().sections.flatMap(section => section.questions);
const answers = (selected: string[] = Array.from({ length: 11 }, () => 'DAMAVI')) => Object.fromEntries(questions().map((question, index) => [question.id, `o${dimensionIds.indexOf(selected[index]!) + 1}`]));

describe('bounded unreviewed dimension drafts', () => {
  it('preserves the owner-designated 11 questions/44 options and exposes no runtime approval', () => {
    const value = validateDimensionDraft(draft());
    expect(value.sections.flatMap(s => s.questions)).toHaveLength(11);
    expect(value.sections.flatMap(s => s.questions.flatMap(q => q.options))).toHaveLength(44);
    for (const question of value.sections.flatMap(section => section.questions)) {
      question.options.forEach((option, index) => expect(option.scores).toEqual({ [dimensionIds[index]!]: 1 }));
    }
    expect(value.source.sha256).toBe('810249629f4a7df0a2bc950f2e47a65ddb27cd5fcd1b977e0f2ecc2e6b0020f6');
    expect(value.resultProfiles).toHaveLength(16);
    expect(() => validateAssessmentStructure(value, true)).toThrow();
    expect(() => validateAssessmentStructure({ ...value, schemaVersion: 1 }, true)).toThrow();
  });

  for (const profile of MIZAJ_DRAFT_PRESET.structure.resultProfiles) {
    it(`selects the exact display profile ${profile.id} without inventing second evidence`, () => {
      const selected = Array.from({ length: 11 }, (_, index) => profile.secondary && index >= 6 ? profile.secondary : profile.primary);
      expect(previewDimensionDraft(draft(), answers(selected))).toMatchObject({ status: profile.secondary ? 'PAIR' : 'SINGLE', primary: profile.primary, secondary: profile.secondary, profile });
    });
  }

  it('scores every main question and still supports explicitly neutral answers', () => {
    const selected = ['DAMAVI', 'DAMAVI', 'DAMAVI', 'DAMAVI', 'SAFRAVI', 'SAFRAVI', 'SAFRAVI', 'BALGHAMI', 'BALGHAMI', 'SODAVI', 'SODAVI'];
    expect(previewDimensionDraft(draft(), answers(selected))).toMatchObject({ informativeAnswers: 11, scores: { DAMAVI: 4, SAFRAVI: 3, BALGHAMI: 2, SODAVI: 2 }, primary: 'DAMAVI', secondary: 'SAFRAVI' });
    const changed = answers(); changed.q2 = 'o4';
    expect(previewDimensionDraft(draft(), changed).scores).toEqual({ DAMAVI: 10, SAFRAVI: 0, BALGHAMI: 0, SODAVI: 1 });
  });
  it('does not resolve primary or secondary ties by configuration order', () => {
    const input = answers(['DAMAVI', 'DAMAVI', 'DAMAVI', 'DAMAVI', 'SAFRAVI', 'SAFRAVI', 'SAFRAVI', 'SAFRAVI', 'BALGHAMI', 'BALGHAMI', 'SODAVI']);
    expect(previewDimensionDraft(draft(), input)).toMatchObject({ status: 'PRIMARY_TIE', primary: null, secondary: null, tiedDimensions: ['DAMAVI', 'SAFRAVI'], profile: null });
    const reordered = draft(); reordered.scoring.dimensions.reverse();
    expect(previewDimensionDraft(reordered, input)).toEqual(previewDimensionDraft(draft(), input));
    expect(previewDimensionDraft(draft(), answers(['DAMAVI', 'DAMAVI', 'DAMAVI', 'DAMAVI', 'DAMAVI', 'SAFRAVI', 'SAFRAVI', 'SAFRAVI', 'BALGHAMI', 'BALGHAMI', 'BALGHAMI']))).toMatchObject({ status: 'SECONDARY_TIE', primary: 'DAMAVI', secondary: null, tiedDimensions: ['BALGHAMI', 'SAFRAVI'], profile: null });
  });
  it('treats explicit neutral answers as insufficient evidence, not a forced profile', () => {
    const value = draft(); for (const q of value.sections[0]!.questions) q.options.push({ id: 'neutral', title: 'هیچ‌کدام', scores: {} });
    const input = Object.fromEntries(value.sections[0]!.questions.map(q => [q.id, 'neutral']));
    expect(previewDimensionDraft(value, input)).toMatchObject({ status: 'INSUFFICIENT_DATA', informativeAnswers: 0, primary: null, secondary: null, profile: null });
    input.q1 = 'o1';
    expect(previewDimensionDraft(value, input)).toMatchObject({ status: 'INSUFFICIENT_DATA', informativeAnswers: 1, primary: null });
  });
  it('validates all answer keys and chosen option IDs, including nonscoring questions', () => {
    for (const input of [null, [], { ...answers(), q1: null }, { ...answers(), q6: 'bad' }, { ...answers(), patientId: 'foreign' }, {}]) expect(() => previewDimensionDraft(draft(), input)).toThrow();
    const value = draft(); value.sections[0]!.questions[0]!.required = false;
    const input = answers(); delete input.q1;
    expect(previewDimensionDraft(value, input)).toMatchObject({ status: 'SINGLE', informativeAnswers: 10 });
  });
  it.each([
    ['unknown dimension', (v: any) => { v.sections[0].questions[0].options[0].scores = { UNKNOWN: 1 }; }],
    ['fractional weight', (v: any) => { v.sections[0].questions[0].options[0].scores = { DAMAVI: 0.5 }; }],
    ['negative weight', (v: any) => { v.sections[0].questions[0].options[0].scores = { DAMAVI: -1 }; }],
    ['unsafe weight', (v: any) => { v.sections[0].questions[0].options[0].scores = { DAMAVI: 1001 }; }],
    ['duplicate question', (v: any) => { v.sections[0].questions[1].id = 'q1'; }],
    ['duplicate option', (v: any) => { v.sections[0].questions[0].options[1].id = 'o1'; }],
    ['duplicate dimension', (v: any) => { v.scoring.dimensions[1].id = 'DAMAVI'; }],
    ['duplicate profile', (v: any) => { v.resultProfiles[1] = v.resultProfiles[0]; }],
    ['missing profile', (v: any) => { v.resultProfiles.pop(); }],
    ['repeated primary as secondary', (v: any) => { v.resultProfiles[0].secondary = 'DAMAVI'; }],
    ['unattainable threshold', (v: any) => { v.scoring.minInformativeAnswers = 12; }],
    ['zero threshold', (v: any) => { v.scoring.minInformativeAnswers = 0; }],
    ['unsupported algorithm', (v: any) => { v.scoring.algorithmVersion = 2; }],
    ['fabricated approval', (v: any) => { v.reviewState = 'APPROVED'; }],
    ['unknown property', (v: any) => { v.clinicalFact = true; }],
    ['scalar scoring', (v: any) => { v.sections[0].questions[0].options[0].score = 1; }],
    ['range scoring', (v: any) => { v.resultBands = [{ minInclusive: 0 }]; }],
    ['overlong content', (v: any) => { v.resultProfiles[0].summary = 'x'.repeat(2001); }],
    ['prototype identifier', (v: any) => { v.scoring.dimensions[0].id = 'constructor'; }],
    ['invalid secondary type', (v: any) => { v.resultProfiles[0].secondary = { toString: 'x' }; }],
  ])('rejects %s before draft persistence', (_name, change) => { const value = draft(); change(value); expect(() => validateDimensionDraft(value)).toThrow(); });
  it('never mutates the preset, definition or supplied answers', () => {
    const value = draft(), input = answers(), original = structuredClone({ value, input });
    previewDimensionDraft(value, input); expect({ value, input }).toEqual(original);
  });
});
