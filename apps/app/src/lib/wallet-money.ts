/**
 * Exact money helpers for the patient wallet.
 *
 * Billing amounts travel as integer IRR strings and integer TOMAN strings only
 * in explicitly named `amountToman` inputs. The conversion is an exact ×10 in
 * one direction and, on display, a truncating integer division plus an explicit
 * rial remainder — never a floating point round trip.
 *
 * BigInt literals are avoided because the app's TypeScript target is below
 * ES2020; the runtime values are still real `bigint`.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const ZERO = BigInt(0);
const TEN = BigInt(10);

/** Lower / upper policy bounds for a self-service top-up, in TOMAN. */
export const MIN_TOPUP_TOMAN = BigInt("20000");
export const MAX_TOPUP_TOMAN = BigInt("20000000");

/** Quick top-up presets offered next to the free-form amount input, in TOMAN. */
export const TOPUP_PRESETS_TOMAN: readonly bigint[] = [
  BigInt("250000"),
  BigInt("500000"),
  BigInt("2000000"),
  BigInt("4000000"),
];

/** Normalize Persian and Arabic-Indic digits to Latin digits. */
export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = PERSIAN_DIGITS.indexOf(digit);
    if (persian >= 0) return String(persian);
    return String(ARABIC_INDIC_DIGITS.indexOf(digit));
  });
}

/** Persian-digit rendering of an integer string without grouping. */
const persianInteger = (value: bigint): string => value.toString().replace(/\d/g, (digit) => PERSIAN_DIGITS[+digit]);

/** Latin-digit grouping with the Persian thousands separator, before digit conversion. */
const groupLatin = (value: bigint): string => (value < ZERO ? -value : value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");

/** Group-separated Persian rendering of an integer TOMAN amount. */
export function formatToman(value: bigint): string {
  const negative = value < ZERO;
  const grouped = groupLatin(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[+digit]);
  return `${negative ? "−" : ""}${grouped}`;
}

/** Group-separated Persian rendering of an integer TOMAN amount, unsigned. */
export function formatTomanUnsigned(value: bigint): string {
  return groupLatin(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[+digit]);
}

/**
 * Format a top-up amount as the user types: normalize Persian/Arabic digits,
 * keep digits only, drop leading zeros, group 3-by-3 with the Persian thousands
 * separator, and cap at the maximum allowed amount so the field can never show
 * more than the advertised limit.
 */
export function formatTopupInput(raw: string): string {
  const digits = normalizeDigits(raw).replace(/\D/g, "");
  if (!digits) return "";
  const value = BigInt(digits);
  return formatToman(value > MAX_TOPUP_TOMAN ? MAX_TOPUP_TOMAN : value);
}

/**
 * The main display value of an IRR amount in TOMAN. Sub-toman rial are dropped
 * here on purpose; pair with `rialRemainder` so nothing is silently lost.
 */
export function rialToToman(rial: bigint): bigint {
  return rial / TEN;
}

/** The `0`-`9` rial that cannot be represented as a whole toman, or `null`. */
export function rialRemainder(rial: bigint): bigint | null {
  const remainder = (rial < ZERO ? -rial : rial) % TEN;
  return remainder === ZERO ? null : remainder;
}

/** Human label for a sub-toman remainder, e.g. `۷ ریال`, or `null`. */
export function rialRemainderLabel(rial: bigint): string | null {
  const remainder = rialRemainder(rial);
  return remainder === null ? null : `${persianInteger(remainder)} ریال`;
}

/** Signed TOMAN rendering for a ledger delta, e.g. `+۱۲٬۰۰۰` / `−۵٬۰۰۰`. */
export function formatSignedToman(rial: bigint): string {
  if (rial === ZERO) return formatToman(ZERO);
  const sign = rial > ZERO ? "+" : "−";
  return `${sign}${formatTomanUnsigned(rialToToman(rial))}`;
}

/**
 * Full IRR rendering in TOMAN, appending the sub-toman rial remainder so a
 * non-multiple-of-ten amount is never silently rounded away.
 */
export function formatRial(rial: bigint): string {
  const main = formatToman(rialToToman(rial));
  const remainder = rialRemainderLabel(rial);
  return remainder === null ? main : `${main} و ${remainder}`;
}

export type TopupValidation =
  | { ok: true; toman: bigint }
  | { ok: false; reason: "EMPTY" | "INVALID" | "TOO_SMALL" | "TOO_LARGE" };

/** Parse a free-form, Persian-aware top-up amount into an integer TOMAN value. */
export function parseTopupToman(raw: string): TopupValidation {
  const normalized = normalizeDigits(raw).replace(/[,\u066C\u066B\s]/g, "");
  if (!normalized) return { ok: false, reason: "EMPTY" };
  if (!/^\d+$/.test(normalized)) return { ok: false, reason: "INVALID" };
  const toman = BigInt(normalized);
  if (toman <= ZERO) return { ok: false, reason: "INVALID" };
  if (toman < MIN_TOPUP_TOMAN) return { ok: false, reason: "TOO_SMALL" };
  if (toman > MAX_TOPUP_TOMAN) return { ok: false, reason: "TOO_LARGE" };
  return { ok: true, toman };
}

/** Map a validation failure to a Persian message safe to render next to the field. */
export function topupValidationMessage(reason: "EMPTY" | "INVALID" | "TOO_SMALL" | "TOO_LARGE"): string {
  switch (reason) {
    case "EMPTY":
      return "مبلغ شارژ را وارد کنید.";
    case "INVALID":
      return "مبلغ باید یک عدد صحیح و بزرگ‌تر از صفر باشد.";
    case "TOO_SMALL":
      return `کمترین مبلغ شارژ ${formatToman(MIN_TOPUP_TOMAN)} تومان است.`;
    case "TOO_LARGE":
      return `بیشترین مبلغ شارژ ${formatToman(MAX_TOPUP_TOMAN)} تومان است.`;
  }
}
