import { describe, expect, it } from "vitest";

import { formatRial, formatSignedToman, formatToman, normalizeDigits, parseTomanInput, rialRemainder, rialRemainderLabel, rialToToman } from "./wallet-money";

const B = (value: string | number) => BigInt(value);
const LTR = (value: string) => value.replace(/[\u06F0-\u06F9]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

describe("dashboard wallet money", () => {
  it("normalizes Persian and Arabic-Indic digits", () => {
    expect(normalizeDigits("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("groups integer TOMAN with the Persian separator", () => {
    expect(LTR(formatToman(B(1234567)))).toBe("1٬234٬567");
    expect(LTR(formatToman(B(-5000)))).toBe("−5٬000");
    expect(LTR(formatToman(B(0)))).toBe("0");
  });

  it("converts IRR to TOMAN and exposes the sub-toman remainder", () => {
    expect(rialToToman(B(1250000))).toBe(B(125000));
    expect(rialRemainder(B(1250000))).toBeNull();
    expect(rialToToman(B(1234567))).toBe(B(123456));
    expect(rialRemainder(B(1234567))).toBe(B(7));
    expect(rialRemainderLabel(B(1234567))).toBe("۷ ریال");
  });

  it("renders full rial amounts with a unit and preserves any remainder", () => {
    expect(LTR(formatRial(B(1250000)))).toBe("125٬000 تومان");
    expect(LTR(formatRial(B(1234567)))).toContain("123٬456 تومان");
    expect(LTR(formatRial(B(1234567)))).toContain("7 ریال");
  });

  it("renders signed ledger deltas", () => {
    expect(LTR(formatSignedToman(B(125000)))).toBe("+12٬500");
    expect(LTR(formatSignedToman(B(-125000)))).toBe("−12٬500");
    expect(LTR(formatSignedToman(B(0)))).toBe("0");
  });

  it("parses integer TOMAN input from both digit sets", () => {
    expect(parseTomanInput("")).toEqual({ ok: false, reason: "EMPTY" });
    expect(parseTomanInput("abc")).toEqual({ ok: false, reason: "INVALID" });
    expect(parseTomanInput("۱۲۳٬۴۵۶")).toEqual({ ok: true, toman: B(123456) });
    expect(parseTomanInput("٠")).toEqual({ ok: true, toman: B(0) });
    expect(parseTomanInput("100.5")).toEqual({ ok: false, reason: "INVALID" });
  });
});
