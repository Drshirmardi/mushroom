import { isDeepStrictEqual } from 'node:util';

export const SOURCE_FIELDS = ['title', 'summary', 'body', 'eligibilityDescription', 'safety', 'category', 'audience', 'pairs'] as const;
export type SourceField = typeof SOURCE_FIELDS[number];
export const CONTENT_FIELDS: SourceField[] = ['title', 'summary', 'body', 'eligibilityDescription', 'safety'];
export type Draft = Partial<Record<SourceField, unknown>>;
export type Resolution = Partial<Record<SourceField, 'SOURCE' | 'DASHBOARD'>>;

/** Missing baseline is never evidence that a dashboard value can be overwritten. */
export function mergeDraft(baseline: Draft, current: Draft, source: Draft, fields: SourceField[], resolutions: Resolution = {}) {
  const draft = { ...current };
  const conflicts: SourceField[] = [];
  for (const field of fields) {
    if (resolutions[field] === 'SOURCE') draft[field] = source[field];
    else if (resolutions[field] === 'DASHBOARD') continue;
    else if (isDeepStrictEqual(source[field], baseline[field])) continue;
    else if (isDeepStrictEqual(current[field], baseline[field]) || isDeepStrictEqual(current[field], source[field])) draft[field] = source[field];
    else conflicts.push(field);
    if (draft[field] === undefined) delete draft[field];
  }
  return { draft, conflicts, changed: !isDeepStrictEqual(current, draft) };
}
