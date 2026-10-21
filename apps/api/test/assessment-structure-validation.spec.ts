import { describe, expect, it } from 'vitest';
import { AssessmentStructureError, validateAssessmentStructure } from '../src/modules/assessments/domain/assessment-structure-validation';
import { scoreAssessment } from '../src/modules/assessments/domain/assessment-scoring';

const wrap = (question: object) => ({ schemaVersion: 1, sections: [{ id: 's', questions: [{ id: 'q', required: true, ...question }] }] });
describe('questionnaire scoring-structure validation', () => {
  it('validates all supported question types without changing their scoring semantics', () => {
    const input = { schemaVersion: 1, sections: [{ id: 's', questions: [
      { id: 'a', type: 'BOOLEAN', required: true, trueScore: 2, falseScore: 0 },
      { id: 'b', type: 'SINGLE_CHOICE', required: true, options: [{ id: 'one', score: 3 }] },
      { id: 'c', type: 'MULTIPLE_CHOICE', required: false, options: [{ id: 'one', score: -1 }, { id: 'two', score: 4 }] },
      { id: 'd', type: 'NUMBER', required: true, min: 0, max: 10, scoreRanges: [{ minInclusive: 0, maxExclusive: 5, score: 1 }, { minInclusive: 5, score: 2 }] },
      { id: 'e', type: 'TEXT', required: false, maxLength: 200 },
    ] }], resultBands: [{ id: 'one', title: 'Synthetic band', minInclusive: 0, riskLevel: 'NONE', requiresReview: true }] };
    expect(() => validateAssessmentStructure(input, true)).not.toThrow();
    expect(scoreAssessment(input, { a: true, b: 'one', c: ['one', 'two'], d: 8, e: 'Example' })).toMatchObject({ score: 10, resultBand: { id: 'one', requiresReview: true } });
  });
  it.each([
    { type: 'UNKNOWN' }, { type: 'BOOLEAN', trueScore: 1 }, { type: 'BOOLEAN', trueScore: Infinity, falseScore: 0 },
    { type: 'BOOLEAN', trueScore: 1, falseScore: 0, required: 'yes' },
    { type: 'TEXT' }, { type: 'TEXT', maxLength: -1 }, { type: 'TEXT', maxLength: 1.5 },
    { type: 'NUMBER', min: 2, max: 1 }, { type: 'NUMBER', min: NaN },
    { type: 'NUMBER', scoreRanges: [{ minInclusive: 0, score: 1 }, { minInclusive: 1, score: 2 }] },
    { type: 'NUMBER', scoreRanges: [{ minInclusive: 0, maxExclusive: 0, score: 1 }] },
    { type: 'SINGLE_CHOICE', options: [] }, { type: 'SINGLE_CHOICE', options: [{ id: 'one' }] },
    { type: 'MULTIPLE_CHOICE', options: [{ id: 'same', score: 1 }, { id: 'same', score: 2 }] },
    { id: ' q ', type: 'BOOLEAN', trueScore: 1, falseScore: 0 },
  ])('rejects a malformed scoring question %#', question => {
    expect(() => validateAssessmentStructure(wrap(question))).toThrow(AssessmentStructureError);
  });
  it('rejects duplicate ids and ambiguous result bands', () => {
    const input = wrap({ type: 'BOOLEAN', trueScore: 1, falseScore: 0 });
    expect(() => validateAssessmentStructure({ ...input, sections: [...input.sections, ...input.sections] })).toThrow(AssessmentStructureError);
    expect(() => validateAssessmentStructure({ ...input, resultBands: [{ id: 'a', title: 'A', minInclusive: 0, maxExclusive: 4 }, { id: 'b', title: 'B', minInclusive: 3 }] })).toThrow(AssessmentStructureError);
    expect(() => validateAssessmentStructure({ ...input, resultBands: [{ id: 'a', title: 'A', minInclusive: 0, requiresReview: 'yes' }] })).toThrow(AssessmentStructureError);
  });
  it('keeps empty drafts editable and prevents an empty publication', () => {
    const draft = { schemaVersion: 1, sections: [] };
    expect(() => validateAssessmentStructure(draft)).not.toThrow(); expect(() => validateAssessmentStructure(draft, true)).toThrow(AssessmentStructureError);
  });
});
