"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { CreditCard, Landmark, RotateCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopupSheet } from "@/components/billing/topup-sheet";
import {
  cancelBillingIntent,
  createGatewayAttempt,
  payWithWallet,
  walletErrorMessage,
  type BillingIntent,
} from "@/lib/wallet-billing-api";
import { formatRial } from "@/lib/wallet-money";

type Props = {
  accessToken: string;
  intent: BillingIntent;
  onPaid: (intent: BillingIntent) => void;
  onCancelled?: () => void;
};

/**
 * The single shared payment chooser used by store checkout and appointment
 * booking. Available methods and the wallet balance come from the server; the
 * browser only chooses a target and a method, never an amount.
 */
export function PaymentChooser({ accessToken, intent, onPaid, onCancelled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"wallet" | "gateway" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const walletKey = useRef<string | null>(null);

  const wallet = intent.methods?.find((method) => method.code === "WALLET") ?? null;
  const gateway = intent.methods?.find((method) => method.code === "GATEWAY") ?? null;
  const amount = BigInt(intent.amountRial);
  const balance = wallet?.balanceRial ? BigInt(wallet.balanceRial) : null;
  const deficit = balance !== null && balance < amount ? amount - balance : null;

  const run = async (kind: "wallet" | "gateway" | "cancel", action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const payFromWallet = () =>
    run("wallet", async () => {
      if (!walletKey.current) walletKey.current = crypto.randomUUID();
      onPaid(await payWithWallet(accessToken, intent.id, walletKey.current));
    });

  const payViaGateway = () =>
    run("gateway", async () => {
      const attempt = await createGatewayAttempt(accessToken, intent.id, crypto.randomUUID());
      if (!attempt.redirectUrl) {
        setError("پرداخت بانکی در وضعیت نامشخص است. برای بررسی نتیجه به صفحهٔ پرداخت مراجعه کنید.");
        return;
      }
      window.location.assign(attempt.redirectUrl);
    });

  const cancel = () =>
    run("cancel", async () => {
      await cancelBillingIntent(accessToken, intent.id, crypto.randomUUID());
      if (onCancelled) onCancelled();
      else router.back();
    });

  return (
    <div className="space-y-3">
      <div className="wallet-amount-total">
        <span>مبلغ قابل پرداخت</span>
        <strong>{formatRial(amount)} تومان</strong>
      </div>

      <div className="wallet-chooser" role="group" aria-label="انتخاب روش پرداخت">
        {wallet && (
          <button
            type="button"
            className="wallet-method"
            disabled={busy !== null || !wallet.available}
            onClick={() => void payFromWallet()}
          >
            <span className="wallet-method__icon" aria-hidden="true"><Wallet size={20} /></span>
            <span className="wallet-method__body">
              <span className="wallet-method__title">پرداخت از کیف پول</span>
              <span className="wallet-method__hint">
                {balance === null ? "موجودی در دسترس نیست." : <>موجودی: {formatRial(balance)} تومان</>}
                {deficit && <><br />کسری موجودی: {formatRial(deficit)} تومان</>}
              </span>
            </span>
            {busy === "wallet" && <RotateCcw size={18} className="animate-spin" aria-hidden="true" />}
          </button>
        )}

        {gateway && (
          <button
            type="button"
            className="wallet-method"
            disabled={busy !== null || !gateway.available}
            onClick={() => void payViaGateway()}
          >
            <span className="wallet-method__icon" aria-hidden="true"><Landmark size={20} /></span>
            <span className="wallet-method__body">
              <span className="wallet-method__title">پرداخت بانکی (درگاه)</span>
              <span className="wallet-method__hint">
                {gateway.available ? "انتقال به درگاه پرداخت امن." : "درگاه بانکی در حال حاضر برای این مورد در دسترس نیست."}
              </span>
            </span>
            {busy === "gateway" && <RotateCcw size={18} className="animate-spin" aria-hidden="true" />}
          </button>
        )}

        {!wallet && !gateway && (
          <p role="status" className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
            هیچ روش پرداخت مجازی برای این مورد در دسترس نیست.
          </p>
        )}
      </div>

      {deficit && (
        <Button variant="secondary" className="w-full" onClick={() => setTopupOpen(true)}>
          <CreditCard size={17} aria-hidden="true" />افزایش موجودی کیف پول
        </Button>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>
      )}

      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void cancel()}
        className="w-full rounded-2xl border border-border bg-white py-3 text-sm font-bold text-muted-foreground disabled:opacity-50"
      >
        {busy === "cancel" ? "در حال لغو…" : "لغو این پرداخت"}
      </button>

      <AnimatePresence>
        {topupOpen && <TopupSheet onClose={() => setTopupOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
