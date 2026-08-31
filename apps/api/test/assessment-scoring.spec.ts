import { describe, expect, it } from 'vitest';
import { scoreAssessment } from '../src/modules/assessments/domain/assessment-scoring';

const structure = { schemaVersion: 1, sections: [{ id: 's1', questions: [{ id: 'single', type: 'SINGLE_CHOICE', required: true, options: [{ id: 'a', score: 2 }, { id: 'b', score: 5 }] }, { id: 'multi', type: 'MULTIPLE_CHOICE', options: [{ id: 'x', score: 1 }, { id: 'y', score: 3 }] }, { id: 'flag', type: 'BOOLEAN', trueScore: 4, falseScore: 0 }, { id: 'amount', type: 'NUMBER', scoreRanges: [{ minInclusive: 0, maxExclusive: 10, score: 1 }, { minInclusive: 10, score: 6 }] }, { id: 'note', type: 'TEXT', maxLength: 20 }] }], resultBands: [{ id: 'low', title: 'Low', minInclusive: 0, maxExclusive: 10 }, { id: 'high', title: 'High', minInclusive: 10, riskLevel: 'HIGH', requiresReview: true }] };

describe('assessment scoring', () => {
  it('scores every supported answer type deterministically', () => { expect(scoreAssessment(structure, { single: 'b', multi: ['x', 'y'], flag: true, amount: 12, note: 'ok' })).toMatchObject({ score: 19, resultBand: { id: 'high', riskLevel: 'HIGH', requiresReview: true } }); });
  it('rejects missing required, unknown, duplicate, and malformed answers', () => { expect(() => scoreAssessment(structure, { single: 'missing' })).toThrow(/invalid/i); expect(() => scoreAssessment(structure, { single: 'a', multi: ['x', 'x'] })).toThrow(/invalid/i); expect(() => scoreAssessment(structure, { single: 'a', extra: true })).toThrow(/not part/i); });
  it('requires one matching result band when bands are configured', () => { expect(() => scoreAssessment({ ...structure, resultBands: [{ id: 'only', title: 'Only', minInclusive: 50 }] }, { single: 'a' })).toThrow(/result band/i); });
});
