// Preserve the questionnaire author's existing hash encoding for all review consumers.
export const canonicalAssessmentJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalAssessmentJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${canonicalAssessmentJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
