"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CreditCard, Info, RotateCcw, TriangleAlert } from "lucide-react";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { useAuthSession } from "@/components/auth/session-gate";
import { createGatewayAttempt, createTopupIntent, walletErrorMessage } from "@/lib/wallet-billing-api";
import {
  MAX_TOPUP_TOMAN,
  MIN_TOPUP_TOMAN,
  TOPUP_PRESETS_TOMAN,
  formatToman,
  formatTopupInput,
  parseTopupToman,
  topupValidationMessage,
} from "@/lib/wallet-money";

/**
 * Bottom-sheet wallet recharge. The whole top-up flow (amount → intent →
 * gateway attempt → redirect) happens in place, so the patient never leaves
 * the wallet/payment surface to fund the account.
 */
export function TopupSheet({ onClose }: { onClose: () => void }) {
  const { authentication } = useAuthSession();
  const router = useRouter();
  const [amount, setAmount] = useState(() => formatTopupInput(TOPUP_PRESETS_TOMAN[0].toString()));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIntentId, setPendingIntentId] = useState<string | null>(null);
  const intentKey = useRef<{ amount: string; key: string } | null>(null);

  const validation = parseTopupToman(amount);
  const fieldError = touched && !validation.ok ? topupValidationMessage(validation.reason) : null;

  const submit = async () => {
    setTouched(true);
    if (!validation.ok) return;
    const normalized = validation.toman.toString();
    if (intentKey.current?.amount !== normalized) {
      intentKey.current = { amount: normalized, key: crypto.randomUUID() };
    }
    setBusy(true);
    setError(null);
    setPendingIntentId(null);
    try {
      const intent = await createTopupIntent(authentication.accessToken, validation.toman, intentKey.current.key);
      setPendingIntentId(intent.id);
      const attempt = await createGatewayAttempt(authentication.accessToken, intent.id, crypto.randomUUID());
      if (attempt.redirectUrl) {
        window.location.assign(attempt.redirectUrl);
        return;
      }
      setPendingIntentId(intent.id);
      setError("پرداخت در وضعیت نامشخص است و نیاز به بررسی دارد. تا مشخص‌شدن نتیجه، پرداخت دیگری انجام ندهید.");
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet title="افزایش موجودی" onClose={onClose}>
      <div className="space-y-4 pb-2">
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <TriangleAlert size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-bold leading-6 text-amber-900">{error}</p>
              {pendingIntentId && (
                <button
                  type="button"
                  onClick={() => router.push(`/profile/wallet/payment-result?intentId=${encodeURIComponent(pendingIntentId)}`)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline underline-offset-4"
                >
                  مشاهدهٔ نتیجه
                  <ChevronLeft size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="topup-amount" className="mb-1.5 block text-xs font-bold text-muted-foreground">مبلغ شارژ (تومان)</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 transition-colors focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/25">
            <input
              id="topup-amount"
              name="topup-amount"
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              placeholder="مبلغ دلخواه"
              value={amount}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "topup-amount-error" : "topup-amount-help"}
              onChange={(event) => setAmount(formatTopupInput(event.target.value))}
              onBlur={() => setTouched(true)}
              className="w-full min-w-0 flex-1 border-0 bg-transparent py-3 text-center text-3xl font-extrabold tabular-nums tracking-normal text-foreground outline-none placeholder:text-center placeholder:text-xs placeholder:font-normal placeholder:text-muted-foreground"
            />
            <span className="shrink-0 text-sm font-bold text-muted-foreground" aria-hidden="true">تومان</span>
          </div>

          {fieldError ? (
            <p id="topup-amount-error" role="alert" className="mt-1.5 text-[11px] font-bold text-red-600">{fieldError}</p>
          ) : (
            <p id="topup-amount-help" className="mt-1.5 text-[11px] text-muted-foreground">
              مبلغ دلخواه شما باید بین {formatToman(MIN_TOPUP_TOMAN)} و {formatToman(MAX_TOPUP_TOMAN)} تومان باشد.
            </p>
          )}

          <p className="mb-2 mt-4 text-xs font-bold text-muted-foreground">مبالغ پیشنهادی</p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="مبالغ پیشنهادی">
            {TOPUP_PRESETS_TOMAN.map((preset) => {
              const selected = validation.ok && validation.toman === preset;
              return (
                <button
                  key={preset.toString()}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => { setAmount(formatTopupInput(preset.toString())); setTouched(true); }}
                  className={`rounded-lg border px-3 py-3 text-sm font-bold transition-colors active:scale-[0.99] ${selected ? "border-blue-600 bg-blue-700 text-white" : "border-slate-200 bg-white text-muted-foreground"
                    }`}
                >
                  {formatToman(preset)} <span className="text-[11px] font-bold opacity-80">تومان</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-6 text-gray-700">
          <Info size={15} className="mt-0.5 flex-shrink-0 text-gray-500" aria-hidden="true" />
          <span>پرداخت از طریق درگاه امن بانکی انجام می‌شود و به‌محض تأیید، مبلغ بلافاصله به کیف پول شما اضافه می‌شود.</span>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 py-4 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
        >
          {busy ? <><RotateCcw size={17} className="animate-spin" aria-hidden="true" />در حال انتقال به درگاه…</> : <><CreditCard size={17} aria-hidden="true" />پرداخت و شارژ</>}
        </button>
      </div>
    </BottomSheet>
  );
}
