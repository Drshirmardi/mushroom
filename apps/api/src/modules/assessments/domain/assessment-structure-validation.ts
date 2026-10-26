export class AssessmentStructureError extends Error {}
type Value = Record<string, unknown>;
const fail = (): never => { throw new AssessmentStructureError('Assessment structure is invalid for the supported scoring engine.'); };
const object = (value: unknown): Value => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Value : fail();
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const id = (value: unknown): string => typeof value === 'string' && value.trim() === value && value.length > 0 ? value : fail();
const optionalBounds = (item: Value, min: string, max: string, exclusive: boolean) => {
  if (item[min] !== undefined && !number(item[min]) || item[max] !== undefined && !number(item[max])) fail();
  if (number(item[min]) && number(item[max]) && (exclusive ? item[min] >= item[max] : item[min] > item[max])) fail();
};
const ranges = (input: unknown, bands: boolean) => {
  if (!Array.isArray(input) || bands && input.length === 0) fail();
  const rows = (input as unknown[]).map(object);
  const ids = new Set<string>();
  for (const item of rows) {
    if (!number(item.minInclusive)) fail();
    optionalBounds(item, 'minInclusive', 'maxExclusive', true);
    if (bands) {
      const key = id(item.id); if (ids.has(key)) fail(); ids.add(key);
      if (typeof item.title !== 'string' || !item.title.trim()) fail();
      if (item.requiresReview !== undefined && typeof item.requiresReview !== 'boolean') fail();
      if (item.riskLevel !== undefined && !['NONE', 'LOW', 'MODERATE', 'HIGH'].includes(item.riskLevel as string)) fail();
    } else if (!number(item.score)) fail();
  }
  const sorted = [...rows].sort((a, b) => (a.minInclusive as number) - (b.minInclusive as number));
  for (let i = 1; i < sorted.length; i++) {
    const previousMax = sorted[i - 1].maxExclusive;
    if (previousMax === undefined || (sorted[i].minInclusive as number) < (previousMax as number)) fail();
  }
};

/** Validates syntax for the existing engine; does not establish clinical validity or invent weights. */
export function validateAssessmentStructure(input: unknown, forPublication = false): void {
  const structure = object(input);
  if (structure.schemaVersion !== 1 || !Array.isArray(structure.sections)) fail();
  const ids = new Set<string>();
  let questionCount = 0;
  const unique = (value: unknown) => { const key = id(value); if (ids.has(key)) fail(); ids.add(key); };
  for (const rawSection of structure.sections as unknown[]) {
    const section = object(rawSection); unique(section.id);
    if (!Array.isArray(section.questions)) fail();
    for (const rawQuestion of section.questions as unknown[]) {
      const question = object(rawQuestion); unique(question.id); questionCount++;
      if (typeof question.required !== 'boolean') fail();
      switch (question.type) {
        case 'BOOLEAN': if (!number(question.trueScore) || !number(question.falseScore)) fail(); break;
        case 'TEXT': if (!Number.isInteger(question.maxLength) || (question.maxLength as number) <= 0) fail(); break;
        case 'NUMBER':
          optionalBounds(question, 'min', 'max', false);
          if (question.scoreRanges !== undefined) ranges(question.scoreRanges, false);
          break;
        case 'SINGLE_CHOICE': case 'MULTIPLE_CHOICE': {
          if (!Array.isArray(question.options) || question.options.length === 0) fail();
          const options = new Set<string>();
          for (const rawOption of question.options as unknown[]) {
            const option = object(rawOption); const key = id(option.id);
            if (options.has(key) || !number(option.score)) fail(); options.add(key);
          }
          break;
        }
        default: fail();
      }
    }
  }
  if (forPublication && questionCount === 0) fail();
  if (structure.resultBands !== undefined) ranges(structure.resultBands, true);
}
