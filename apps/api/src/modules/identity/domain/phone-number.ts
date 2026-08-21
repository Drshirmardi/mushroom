const CANONICAL_IRANIAN_MOBILE_PATTERN = /^\+989\d{9}$/;
const ALLOWED_INPUT_PATTERN = /^[0-9+\s()\-\u200c\u200e\u200f]+$/u;
const IGNORED_INPUT_CHARACTERS_PATTERN = /[\s()\-\u200c\u200e\u200f]/gu;
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export type CanonicalPhoneNumber = string & {
  readonly canonicalPhoneNumber: unique symbol;
};

export class InvalidPhoneNumberError extends Error {
  readonly code = 'INVALID_PHONE_NUMBER';

  constructor() {
    super('Phone number must be a valid Iranian mobile number.');
    this.name = 'InvalidPhoneNumberError';
  }
}

const toLatinDigits = (value: string): string =>
  [...value].map((character) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(character);
    if (persianIndex >= 0) return String(persianIndex);

    const arabicIndicIndex = ARABIC_INDIC_DIGITS.indexOf(character);
    if (arabicIndicIndex >= 0) return String(arabicIndicIndex);

    return character;
  }).join('');

export const normalizeIranianMobile = (input: string): CanonicalPhoneNumber => {
  const normalizedDigits = toLatinDigits(input.normalize('NFKC'));

  if (!ALLOWED_INPUT_PATTERN.test(normalizedDigits)) {
    throw new InvalidPhoneNumberError();
  }

  const compact = normalizedDigits.replace(IGNORED_INPUT_CHARACTERS_PATTERN, '');
  let canonical: string;

  if (/^09\d{9}$/.test(compact)) {
    canonical = `+98${compact.slice(1)}`;
  } else if (/^9\d{9}$/.test(compact)) {
    canonical = `+98${compact}`;
  } else if (/^989\d{9}$/.test(compact)) {
    canonical = `+${compact}`;
  } else if (/^00989\d{9}$/.test(compact)) {
    canonical = `+${compact.slice(2)}`;
  } else {
    canonical = compact;
  }

  if (!CANONICAL_IRANIAN_MOBILE_PATTERN.test(canonical)) {
    throw new InvalidPhoneNumberError();
  }

  return canonical as CanonicalPhoneNumber;
};

export const isCanonicalIranianMobile = (
  input: string,
): input is CanonicalPhoneNumber => CANONICAL_IRANIAN_MOBILE_PATTERN.test(input);
