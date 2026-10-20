import { describe, expect, it } from "vitest";
import { countQuestions, validateAuthoring } from "./assessment-authoring";

const structure = {
  schemaVersion: 1,
  sections: [
    { id: "first", title: "اطلاعات", questions: [
      { id: "boolean", type: "BOOLEAN", text: "پرسش اول", required: true, trueScore: 2, falseScore: 0 },
      { id: "text", type: "TEXT", text: "توضیح", required: false, maxLength: 500 },
    ] },
    { id: "second", title: "پاسخ‌ها", questions: [
      { id: "number", type: "NUMBER", text: "مقدار", required: true, min: 0, max: 10, scoreRanges: [{ minInclusive: 0, maxExclusive: 5, score: 0 }, { minInclusive: 5, score: 2 }] },
      { id: "single", type: "SINGLE_CHOICE", text: "انتخاب", required: true, options: [{ id: "a", label: "الف", score: 0 }, { id: "b", label: "ب", score: 1 }] },
      { id: "multiple", type: "MULTIPLE_CHOICE", text: "چند انتخاب", required: false, options: [{ id: "a", label: "الف", score: -1 }, { id: "b", label: "ب", score: 1 }] },
    ] },
  ],
  resultBands: [{ id: "low", title: "بازهٔ اول", minInclusive: -1, maxExclusive: 3 }, { id: "high", title: "بازهٔ دوم", minInclusive: 3 }],
};

describe("assessment authoring boundaries", () => {
  it("accepts all five server-supported types across every section without changing the structure", () => {
    const original = structuredClone(structure);
    expect(countQuestions(structure)).toBe(5);
    expect(validateAuthoring(structure)).toEqual([]);
    expect(structure).toEqual(original);
  });
  it("rejects result gaps and an uncovered maximum that the runtime scoring engine would refuse", () => {
    expect(validateAuthoring({ ...structure, resultBands: [{ id: "only", title: "نتیجه", minInclusive: 0, maxExclusive: 2 }] }).some(message => message.includes("تمام امتیازها"))).toBe(true);
    expect(validateAuthoring({ ...structure, resultBands: [{ id: "a", title: "الف", minInclusive: -1, maxExclusive: 2 }, { id: "b", title: "ب", minInclusive: 3 }] }).some(message => message.includes("شکاف"))).toBe(true);
  });
  it("rejects duplicate cross-section identifiers without rejecting reused option identifiers in different questions", () => {
    const copy = structuredClone(structure);
    copy.sections[1].id = copy.sections[0].id;
    expect(validateAuthoring(copy).some(message => message.includes("شناسهٔ تکراری"))).toBe(true);
    expect(validateAuthoring(structure)).toEqual([]);
  });
  it("refuses unknown schema versions rather than turning them into legacy questionnaires", () => {
    expect(validateAuthoring({ ...structure, schemaVersion: 3 })).toEqual(["نسخهٔ ساختار پشتیبانی نمی‌شود؛ ساختار اصلی حفظ شده است."]);
  });
});
