import { QUESTION_TEXT_MAX_LENGTH, countQuestions, identifier, row, rows, text, type Row } from './assessment-authoring';

const DEFAULT_MIZAJ_FOLLOW_UPS: Row[] = [
  {
    id: 'tie_damavi_safravi',
    title: 'آیا میزان علاقمندی شما به خوردن شیرینی بیشتر است یا ترشی؟',
    tiedDimensions: ['DAMAVI', 'SAFRAVI'],
    options: [
      { id: 'tie_damavi_safravi_sweet', title: 'علاقه به خوردن شیرینی دارم', dimensionId: 'DAMAVI' },
      { id: 'tie_damavi_safravi_sour', title: 'علاقه به خوردن ترشی دارم', dimensionId: 'SAFRAVI' },
    ],
  },
  {
    id: 'tie_damavi_balghami',
    title: 'آیا بعد از بیداری از خواب احساس سرحالی دارید یا عدم رفع خستگی ؟',
    tiedDimensions: ['DAMAVI', 'BALGHAMI'],
    options: [
      { id: 'tie_damavi_balghami_fresh', title: 'بعد از بیداری احساس سرحالی دارم', dimensionId: 'DAMAVI' },
      { id: 'tie_damavi_balghami_tired', title: 'بعد از بیداری احساس عدم رفع خستگی دارم', dimensionId: 'BALGHAMI' },
    ],
  },
  {
    id: 'tie_safravi_balghami',
    title: 'میزان اتش شما نسبت به خوردن آب آشامیدنی چقدر است؟',
    tiedDimensions: ['SAFRAVI', 'BALGHAMI'],
    options: [
      { id: 'tie_safravi_balghami_thirsty', title: 'میل زیادی به آشامیدن آب دارم', dimensionId: 'SAFRAVI' },
      { id: 'tie_safravi_balghami_not_thirsty', title: 'میلی به آشامیدن آب ندارم', dimensionId: 'BALGHAMI' },
    ],
  },
  {
    id: 'tie_damavi_sodavi',
    title: 'رنگ پوست یا جسه شما چگونه است ؟',
    tiedDimensions: ['DAMAVI', 'SODAVI'],
    options: [
      { id: 'tie_damavi_sodavi_red', title: 'رنگ پوستی گلگون و قرمزی دارم', dimensionId: 'DAMAVI' },
      { id: 'tie_damavi_sodavi_large', title: 'جسه چاق و هیکلی دارم', dimensionId: 'DAMAVI' },
      { id: 'tie_damavi_sodavi_dark', title: 'رنگ تیره ای دارم', dimensionId: 'SODAVI' },
      { id: 'tie_damavi_sodavi_thin', title: 'جسه ای لاغر دارم', dimensionId: 'SODAVI' },
    ],
  },
  {
    id: 'tie_safravi_sodavi',
    title: 'رنگ صورت شما چگونه است ؟',
    tiedDimensions: ['SAFRAVI', 'SODAVI'],
    options: [
      { id: 'tie_safravi_sodavi_yellow', title: 'رنگ صورتم زرد و یا گندمی است', dimensionId: 'SAFRAVI' },
      { id: 'tie_safravi_sodavi_dark', title: 'رنگ صورتم تیره و یا پرخال است', dimensionId: 'SODAVI' },
    ],
  },
  {
    id: 'tie_balghami_sodavi',
    title: 'میزان علاقمندی شما نسبت به آشامیدن آب چقدر است ؟',
    tiedDimensions: ['BALGHAMI', 'SODAVI'],
    options: [
      { id: 'tie_balghami_sodavi_not_interested', title: 'علاقه به خوردن آب آشامیدنی ندارم', dimensionId: 'BALGHAMI' },
      { id: 'tie_balghami_sodavi_interested', title: 'علاقه زیادی به خوردن آب آشامیدنی دارم', dimensionId: 'SODAVI' },
    ],
  },
];

