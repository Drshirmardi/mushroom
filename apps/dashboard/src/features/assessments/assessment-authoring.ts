export type Row = Record<string, unknown>;
export const row = (value: unknown): Row => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
export const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(row) : [];
export const text = (value: unknown) => typeof value === "string" ? value : "";
export const label = (value: Row) => text(value.text) || text(value.title) || text(value.label);
export const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
export const questionTypes = { SINGLE_CHOICE: "تک‌انتخابی", MULTIPLE_CHOICE: "چندانتخابی", BOOLEAN: "بله یا خیر", NUMBER: "عددی", TEXT: "متنی" } as const;
export type QuestionType = keyof typeof questionTypes;
export const countQuestions = (structure: Row) => rows(structure.sections).reduce((total, section) => total + rows(section.questions).length, 0);

export function newQuestion(type: QuestionType, dimension = false): Row {
  const base = { id: identifier("q"), type, required: true, [dimension ? "title" : "text"]: "" };
  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") return { ...base, options: [0, 1].map(() => dimension ? { id: identifier("o"), title: "", scores: {} } : { id: identifier("o"), label: "", score: 0 }) };
  if (type === "BOOLEAN") return { ...base, trueScore: 0, falseScore: 0 };
  if (type === "TEXT") return { ...base, maxLength: 1000 };
  return base;
}

export function move<T>(items: T[], index: number, by: number): T[] {
  const target = index + by;
  if (target < 0 || target >= items.length) return items;
  const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next;
}

