import { describe, expect, it } from 'vitest';
import { candidateKey, createMizajTieBreakDraft, newFollowUp, tieCases, validateMizajAuthoring, validateMizajPublication } from './mizaj-authoring';
import { row, rows } from './assessment-authoring';

describe('Mizaj authoring contract', () => {
  it('creates a separate 11+1 draft without mutating or relabeling the original object', () => {
    const source = { schemaVersion: 2, scoring: { algorithmId: 'DIMENSION_RANK', algorithmVersion: 1 }, sections: [], source: { sha256: 'original' } };
    const before = structuredClone(source); const draft = createMizajTieBreakDraft(source);
    expect(source).toEqual(before);
    expect(draft.schemaVersion).toBe(3);
    expect(row(draft.scoring).algorithmId).toBe('DIMENSION_TIEBREAK');
    expect(draft.followUps).toEqual([]);
  });
  it('has six pair cases and distinct exact cases for all larger ties', () => {
    const cases = tieCases(['a', 'b', 'c', 'd']);
    expect(cases.filter(item => item.length === 2)).toHaveLength(6);
    expect(cases).toHaveLength(11);
    expect(candidateKey(['a', 'b'])).toBe(candidateKey(['b', 'a']));
  });
  it('requires every pair-case question for publication while keeping draft saves possible', () => {
    const dimensions = ['a', 'b', 'c', 'd'].map(id => ({ id, title: id }));
    const structure = { schemaVersion: 3, scoring: { dimensions }, sections: [], followUps: [] as unknown[] };
    expect(validateMizajPublication(structure).filter(issue => issue.startsWith('سؤال رفع تساوی «'))).toHaveLength(6);
    structure.followUps = tieCases(dimensions.map(item => item.id)).filter(ids => ids.length === 2).map(ids => newFollowUp([...ids].reverse()));
    expect(validateMizajPublication(structure).filter(issue => issue.startsWith('سؤال رفع تساوی «'))).toHaveLength(0);
    // Missing text is still rejected; defining a case never invents a question or approval.
    expect(validateMizajPublication(structure).length).toBeGreaterThan(0);
  });
  it('does not fabricate the missing clinical question or answers', () => {
    const question = newFollowUp(['a', 'b']);
    expect(question.title).toBe('');
    expect(rows(question.options).slice(0, 2).map(item => item.title)).toEqual(['', '']);
    expect(rows(question.options).at(-1)?.dimensionId).toBeNull();
    expect(validateMizajAuthoring({ schemaVersion: 3, sections: [], followUps: [question] }).length).toBeGreaterThan(0);
  });
});
