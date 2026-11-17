'use client';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { currentInvitationContext } from '@/lib/marriage-context';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { ChevronLeft, CreditCard, Landmark, ReceiptText, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopupSheet } from '@/components/billing/topup-sheet';
import { BottomSheet, type BottomSheetHandle } from '@/components/shared/bottom-sheet';
import {
  cancelBillingIntent,
  createGatewayAttempt,
  createBaleAttempt,
  getBillingIntent,
  payWithWallet,
  walletErrorMessage,
  type BillingIntent,
} from '@/lib/wallet-billing-api';
import { formatRial } from '@/lib/wallet-money';
import {
  BALE_SDK_URL,
  canOpenBaleInvoice,
  isBaleInvoiceActive,
  isBaleSession,
  openBaleBrowser,
  openBaleInvoice,
  openSadadOutsideMiniApp,
} from '@/lib/bale-payment';
import { billingPurposeLabel, paymentAttemptNotice } from '@/lib/wallet-labels';
import styles from './payment.module.css';

type Props = {
  accessToken: string;
  intent: BillingIntent;
  onPaid: (intent: BillingIntent) => void;
  onCancelled?: () => void;
  onRefresh?: () => void;
  context?: ReactNode;
  details?: ReactNode;
};

/**
 * The single shared payment chooser used by store checkout and appointment
 * booking. Available methods and the wallet balance come from the server; the
 * browser only chooses a target and a method, never an amount.
 */
