import { normalizeDigits } from '@/lib/wallet-money';

/** Preserve a one-rial remainder when an existing price is expressed in toman. */
export function priceToInput(rial: string): string {
  const value = BigInt(rial);
  const remainder = value % BigInt(10);
  return `${value / BigInt(10)}${remainder ? `.${remainder}` : ''}`;
}

export function priceFromInput(raw: string): string | null {
  const value = normalizeDigits(raw).replace(/[,٬\s]/g, '').replace('٫', '.');
  if (!/^\d{1,18}(?:\.\d)?$/.test(value)) return null;
  const [whole, fraction = '0'] = value.split('.');
  const rial = BigInt(whole) * BigInt(10) + BigInt(fraction);
  return rial <= BigInt('9000000000000000000') ? rial.toString() : null;
}