export function validateAuthoring(structure: Row): string[] {
  const errors: string[] = [];
  const dimension = structure.schemaVersion === 2 || structure.schemaVersion === 3;
  if (structure.schemaVersion !== 1 && !dimension) return ["نسخهٔ ساختار پشتیبانی نمی‌شود؛ ساختار اصلی حفظ شده است."];
  const sections = rows(structure.sections);
  if (!sections.length || !countQuestions(structure)) errors.push("حداقل یک بخش و یک سؤال لازم است.");
  const ids = new Set<string>();
  const checkId = (value: unknown, subject: string, set = ids) => { if (!text(value).trim() || set.has(text(value))) errors.push(`شناسهٔ تکراری یا خالی در ${subject}.`); set.add(text(value)); };
  const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);
  const ranges = (items: Row[], subject: string, bands = false) => {
    for (const item of items) {
      if (!finite(item.minInclusive) || item.maxExclusive !== undefined && (!finite(item.maxExclusive) || Number(item.maxExclusive) <= Number(item.minInclusive))) errors.push(`حداقل و حداکثر ${subject} معتبر نیست.`);
      if (bands ? !label(item).trim() || !text(item.id).trim() : !finite(item.score)) errors.push(`عنوان، شناسه یا امتیاز ${subject} کامل نیست.`);
    }
    const sorted = [...items].sort((a, b) => Number(a.minInclusive) - Number(b.minInclusive));
    if (sorted.some((item, index) => index > 0 && (sorted[index - 1].maxExclusive === undefined || Number(item.minInclusive) < Number(sorted[index - 1].maxExclusive)))) errors.push(`بازه‌های ${subject} هم‌پوشانی دارند.`);
  };
  for (const [s, section] of sections.entries()) {
    checkId(section.id, `بخش ${s + 1}`);
    if (!text(section.title).trim()) errors.push(`عنوان بخش ${s + 1} خالی است.`);
    for (const [q, question] of rows(section.questions).entries()) {
      const subject = `سؤال ${q + 1} بخش ${s + 1}`;
      checkId(question.id, subject);
      if (!label(question).trim()) errors.push(`متن ${subject} خالی است.`);
      if (typeof question.required !== "boolean" || !(text(question.type) in questionTypes)) errors.push(`نوع یا الزام ${subject} پشتیبانی نمی‌شود.`);
      if (dimension && question.type !== "SINGLE_CHOICE") errors.push("مدل ابعادی فقط سؤال تک‌انتخابی دارد.");
      if (["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(text(question.type))) {
        const options = rows(question.options); const optionIds = new Set<string>();
        if (options.length < 2) errors.push(`${subject} حداقل دو گزینه لازم دارد.`);
        for (const option of options) {
          checkId(option.id, subject, optionIds);
          if (!label(option).trim()) errors.push(`متن گزینه‌های ${subject} کامل نیست.`);
          if (!dimension && !finite(option.score)) errors.push(`امتیاز ${subject} باید عدد متناهی باشد.`);
          if (dimension && Object.values(row(option.scores)).some(value => !Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 1000)) errors.push(`وزن ابعاد ${subject} باید عدد صحیح صفر تا هزار باشد.`);
        }
      }
      if (question.type === "BOOLEAN" && (!finite(question.trueScore) || !finite(question.falseScore))) errors.push(`امتیاز بله و خیر ${subject} لازم است.`);
      if (question.type === "TEXT" && (!Number.isSafeInteger(question.maxLength) || Number(question.maxLength) < 1)) errors.push(`حداکثر طول پاسخ ${subject} باید عدد صحیح مثبت باشد.`);
      if (question.type === "NUMBER") {
        if (question.min !== undefined && !finite(question.min) || question.max !== undefined && !finite(question.max) || finite(question.min) && finite(question.max) && Number(question.min) > Number(question.max)) errors.push(`محدودهٔ پاسخ ${subject} معتبر نیست.`);
        if (question.scoreRanges !== undefined) {
          const numericRanges = rows(question.scoreRanges); ranges(numericRanges, subject);
          const sorted = [...numericRanges].sort((a, b) => Number(a.minInclusive) - Number(b.minInclusive));
          if (sorted.length && (!finite(question.min) || Number(sorted[0].minInclusive) > Number(question.min) || sorted.some((item, index) => index > 0 && Number(item.minInclusive) !== Number(sorted[index - 1].maxExclusive)) || sorted.at(-1)?.maxExclusive !== undefined && (!finite(question.max) || Number(sorted.at(-1)?.maxExclusive) <= Number(question.max)))) errors.push(`بازه‌های امتیاز ${subject} همهٔ پاسخ‌های عددی مجاز را پوشش نمی‌دهند؛ حداقل پاسخ و مرزها را تنظیم کنید.`);
        }
      }
    }
  }
  if (structure.resultBands !== undefined) {
    const bands = rows(structure.resultBands);
    if (!bands.length) errors.push("بازهٔ نتیجهٔ خالی مجاز نیست؛ آن را حذف یا تکمیل کنید.");
    ranges(bands, "نتیجه", true);
    if (new Set(bands.map(band => band.id)).size !== bands.length) errors.push("شناسهٔ بازه‌های نتیجه تکراری است.");
    const sorted = [...bands].sort((a, b) => Number(a.minInclusive) - Number(b.minInclusive));
    let low = 0; let high = 0;
    for (const section of sections) for (const question of rows(section.questions)) {
      let scores: number[] = [];
      if (question.type === "BOOLEAN") scores = [Number(question.trueScore), Number(question.falseScore)];
      if (question.type === "SINGLE_CHOICE") scores = rows(question.options).map(option => Number(option.score));
      if (question.type === "NUMBER") scores = rows(question.scoreRanges).map(range => Number(range.score));
      if (question.type === "MULTIPLE_CHOICE") { const values = rows(question.options).map(option => Number(option.score)); low += values.filter(value => value < 0).reduce((sum, value) => sum + value, 0); high += values.filter(value => value > 0).reduce((sum, value) => sum + value, 0); continue; }
      if (question.required !== true || !scores.length) scores.push(0);
      low += Math.min(...scores); high += Math.max(...scores);
    }
    if (sorted.length && (Number(sorted[0].minInclusive) > low || sorted.some((item, index) => index > 0 && Number(item.minInclusive) !== Number(sorted[index - 1].maxExclusive)) || sorted.at(-1)?.maxExclusive !== undefined && Number(sorted.at(-1)?.maxExclusive) <= high)) errors.push("بازه‌های نتیجه باید بدون شکاف، تمام امتیازهای ممکن پرسشنامه را پوشش دهند.");
  }
  if (dimension) {
    const scoring = row(structure.scoring);
    if (!Number.isSafeInteger(scoring.minInformativeAnswers) || Number(scoring.minInformativeAnswers) < 1) errors.push("حداقل پاسخ مؤثر باید عدد صحیح مثبت باشد.");
    if (countQuestions(structure) > 100 || sections.length > 20 || sections.some(section => !rows(section.questions).length)) errors.push("مدل ابعادی حداکثر ۲۰ بخش غیرخالی و ۱۰۰ سؤال دارد.");
    for (const profile of rows(structure.resultProfiles)) if (![profile.title, profile.summary, profile.nextStep].every(value => text(value).trim()) || !Array.isArray(profile.strengths) || !Array.isArray(profile.attentionPoints) || !profile.strengths.length || !profile.attentionPoints.length || !profile.strengths.every(value => text(value).trim()) || !profile.attentionPoints.every(value => text(value).trim())) errors.push("متن و نکات پروفایل‌های نتیجه باید کامل باشد.");
  }
  return [...new Set(errors)];
}