export function PaymentChooser({
  accessToken,
  intent,
  onPaid,
  onCancelled,
  onRefresh,
  context,
  details,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'wallet' | 'gateway' | 'bale' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baleInvoiceActive, setBaleInvoiceActive] = useState(isBaleInvoiceActive);
  const [inBale, setInBale] = useState(false);
  const [baleCapability, setBaleCapability] = useState<'loading' | 'ready' | 'unsupported' | 'unavailable'>('loading');
  const [openedIntentId, setOpenedIntentId] = useState<string | null>(null);
  const openedAttempt = useRef<{ intentId: string; id: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const statusInFlight = useRef(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [walletConfirmation, setWalletConfirmation] = useState<{
    id: string;
    amountRial: string;
  } | null>(null);
  const walletKey = useRef<{ intentId: string; key: string } | null>(null);
  const baleKey = useRef<{ intentId: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const walletSheetRef = useRef<BottomSheetHandle>(null);
  const paidAfterCloseRef = useRef<BillingIntent | null>(null);

  const wallet = intent.methods?.find((method) => method.code === 'WALLET') ?? null;
  const gateway = intent.methods?.find((method) => method.code === 'GATEWAY') ?? null;
  const bale = intent.methods?.find((method) => method.code === 'BALE_WALLET') ?? null;
  const nativeBale = Boolean(bale?.available && (baleCapability === 'ready' || canOpenBaleInvoice()));
  const amount = BigInt(intent.amountRial);
  const isTopup = intent.purpose === 'TOPUP';
  const balance = wallet?.balanceRial ? BigInt(wallet.balanceRial) : null;
  const bankAttempt = intent.attempts?.find((attempt) =>
    ['CREATED', 'REDIRECT_READY', 'VERIFYING', 'REQUIRES_RECONCILIATION'].includes(attempt.status),
  );
  const deficit = balance !== null && balance < amount ? amount - balance : null;

  useEffect(() => setInBale(isBaleSession()), []);

  const trackOpenedAttempt = (id: string) => {
    openedAttempt.current = { intentId: intent.id, id };
    setOpenedIntentId(intent.id);
    setPaymentNotice(null);
  };

  const refreshPayment = useCallback(async (manual = false) => {
    if (statusInFlight.current) return;
    const tracked = openedAttempt.current;
    statusInFlight.current = true;
    if (manual) setChecking(true);
    try {
      const latest = await getBillingIntent(accessToken, intent.id);
      const attempt = tracked?.intentId === intent.id
        ? latest.attempts?.find((entry) => entry.id === tracked.id)
        : undefined;
      if (latest.status === 'PAID' || latest.status === 'COMPENSATED') {
        onPaid(latest);
        return;
      }
      const checkedAttempt = attempt ?? (!tracked ? latest.attempts?.[0] : undefined);
      if (openedAttempt.current === tracked && (tracked || manual)) {
        if (manual) setError(null);
        setPaymentNotice(paymentAttemptNotice(latest.status, checkedAttempt?.status));
      }
      onRefresh?.();
    } catch {
      if (manual) setError('بررسی وضعیت پرداخت ممکن نشد. دوباره تلاش کنید.');
    } finally {
      statusInFlight.current = false;
      if (manual) setChecking(false);
    }
  }, [accessToken, intent.id, onPaid, onRefresh]);

  useEffect(() => {
    if (openedIntentId !== intent.id) return;
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') void refreshPayment();
    };
    window.addEventListener('focus', refreshOnReturn);
    window.addEventListener('pageshow', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      window.removeEventListener('focus', refreshOnReturn);
      window.removeEventListener('pageshow', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [intent.id, openedIntentId, refreshPayment]);

  const run = async (kind: 'wallet' | 'gateway' | 'bale' | 'cancel', action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(kind);
    setError(null);
    setPaymentNotice(null);
    try {
      await action();
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const confirmationMatches =
    walletConfirmation?.id === intent.id && walletConfirmation.amountRial === intent.amountRial;
  const canPayFromWallet =
    !isTopup &&
    !bankAttempt &&
    intent.status === 'PENDING' &&
    wallet?.available &&
    deficit === null;

  const payFromWallet = () => {
    if (!confirmationMatches || !canPayFromWallet) return;
    return run('wallet', async () => {
      if (walletKey.current?.intentId !== intent.id)
        walletKey.current = { intentId: intent.id, key: crypto.randomUUID() };
      const paid = await payWithWallet(accessToken, intent.id, walletKey.current.key);

      paidAfterCloseRef.current = paid;
      walletSheetRef.current?.close();
    });
  };

  const payViaBale = () =>
    run('bale', async () => {
      if (!nativeBale) return;
      if (isBaleInvoiceActive()) {
        setBaleInvoiceActive(true);
        setError('یک فاکتور بله باز است؛ آن را تکمیل یا ببندید و سپس وضعیت پرداخت را دوباره بررسی کنید.');
        return;
      }
      if (baleKey.current?.intentId !== intent.id || (!bankAttempt && intent.attempts?.[0]?.status === 'FAILED')) baleKey.current = { intentId: intent.id, key: crypto.randomUUID() };
      const attempt = await createBaleAttempt(accessToken, intent.id, baleKey.current.key);
      if (!attempt.invoiceParams) {
        if (attempt.status === 'FAILED') baleKey.current = null;
        setError('فاکتور بله آماده نشد. روش‌های پرداخت در دسترس پس از بررسی دوباره نمایش داده می‌شوند.');
        onRefresh?.();
        return;
      }
      trackOpenedAttempt(attempt.id);
      const openResult = openBaleInvoice(attempt.invoiceParams, () => {
        setBaleInvoiceActive(false);
        void refreshPayment(true);
      });
      setBaleInvoiceActive(isBaleInvoiceActive());
      if (openResult === 'already-active') {
        setBaleInvoiceActive(true);
        setError('یک فاکتور بله باز است؛ آن را تکمیل یا ببندید و سپس وضعیت پرداخت را دوباره بررسی کنید.');
        onRefresh?.();
      } else if (openResult === 'unsupported') {
        setError('این نسخه بله از پرداخت داخلی پشتیبانی نمی‌کند؛ پرداخت بانکی را انتخاب کنید.');
      } else if (openResult === 'failed') {
        setError('صفحهٔ پرداخت بله باز نشد. دوباره تلاش کنید یا درگاه بانکی را انتخاب کنید.');
        onRefresh?.();
      }
    });

  const payViaGateway = () =>
    run('gateway', async () => {
      const attempt = await createGatewayAttempt(accessToken, intent.id, crypto.randomUUID());
      trackOpenedAttempt(attempt.id);
      if (!attempt.redirectUrl) {
        setError(attempt.status === 'FAILED'
          ? 'درگاه نتوانست این پرداخت را آغاز کند. دوباره تلاش کنید.'
          : 'وضعیت پرداخت بانکی هنوز مشخص نیست؛ وضعیت آن را بررسی کنید.');
        onRefresh?.();
        return;
      }
      if (isBaleSession()) {
        if (!openBaleBrowser(attempt.redirectUrl)) {
          setError('درگاه پرداخت در بله باز نشد. دوباره روی پرداخت بانکی بزنید.');
        }
        return;
      }
      openSadadOutsideMiniApp(attempt.redirectUrl);
    });

  const cancel = () =>
    run('cancel', async () => {
      await cancelBillingIntent(accessToken, intent.id, crypto.randomUUID());
      if (onCancelled) onCancelled();
      else router.back();
    });

  return (
    <div className={styles.chooser}>
      {inBale && (
        <Script src={BALE_SDK_URL} strategy="afterInteractive"
          onReady={() => setBaleCapability(canOpenBaleInvoice() ? 'ready' : 'unsupported')}
          onError={() => setBaleCapability('unavailable')} />
      )}
      <section
        className={styles.amount}
        aria-label={isTopup ? 'مبلغ افزایش موجودی' : 'مبلغ قابل پرداخت'}
      >
        <span className={styles.receiptIcon} aria-hidden="true">
          {isTopup ? <Wallet size={24} /> : <ReceiptText size={24} />}
        </span>
        <p>{isTopup ? 'مبلغ افزایش موجودی' : 'مبلغ قابل پرداخت'}</p>
        <strong>
          <span>{formatRial(amount)}</span>
          <small>تومان</small>
        </strong>
        <div className={styles.context}>{context ?? billingPurposeLabel(intent.purpose)}</div>
        {details}
      </section>
      {bankAttempt && (
        <p
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"
        >
          {bankAttempt.status === 'REDIRECT_READY'
            ? 'providerCode' in bankAttempt && bankAttempt.providerCode === 'bale_wallet'
              ? baleInvoiceActive
                ? 'پنجرهٔ پرداخت بله باز است؛ پرداخت را همان‌جا ادامه دهید یا ببندید تا وضعیت آن بررسی شود.'
                : 'فاکتور پرداخت بله آماده است؛ می‌توانید آن را باز کنید یا پیش از تأیید پرداخت، درگاه بانکی را انتخاب کنید.'
              : 'یک پرداخت بانکی برای این سفارش باز است. با دکمهٔ زیر همان پرداخت را ادامه دهید. وضعیت به‌صورت خودکار بررسی می‌شود.'
            : 'providerCode' in bankAttempt && bankAttempt.providerCode === 'bale_wallet'
              ? 'پرداخت بله در حال تأیید نهایی است؛ تا تعیین نتیجه، روش دیگری را انتخاب نکنید.'
              : 'نتیجهٔ پرداخت بانکی در حال بررسی است. وضعیت خودکار تازه می‌شود؛ تا تعیین نتیجه، پرداخت دوباره انجام ندهید.'}
        </p>
      )}
      {isTopup && (
        <aside
          className="rounded-2xl border border-border bg-muted p-4 text-sm leading-7"
          aria-label="دربارهٔ افزایش موجودی"
        >
          <p>این مبلغ به موجودی کیف پول شما اضافه می‌شود؛ پرداخت هزینهٔ خرید یا خدمت نیست.</p>
          <p className="mt-2 text-muted-foreground">
            افزایش موجودی از پرداخت بومی بله یا درگاه بانکی انجام می‌شود.
          </p>
          <Link
            href="/profile/wallet"
            className="mt-2 inline-flex min-h-11 items-center font-bold text-primary"
          >
            مشاهدهٔ موجودی و گردش کیف پول
          </Link>
          <Link href="/" className="flex min-h-11 items-center font-bold text-primary">
            بازگشت به خانه و انتخاب خدمت
          </Link>
        </aside>
      )}
      <section className={styles.methods} aria-label="انتخاب روش پرداخت">
        <h2>روش پرداخت</h2>
        {inBale && bale?.available && !nativeBale && (
          <p role="status" className="text-sm leading-7 text-muted-foreground">
            {baleCapability === 'loading' ? 'در حال بررسی امکان پرداخت با کیف پول بله…'
              : baleCapability === 'unsupported' ? 'برای پرداخت با کیف پول بله، برنامهٔ بله را به‌روز کنید.'
              : 'ارتباط با ابزار پرداخت بله برقرار نشد.'}
          </p>
        )}
        {nativeBale && (
          <button type="button" className={`wallet-method ${styles.method}`}
            disabled={busy !== null || !bale?.available || baleInvoiceActive} onClick={() => void payViaBale()}>
            <span className="wallet-method__icon" aria-hidden="true"><Wallet size={20} /></span>
            <span className="wallet-method__body">
              <span className="wallet-method__title">پرداخت با کیف پول بله</span>
              <span className="wallet-method__hint">{baleInvoiceActive ? 'فاکتور بله باز است؛ پس از بستن آن می‌توانید دوباره تلاش کنید.' : 'ادامهٔ پرداخت در صفحهٔ کیف پول بله.'}</span>
            </span>
            {busy === 'bale' ? <HeartbeatLoader /> : <ChevronLeft size={18} aria-hidden="true" />}
          </button>
        )}
        {wallet && !isTopup && (
          <button
            type="button"
            className={`wallet-method ${styles.method}`}
            disabled={busy !== null || !canPayFromWallet}
            aria-haspopup="dialog"
            onClick={() => {
              setError(null);
              setWalletConfirmation({ id: intent.id, amountRial: intent.amountRial });
            }}
          >
            <span className="wallet-method__icon" aria-hidden="true">
              <Wallet size={20} />
            </span>
            <span className="wallet-method__body">
              <span className="wallet-method__title">پرداخت از کیف پول</span>
              <span className="wallet-method__hint">
                {balance === null ? (
                  'موجودی در دسترس نیست.'
                ) : (
                  <>موجودی: {formatRial(balance)} تومان</>
                )}
                {deficit && (
                  <span className={styles.deficit}>کسری موجودی: {formatRial(deficit)} تومان</span>
                )}
              </span>
            </span>
            {busy === 'wallet' ? (
              <HeartbeatLoader />
            ) : canPayFromWallet ? (
              <ChevronLeft size={18} aria-hidden="true" />
            ) : null}
          </button>
        )}

        {gateway && (
          <button
            type="button"
            className={`wallet-method ${styles.method}`}
            disabled={busy !== null || !gateway.available}
            onClick={() => void payViaGateway()}
          >
            <span className="wallet-method__icon" aria-hidden="true">
              <Landmark size={20} />
            </span>
            <span className="wallet-method__body">
              <span className="wallet-method__title">
                {bankAttempt?.status === 'REDIRECT_READY' && bankAttempt.providerCode === 'sadad'
                  ? 'ادامهٔ پرداخت بانکی'
                  : 'پرداخت بانکی (درگاه)'}
              </span>
              <span className="wallet-method__hint">
                {gateway.available
                  ? 'انتقال به درگاه پرداخت امن.'
                  : isTopup && !nativeBale
                    ? 'افزایش موجودی فعلاً ممکن نیست؛ درگاه بانکی برای این درخواست در دسترس نیست.'
                    : 'درگاه بانکی در حال حاضر برای این مورد در دسترس نیست.'}
              </span>
            </span>
            {busy === 'gateway' ? (
              <HeartbeatLoader />
            ) : gateway.available ? (
              <ChevronLeft size={18} aria-hidden="true" />
            ) : null}
          </button>
        )}
        {(openedIntentId === intent.id || (inBale && bankAttempt)) && (
          <Button type="button" variant="secondary" disabled={checking} onClick={() => void refreshPayment(true)}>
            {checking ? 'در حال بررسی…' : 'بررسی وضعیت پرداخت'}
          </Button>
        )}
        {paymentNotice && <p role="status" className="text-sm leading-7 text-muted-foreground">{paymentNotice}</p>}

        {!wallet && !gateway && !nativeBale && (
          <p
            role="status"
            className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground"
          >
            در حال حاضر روشی برای پرداخت در دسترس نیست.
          </p>
        )}
      </section>

      {deficit && !isTopup && !currentInvitationContext() && (
        <Button variant="secondary" className="w-full" onClick={() => setTopupOpen(true)}>
          <CreditCard size={17} aria-hidden="true" />
          افزایش موجودی کیف پول
        </Button>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy !== null || Boolean(bankAttempt)}
        onClick={() => void cancel()}
        className={styles.cancel}
        aria-busy={Boolean(busy === 'cancel')}
      >
        {busy === 'cancel' ? (
          <>
            <HeartbeatLoader />
            {'در حال لغو…'}
          </>
        ) : isTopup ? (
          'لغو درخواست شارژ'
        ) : (
          'لغو این پرداخت'
        )}
      </button>

      <AnimatePresence>
        {confirmationMatches && (
          <BottomSheet
            ref={walletSheetRef}
            title="تأیید پرداخت از کیف پول"
            onBeforeClose={() => !inFlight.current}
            onClose={() => {
              const paid = paidAfterCloseRef.current;
              paidAfterCloseRef.current = null;

              setWalletConfirmation(null);

              if (paid) {
                onPaid(paid);
              }
            }}
          >
            <div className="space-y-4 pb-2">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <Wallet size={26} />
              </div>
              <p className="text-center text-sm leading-7 text-muted-foreground">
                با تأیید شما، مبلغ زیر از کیف پولتان برداشت می‌شود.
              </p>
              <dl className="space-y-3 rounded-2xl border border-border bg-muted/50 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt>مبلغ پرداخت</dt>
                  <dd className="font-iransans-fanum text-lg text-primary">
                    {formatRial(amount)} تومان
                  </dd>
                </div>
                {balance !== null && (
                  <>
                    <div className="flex items-center justify-between gap-3 text-muted-foreground">
                      <dt>موجودی فعلی</dt>
                      <dd className="font-iransans-fanum">{formatRial(balance)} تومان</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <dt>موجودی پس از پرداخت</dt>
                      <dd className="font-iransans-fanum">
                        {deficit === null
                          ? `${formatRial(balance - amount)} تومان`
                          : 'موجودی کافی نیست'}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                >
                  {error}
                </p>
              )}
              <Button
                className="w-full"
                busy={busy !== null}
                disabled={!canPayFromWallet}
                onClick={() => void payFromWallet()}
              >
                {busy === 'wallet' ? <>در حال پرداخت…</> : 'تأیید پرداخت'}
              </Button>
            </div>
          </BottomSheet>
        )}
        {topupOpen && <TopupSheet onClose={() => setTopupOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
