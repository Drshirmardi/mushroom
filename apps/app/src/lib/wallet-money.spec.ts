import { describe, expect, it } from "vitest";

import {
  MAX_TOPUP_TOMAN,
  MIN_TOPUP_TOMAN,
  formatRial,
  formatSignedToman,
  formatToman,
  formatTopupInput,
  formatTomanUnsigned,
  normalizeDigits,
  parseTopupToman,
  rialRemainder,
  rialRemainderLabel,
  rialToToman,
  topupValidationMessage,
} from "./wallet-money";

const B = (value: string | number) => BigInt(value);
const LTR = (value: string) => value.replace(/[\u06F0-\u06F9]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

describe("wallet money helpers", () => {
  it("normalizes Persian and Arabic-Indic digits", () => {
    expect(normalizeDigits("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("groups a live amount input 3-by-3 in Persian digits and caps at the maximum", () => {
    expect(LTR(formatTopupInput(""))).toBe("");
    expect(LTR(formatTopupInput("۱۲۳۴۵۶۷"))).toBe("1٬234٬567");
    expect(LTR(formatTopupInput("١٢٣٤٥٦٧"))).toBe("1٬234٬567");
    expect(LTR(formatTopupInput("1234567"))).toBe("1٬234٬567");
    expect(LTR(formatTopupInput("00123000"))).toBe("123٬000");
    expect(LTR(formatTopupInput("۵۰٬۰۰۰"))).toBe("50٬000");
    expect(LTR(formatTopupInput("12a3"))).toBe("123");
    expect(LTR(formatTopupInput("0"))).toBe("0");
    expect(LTR(formatTopupInput("999999999999"))).toBe(LTR(formatToman(MAX_TOPUP_TOMAN)));
  });

  it("groups integer TOMAN with the Persian separator and keeps the sign", () => {
    expect(LTR(formatToman(B(1234567)))).toBe("1٬234٬567");
    expect(LTR(formatToman(B(-5000)))).toBe("−5٬000");
    expect(LTR(formatToman(B(0)))).toBe("0");
    expect(LTR(formatTomanUnsigned(B(-1234)))).toBe("1٬234");
  });

  it("converts IRR to TOMAN by truncating and exposes the sub-toman remainder", () => {
    expect(rialToToman(B(1250000))).toBe(B(125000));
    expect(rialRemainder(B(1250000))).toBeNull();
    expect(rialToToman(B(1234567))).toBe(B(123456));
    expect(rialRemainder(B(1234567))).toBe(B(7));
    expect(rialRemainderLabel(B(1234567))).toBe("۷ ریال");
    expect(rialRemainderLabel(B(1234500))).toBeNull();
    expect(rialRemainder(B(-1234567))).toBe(B(7));
  });

  it("renders signed ledger deltas without losing the sign for zero", () => {
    expect(LTR(formatSignedToman(B(125000)))).toBe("+12٬500");
    expect(LTR(formatSignedToman(B(-125000)))).toBe("−12٬500");
    expect(LTR(formatSignedToman(B(0)))).toBe("0");
  });

  it("formats a full rial amount including any remainder", () => {
    expect(LTR(formatRial(B(1250000)))).toBe("125٬000");
    expect(LTR(formatRial(B(1234567)))).toContain("123٬456");
    expect(LTR(formatRial(B(1234567)))).toContain("7 ریال");
  });

  it("parses a free-form top-up amount from both digit sets and rejects unsafe input", () => {
    expect(parseTopupToman("")).toEqual({ ok: false, reason: "EMPTY" });
    expect(parseTopupToman("abc")).toEqual({ ok: false, reason: "INVALID" });
    expect(parseTopupToman("0")).toEqual({ ok: false, reason: "INVALID" });
    expect(parseTopupToman("-100")).toEqual({ ok: false, reason: "INVALID" });
    expect(parseTopupToman("500")).toEqual({ ok: false, reason: "TOO_SMALL" });
    expect(parseTopupToman((MAX_TOPUP_TOMAN + B(1)).toString())).toEqual({ ok: false, reason: "TOO_LARGE" });
    expect(parseTopupToman("۵۰,۰۰۰")).toEqual({ ok: true, toman: B(50000) });
    expect(parseTopupToman("١٠٠٬٠٠٠")).toEqual({ ok: true, toman: B(100000) });
    expect(parseTopupToman(MIN_TOPUP_TOMAN.toString())).toEqual({ ok: true, toman: MIN_TOPUP_TOMAN });
    expect(parseTopupToman("1000.5")).toEqual({ ok: false, reason: "INVALID" });
  });

  it("stays exact for values beyond the safe integer range", () => {
    const large = B("123456789012345678");
    expect(parseTopupToman("123456789012345")).toEqual({ ok: false, reason: "TOO_LARGE" });
    expect(rialToToman(large) * B(10) + (rialRemainder(large) ?? B(0))).toBe(large);
  });

  it("explains every top-up validation failure", () => {
    expect(topupValidationMessage("EMPTY")).toContain("وارد کنید");
    expect(topupValidationMessage("TOO_SMALL")).toContain(formatToman(MIN_TOPUP_TOMAN));
    expect(topupValidationMessage("TOO_LARGE")).toContain(formatToman(MAX_TOPUP_TOMAN));
    expect(topupValidationMessage("INVALID")).toContain("عدد صحیح");
  });
});
