export type ProgramPricePolicy = { amountRial: bigint | string; discountPercent: number; discountStartsAt: Date | string | null; discountEndsAt: Date | string | null };
export function programPrice(policy: ProgramPricePolicy, at: Date) {
  const base = BigInt(policy.amountRial);
  const active = base > 0n && (!policy.discountStartsAt || new Date(policy.discountStartsAt) <= at) && (!policy.discountEndsAt || at < new Date(policy.discountEndsAt));
  const discountPercent = active ? policy.discountPercent : 0;
  return { baseAmountRial: base.toString(), discountPercent, amountRial: (base * BigInt(100 - discountPercent) / 100n).toString() };
}
