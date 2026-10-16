/**
 * Exact money helpers for the dashboard wallet.
 *
 * Wallet amounts travel as integer IRR strings; the only integer TOMAN input is
 * the explicitly named `amountToman` field on adjustments. Conversion is an
 * exact ×10 and display uses truncating integer division plus an explicit rial
 * remainder — never a floating point round trip. BigInt literals are avoided
 * because the dashboard TypeScript target is below ES2020.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const ZERO = BigInt(0);
const TEN = BigInt(10);

/** Normalize Persian and Arabic-Indic digits to Latin digits. */
export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = PERSIAN_DIGITS.indexOf(digit);
    if (persian >= 0) return String(persian);
    return String(ARABIC_INDIC_DIGITS.indexOf(digit));
  });
}

const persianInteger = (value: bigint): string => value.toString().replace(/\d/g, (digit) => PERSIAN_DIGITS[+digit]);

const groupLatin = (value: bigint): string => (value < ZERO ? -value : value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");

/** Group-separated Persian rendering of an integer TOMAN amount, signed. */
export function formatToman(value: bigint): string {
  const negative = value < ZERO;
  const grouped = groupLatin(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[+digit]);
  return `${negative ? "−" : ""}${grouped}`;
}

/** Group-separated Persian rendering of an integer TOMAN amount, unsigned. */
export function formatTomanUnsigned(value: bigint): string {
  return groupLatin(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[+digit]);
}

/** The main display value of an IRR amount in TOMAN (truncating division). */
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

/**
 * Full IRR rendering in TOMAN, appending the sub-toman rial remainder so a
 * non-multiple-of-ten amount is never silently rounded away.
 */
export function formatRial(rial: bigint): string {
  const main = formatToman(rialToToman(rial));
  const remainder = rialRemainderLabel(rial);
  return remainder === null ? `${main} تومان` : `${main} تومان و ${remainder}`;
}

/** Signed TOMAN rendering for a ledger delta, e.g. `+۱۲٬۰۰۰` / `−۵٬۰۰۰`. */
export function formatSignedToman(rial: bigint): string {
  if (rial === ZERO) return formatToman(ZERO);
  const sign = rial > ZERO ? "+" : "−";
  return `${sign}${formatTomanUnsigned(rialToToman(rial))}`;
}

export type TomanInput = { ok: true; toman: bigint } | { ok: false; reason: "EMPTY" | "INVALID" };

/**
 * Parse a free-form, Persian-aware integer TOMAN amount (≥ 0). Positivity is
 * enforced by the caller for CREDIT/DEBIT; the server owns the final policy.
 */
export function parseTomanInput(raw: string): TomanInput {
  const normalized = normalizeDigits(raw).replace(/[,\u066C\u066B\s]/g, "");
  if (!normalized) return { ok: false, reason: "EMPTY" };
  if (!/^\d+$/.test(normalized)) return { ok: false, reason: "INVALID" };
  return { ok: true, toman: BigInt(normalized) };
}
