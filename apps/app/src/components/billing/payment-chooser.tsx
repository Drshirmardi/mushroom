"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { CreditCard, Landmark, RotateCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopupSheet } from "@/components/billing/topup-sheet";
import { BottomSheet } from "@/components/shared/bottom-sheet";
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
  const [walletConfirmation, setWalletConfirmation] = useState<{ id: string; amountRial: string } | null>(null);
  const walletKey = useRef<{ intentId: string; key: string } | null>(null);
  const inFlight = useRef(false);

  const wallet = intent.methods?.find((method) => method.code === "WALLET") ?? null;
  const gateway = intent.methods?.find((method) => method.code === "GATEWAY") ?? null;
  const amount = BigInt(intent.amountRial);
  const isTopup = intent.purpose === "TOPUP";
  const balance = wallet?.balanceRial ? BigInt(wallet.balanceRial) : null;
  const deficit = balance !== null && balance < amount ? amount - balance : null;

  const run = async (kind: "wallet" | "gateway" | "cancel", action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const confirmationMatches = walletConfirmation?.id === intent.id && walletConfirmation.amountRial === intent.amountRial;
  const canPayFromWallet = !isTopup && intent.status === "PENDING" && wallet?.available && deficit === null;

  const payFromWallet = () => {
    if (!confirmationMatches || !canPayFromWallet) return;
    return run("wallet", async () => {
      if (walletKey.current?.intentId !== intent.id) walletKey.current = { intentId: intent.id, key: crypto.randomUUID() };
      const paid = await payWithWallet(accessToken, intent.id, walletKey.current.key);
      setWalletConfirmation(null);
      onPaid(paid);
    });
  };

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
      {isTopup && <aside className="rounded-2xl border border-border bg-muted p-4 text-sm leading-7" aria-label="دربارهٔ افزایش موجودی">
        <p>این درخواست برای اضافه‌کردن {formatRial(amount)} تومان به کیف پول شماست؛ هزینهٔ خرید، نوبت یا آزمون نیست.</p>
        <p className="mt-2 text-muted-foreground">افزایش موجودی از درگاه بانکی انجام می‌شود و از موجودی همین کیف پول قابل پرداخت نیست. برای استفاده از موجودی فعلی، وارد پرداخت سفارش یا خدمت موردنظرتان شوید و «پرداخت از کیف پول» را انتخاب کنید.</p>
        <Link href="/profile/wallet" className="mt-2 inline-flex min-h-11 items-center font-bold text-primary">مشاهدهٔ موجودی و گردش کیف پول</Link>
        <Link href="/" className="flex min-h-11 items-center font-bold text-primary">بازگشت به خانه و انتخاب خدمت</Link>
      </aside>}
      <div className="wallet-amount-total">
        <span>{isTopup ? "مبلغ افزایش موجودی" : "مبلغ قابل پرداخت"}</span>
        <strong>{formatRial(amount)} تومان</strong>
      </div>

      <div className="wallet-chooser" role="group" aria-label="انتخاب روش پرداخت">
        {wallet && (
          <button
            type="button"
            className="wallet-method"
            disabled={busy !== null || !canPayFromWallet}
            aria-haspopup="dialog"
            onClick={() => {
              setError(null);
              setWalletConfirmation({ id: intent.id, amountRial: intent.amountRial });
            }}
          >
            <span className="wallet-method__icon" aria-hidden="true"><Wallet size={20} /></span>
            <span className="wallet-method__body">
              <span className="wallet-method__title">پرداخت از کیف پول</span>
              <span className="wallet-method__hint">
                {balance === null ? "موجودی در دسترس نیست." : <>موجودی: {formatRial(balance)} تومان</>}
                <br />برداشت پس از تأیید نهایی شما
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
                {gateway.available ? "انتقال به درگاه پرداخت امن." : isTopup ? "افزایش موجودی فعلاً ممکن نیست؛ درگاه بانکی برای این درخواست در دسترس نیست." : "درگاه بانکی در حال حاضر برای این مورد در دسترس نیست."}
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
        {busy === "cancel" ? "در حال لغو…" : isTopup ? "لغو درخواست شارژ" : "لغو این پرداخت"}
      </button>

      <AnimatePresence>
        {confirmationMatches && (
          <BottomSheet title="تأیید پرداخت از کیف پول" onClose={() => { if (!inFlight.current) setWalletConfirmation(null); }}>
            <div className="space-y-4 pb-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true"><Wallet size={26} /></div>
              <p className="text-center text-sm leading-7 text-muted-foreground">با تأیید شما، مبلغ زیر از کیف پولتان برداشت می‌شود.</p>
              <dl className="space-y-3 rounded-2xl border border-border bg-muted/50 p-4 text-sm">
                <div className="flex items-center justify-between gap-3"><dt>مبلغ پرداخت</dt><dd className="font-iransans-fanum text-lg text-primary">{formatRial(amount)} تومان</dd></div>
                {balance !== null && <>
                  <div className="flex items-center justify-between gap-3 text-muted-foreground"><dt>موجودی فعلی</dt><dd className="font-iransans-fanum">{formatRial(balance)} تومان</dd></div>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><dt>موجودی پس از پرداخت</dt><dd className="font-iransans-fanum">{deficit === null ? `${formatRial(balance - amount)} تومان` : "موجودی کافی نیست"}</dd></div>
                </>}
              </dl>
              {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{error}</p>}
              <Button className="w-full" busy={busy !== null} disabled={!canPayFromWallet} onClick={() => void payFromWallet()}>
                {busy === "wallet" ? <><RotateCcw size={18} className="animate-spin" aria-hidden="true" />در حال پرداخت…</> : `تأیید و پرداخت ${formatRial(amount)} تومان`}
              </Button>
              <Button variant="ghost" className="w-full" disabled={busy !== null} onClick={() => setWalletConfirmation(null)}>فعلاً پرداخت نمی‌کنم</Button>
            </div>
          </BottomSheet>
        )}
        {topupOpen && <TopupSheet onClose={() => setTopupOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
