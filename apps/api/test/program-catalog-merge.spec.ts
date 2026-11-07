import { describe, expect, it } from 'vitest';
import { CONTENT_FIELDS, mergeDraft } from '../src/modules/programs/catalog/catalog-merge';

describe('three-way program source sync', () => {
  it('accepts source edits when the dashboard still matches the last import', () => {
    expect(mergeDraft({ body: 'old' }, { body: 'old' }, { body: 'new' }, CONTENT_FIELDS)).toMatchObject({ draft: { body: 'new' }, conflicts: [], changed: true });
  });
  it('retains manual edits when the source did not change', () => {
    expect(mergeDraft({ body: 'old' }, { body: 'manual' }, { body: 'old' }, CONTENT_FIELDS)).toMatchObject({ draft: { body: 'manual' }, conflicts: [], changed: false });
  });
  it('does not guess a winner when both sides changed differently', () => {
    expect(mergeDraft({ body: 'old' }, { body: 'manual' }, { body: 'source' }, CONTENT_FIELDS)).toMatchObject({ draft: { body: 'manual' }, conflicts: ['body'] });
  });
  it('accepts already-converged edits and distinguishes deletion from no change', () => {
    expect(mergeDraft({ summary: 'old' }, { summary: 'new' }, { summary: 'new' }, CONTENT_FIELDS).conflicts).toEqual([]);
    expect(mergeDraft({ summary: 'old' }, { summary: 'old' }, {}, CONTENT_FIELDS).draft).toEqual({});
  });
  it('protects an existing manual service with no baseline', () => {
    expect(mergeDraft({}, { body: 'manual' }, { body: 'source' }, CONTENT_FIELDS).conflicts).toEqual(['body']);
  });
  it('honours explicit per-field choices', () => {
    const baseline = { title: 'old', body: 'old' }, current = { title: 'manual', body: 'manual' }, source = { title: 'source', body: 'source' };
    expect(mergeDraft(baseline, current, source, CONTENT_FIELDS, { title: 'SOURCE', body: 'DASHBOARD' })).toMatchObject({ conflicts: [], draft: { title: 'source', body: 'manual' } });
  });
  it('does not import administrative classification during normal sync', () => {
    expect(mergeDraft({ category: 'old', audience: 'SHARED', pairs: [] }, { category: 'manual', audience: 'FEMALE', pairs: [] }, { category: 'new', audience: 'MALE', pairs: ['damavi/damavi'] }, CONTENT_FIELDS).draft).toEqual({ category: 'manual', audience: 'FEMALE', pairs: [] });
  });
});