export function createMizajTieBreakDraft(source: Row): Row {
  const copy = structuredClone(source);
  return { ...copy, schemaVersion: 3, scoring: { ...row(copy.scoring), algorithmId: 'DIMENSION_TIEBREAK', algorithmVersion: 1 }, followUps: structuredClone(DEFAULT_MIZAJ_FOLLOW_UPS) };
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
    if (!text(question.id) || ids.has(text(question.id)) || !text(question.title).trim()) issues.push('متن یا شناسهٔ سؤال رفع تساوی کامل نیست.');
    if (text(question.title).length > QUESTION_TEXT_MAX_LENGTH) issues.push('متن سؤال رفع تساوی حداکثر ۲۰٬۰۰۰ نویسه دارد.');
    ids.add(text(question.id));
    const options = rows(question.options); const optionIds = new Set<string>();
    if (options.length < 2 || options.length > 5) issues.push('سؤال رفع تساوی باید بین دو تا پنج پاسخ داشته باشد.');
    for (const option of options) {
      if (!text(option.id) || optionIds.has(text(option.id)) || !text(option.title).trim() || text(option.title).length > 1500) issues.push('متن یا شناسهٔ پاسخ‌های رفع تساوی کامل نیست.');
      optionIds.add(text(option.id));
      if (option.dimensionId !== null && !candidates.includes(text(option.dimensionId))) issues.push('پاسخ رفع تساوی باید به یکی از همان گرایش‌ها مربوط باشد یا بدون تفکیک باشد.');
    }
    if (!Array.isArray(question.steps) && candidates.some(id => !options.some(option => option.dimensionId === id))) issues.push('برای هر گرایش در ترکیب تساوی، حداقل یک پاسخ مرتبط لازم است.');
  }
  for (const question of followUps) if (Array.isArray(question.steps)) {
    const candidates = question.tiedDimensions as string[];
    if (row(structure.scoring).algorithmVersion !== 2 || candidates.length < 3 || question.steps.length !== candidates.length - 2) issues.push('مسیر مرحله‌ای باید با تعداد گرایش‌ها و نسخهٔ آزمون هماهنگ باشد.');
    let remaining = [...candidates];
    for (const [index, step] of [question, ...rows(question.steps)].entries()) {
      if (!text(step.title).trim() || text(step.title).length > QUESTION_TEXT_MAX_LENGTH || rows(step.options).some(option => !text(option.title).trim() || text(option.title).length > 1500)) issues.push('متن تمام سؤال‌ها و پاسخ‌های مسیر مرحله‌ای را کامل کنید.');
      const options = rows(step.options), decisive = options.filter(option => option.dimensionId !== null);
      if (candidateKey(Array.isArray(step.tiedDimensions) ? step.tiedDimensions as string[] : []) !== candidateKey(remaining) || options.length !== 2 || decisive.length !== (remaining.length === 2 ? 2 : 1) || decisive.some(option => !remaining.includes(text(option.dimensionId)))) issues.push('هر مرحله باید یک گرایش را تعیین کند یا به گرایش‌های باقی‌مانده برسد.');
      if (index > 0) { if (!text(step.id) || ids.has(text(step.id))) issues.push('شناسهٔ سؤال‌های مسیر مرحله‌ای باید یکتا باشد.'); ids.add(text(step.id)); }
      remaining = remaining.filter(id => !decisive.some(option => option.dimensionId === id));
    }
  }
  return [...new Set(issues)];
}


export function validateMizajPublication(structure: Row): string[] {
  const issues = validateMizajAuthoring(structure);
  const dimensions = rows(row(structure.scoring).dimensions);
  const defined = new Set(rows(structure.followUps).map(question => candidateKey(Array.isArray(question.tiedDimensions) ? question.tiedDimensions as string[] : [])));
  for (let first = 0; first < dimensions.length; first++) for (let second = first + 1; second < dimensions.length; second++) {
    if (!defined.has(candidateKey([text(dimensions[first]!.id), text(dimensions[second]!.id)]))) issues.push(`سؤال رفع تساوی «${text(dimensions[first]!.title)} و ${text(dimensions[second]!.title)}» را تکمیل کنید.`);
  }
  return issues;
}
