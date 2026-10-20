import { countQuestions, identifier, row, rows, text, type Row } from './assessment-authoring';

export function createMizajTieBreakDraft(source: Row): Row {
  const copy = structuredClone(source);
  return { ...copy, schemaVersion: 3, scoring: { ...row(copy.scoring), algorithmId: 'DIMENSION_TIEBREAK', algorithmVersion: 1 }, followUps: [] };
}

export const candidateKey = (ids: string[]) => [...ids].sort().join(':');
export function tieCases(ids: string[]): string[][] {
  const result: string[][] = [];
  for (let mask = 1; mask < 1 << ids.length; mask++) {
    const selected = ids.filter((_, index) => mask & 1 << index);
    if (selected.length >= 2) result.push(selected);
  }
  return result.sort((a, b) => a.length - b.length);
}

export function newFollowUp(tiedDimensions: string[]): Row {
  return { id: identifier('followup'), title: '', tiedDimensions, options: [...tiedDimensions.map(dimensionId => ({ id: identifier('option'), title: '', dimensionId })), { id: identifier('option'), title: 'نمی‌دانم / هیچ‌کدام', dimensionId: null }] };
}

export function validateMizajAuthoring(structure: Row): string[] {
  const issues: string[] = [];
  const dimensions = rows(row(structure.scoring).dimensions).map(item => text(item.id));
  const questions = rows(structure.sections).flatMap(section => rows(section.questions));
  if (dimensions.length !== 4 || countQuestions(structure) !== 11) issues.push('این مدل دقیقاً چهار گرایش و ۱۱ سؤال اصلی دارد.');
  const contributing = questions.filter(question => rows(question.options).some(option => Object.values(row(option.scores)).some(value => value === 1))).length;
  const minimum = row(structure.scoring).minInformativeAnswers;
  if (!Number.isSafeInteger(minimum) || Number(minimum) < 1 || Number(minimum) > contributing) issues.push('حداقل پاسخ مرتبط باید بین یک و تعداد سؤال‌های مؤثر در نتیجه باشد.');
  if (dimensions.some(id => !questions.some(question => rows(question.options).some(option => row(option.scores)[id] === 1)))) issues.push('برای هر گرایش باید حداقل یک پاسخ مرتبط در سؤال‌های اصلی وجود داشته باشد.');
  for (const question of questions) {
    if (question.required !== true || rows(question.options).length !== 4) issues.push('هر سؤال اصلی باید اجباری و دارای چهار پاسخ باشد.');
    for (const option of rows(question.options)) if (Object.keys(row(option.scores)).length > 1 || Object.entries(row(option.scores)).some(([id, value]) => !dimensions.includes(id) || value !== 1)) issues.push('هر پاسخ اصلی به یک گرایش مرتبط است یا فقط اطلاعاتی است؛ وزن دلخواه در این مدل وجود ندارد.');
  }
  const seen = new Set<string>();
  const ids = new Set([...rows(structure.sections), ...questions].map(item => text(item.id)));
  const followUps = rows(structure.followUps);
  if (followUps.length > 11) issues.push('حداکثر یک سؤال برای هر ترکیب تساوی مجاز است.');
  for (const question of followUps) {
    const candidates = Array.isArray(question.tiedDimensions) ? question.tiedDimensions as string[] : [];
    const key = candidateKey(candidates);
    if (candidates.length < 2 || candidates.length > 4 || new Set(candidates).size !== candidates.length || candidates.some(id => !dimensions.includes(id)) || seen.has(key)) issues.push('ترکیب تساوی نامعتبر یا تکراری است.');
    seen.add(key);
    if (!text(question.id) || ids.has(text(question.id)) || !text(question.title).trim() || text(question.title).length > 1000) issues.push('متن یا شناسهٔ سؤال رفع تساوی کامل نیست.');
    ids.add(text(question.id));
    const options = rows(question.options); const optionIds = new Set<string>();
    if (options.length < 2 || options.length > 5) issues.push('سؤال رفع تساوی باید بین دو تا پنج پاسخ داشته باشد.');
    for (const option of options) {
      if (!text(option.id) || optionIds.has(text(option.id)) || !text(option.title).trim() || text(option.title).length > 1500) issues.push('متن یا شناسهٔ پاسخ‌های رفع تساوی کامل نیست.');
      optionIds.add(text(option.id));
      if (option.dimensionId !== null && !candidates.includes(text(option.dimensionId))) issues.push('پاسخ رفع تساوی باید به یکی از همان گرایش‌ها مربوط باشد یا بدون تفکیک باشد.');
    }
    if (candidates.some(id => !options.some(option => option.dimensionId === id))) issues.push('برای هر گرایش در ترکیب تساوی، حداقل یک پاسخ مرتبط لازم است.');
  }
  return [...new Set(issues)];
}
