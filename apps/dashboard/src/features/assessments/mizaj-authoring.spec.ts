import { describe, expect, it } from 'vitest';
import { candidateKey, createMizajTieBreakDraft, newFollowUp, tieCases, validateMizajAuthoring } from './mizaj-authoring';
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
  it('does not fabricate the missing clinical question or answers', () => {
    const question = newFollowUp(['a', 'b']);
    expect(question.title).toBe('');
    expect(rows(question.options).slice(0, 2).map(item => item.title)).toEqual(['', '']);
    expect(rows(question.options).at(-1)?.dimensionId).toBeNull();
    expect(validateMizajAuthoring({ schemaVersion: 3, sections: [], followUps: [question] }).length).toBeGreaterThan(0);
  });
});
