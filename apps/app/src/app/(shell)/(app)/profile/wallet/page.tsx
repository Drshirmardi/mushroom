"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { EyeOff } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/skeletons";
import { TopupSheet } from "@/components/billing/topup-sheet";
import { StoreIcon } from "@/components/store/store-icon";
import { getWalletSummary, listWalletTransactions, walletErrorMessage, type WalletSummary, type WalletTransaction } from "@/lib/wallet-billing-api";
import { walletKindLabel, transactionDirection } from "@/lib/wallet-labels";
import { formatSignedToman, formatToman, rialRemainderLabel, rialToToman } from "@/lib/wallet-money";

const PAGE_SIZE = 20;

const asOfLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export default function WalletPage() {
  const { authentication } = useAuthSession();
  const router = useRouter();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const requestInFlight = useRef(false);
  const loadMoreInFlight = useRef(false);
  const hasLoadedSummary = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (requestInFlight.current || loadMoreInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    if (!quiet) setError(null);
    try {
      const [nextSummary, firstPage] = await Promise.all([
        getWalletSummary(authentication.accessToken),
        listWalletTransactions(authentication.accessToken, 1, PAGE_SIZE),
      ]);
      setSummary(nextSummary);
      hasLoadedSummary.current = true;
      setItems(firstPage.items);
      setTotal(firstPage.total);
      setPage(1);
      setError(null);
    } catch (cause) {
      // Keep the last successful wallet view stable if a background refresh fails.
      if (!quiet || !hasLoadedSummary.current) setError(walletErrorMessage(cause));
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }, [authentication.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (topupOpen) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (stopped || document.visibilityState !== "visible") return;
      timer = setTimeout(async () => {
        if (loadMoreInFlight.current) {
          schedule();
          return;
        }
        await load(true);
        schedule();
      }, 10_000);
    };

    const handleVisibilityChange = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      // Resume with a full interval; returning to the tab never triggers a burst request.
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [load, topupOpen]);

  const loadMore = async () => {
    if (loadMoreInFlight.current || requestInFlight.current) return;
    loadMoreInFlight.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const next = await listWalletTransactions(authentication.accessToken, page + 1, PAGE_SIZE);
      setItems((current) => [...current, ...next.items]);
      setTotal(next.total);
      setPage(page + 1);
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      loadMoreInFlight.current = false;
      setLoadingMore(false);
    }
  };

  const balance = summary ? BigInt(summary.balanceRial) : null;
  const remainder = balance === null ? null : rialRemainderLabel(balance);
  const hasMore = items.length < total;

  return (
    <div className="profile-scope font-iranyekanx [--font-weight-medium:500] [--font-weight-bold:500]">
      <PageHeader
        title="کیف پول"
        onBack={() => router.back()}
      />
      <div className="px-4 space-y-4 pb-4 pt-4">
        {loading && !summary && <LoadingState label="در حال دریافت موجودی کیف پول…" variant="payment" />}

        {error && !summary && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={() => void load()} className="mr-3 font-medium text-primary">تلاش دوباره</button>
          </div>
        )}

        {summary && (
          <>
            <section aria-label="موجودی کیف پول" className="relative isolate overflow-hidden rounded-[24px] border border-[#dbe8f2] bg-[linear-gradient(125deg,#f0f7fb_0%,#eff8f5_55%,#edf2ff_100%)] p-4 text-[#193d5b] shadow-[0_10px_26px_-22px_rgba(24,62,96,0.38)] sm:p-5">
              <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-36 -z-10 h-64 w-64 rounded-full border-[28px] border-[#315d91]/[0.035]" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d7e5ef] bg-white/75 text-[#2c5d87]">
                    <StoreIcon name="wallet" size={26} />
                  </span>
                  <div><p className="text-sm font-semibold">کیف پول شما</p><p className="mt-1 text-[11px] text-[#698197]">قابل استفاده</p></div>
                </div>
                <button type="button" aria-label={loading ? "در حال به‌روزرسانی کیف پول" : balanceVisible ? "پنهان کردن موجودی" : "نمایش موجودی"} aria-pressed={!balanceVisible} aria-busy={loading} disabled={loading} onClick={() => setBalanceVisible(value => !value)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#476b88] transition-colors hover:bg-white/70 hover:text-[#214f79] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-brand)] disabled:cursor-wait">
                  {loading ? <HeartbeatLoader className="!m-0 !h-5 !w-7" /> : balanceVisible ? <StoreIcon name="eye" size={19} /> : <EyeOff size={19} strokeWidth={1.7} aria-hidden="true" />}
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 text-right">
                  <p className="mb-1 text-[11px] text-[#698197]">موجودی کیف پول</p>
                  <p className="flex min-h-10 flex-wrap items-baseline gap-x-2 gap-y-0 text-[clamp(24px,7vw,32px)] leading-snug font-semibold tabular-nums" style={{ fontFamily: "var(--font-iransans-fanum), sans-serif" }} data-testid="wallet-balance-value">
                    {balanceVisible ? <><bdi dir="ltr" className="min-w-0 break-all">{balance === null ? "—" : formatToman(rialToToman(balance))}</bdi><span className="font-iranyekanx text-[11px] font-normal text-[#698197]">تومان</span></> : <span aria-label="موجودی پنهان است" className="tracking-[0.18em]" dir="ltr">***</span>}
                  </p>
                  {balanceVisible && remainder && <p className="mt-0.5 text-[10px] text-[#698197]">به‌همراه {remainder}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setTopupOpen(true)}
                  aria-label="افزودن موجودی به کیف پول"
                  className="group flex min-w-20 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium text-[#315f88] transition-colors hover:text-[#174b7a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dp-brand)]"
                >
                  <StoreIcon name="walletIn" size={32} />
                  <span>افزودن موجودی</span>
                </button>
              </div>
              <p className="mt-3 text-left text-[9px] leading-4 text-[#7890a3]">به‌روزرسانی: {asOfLabel(summary.asOf)}</p>
            </section>

            {summary.frozen && (
              <div role="status" className="wallet-notice wallet-notice--frozen">
                <StoreIcon name="shieldLock" size={18} />
                <span>خرج کردن از این کیف پول موقتاً مسدود شده است. شارژ و مشاهدهٔ گردش همچنان ممکن است؛ برای رفع مسدودی با پشتیبانی تماس بگیرید.</span>
              </div>
            )}

            <section aria-labelledby="wallet-recent-transactions" className="space-y-3">
              <h2 id="wallet-recent-transactions" className="flex items-center gap-2 px-1 text-sm font-medium text-foreground"><StoreIcon name="transaction" size={19} />تراکنش‌های اخیر</h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-white p-4">

                {error && (
                  <div role="alert" className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                    <button type="button" onClick={() => void load()} className="mr-3 font-medium text-primary">تلاش دوباره</button>
                  </div>
                )}

                {items.length === 0 ? (
                  <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                    <span className="grid size-[72px] place-items-center rounded-full bg-[var(--dp-surface-back)] text-[var(--dp-text-low)] ring-1 ring-inset ring-border/70" aria-hidden="true">
                      <StoreIcon name="receiptBillSearch" size={38} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">هنوز تراکنشی ندارید!</p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">برای مشاهده این بخش، یک تراکنش جدید انجام دهید.</p>
                    </div>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((item) => {
                      const credit = transactionDirection(item.deltaRial) === "credit";
                      return (
                        <li key={item.id} className="flex items-center gap-3 py-3">
                          <span
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${credit ? "bg-emerald-50 text-emerald-600" : "bg-muted text-foreground"}`}
                            aria-hidden="true"
                          >
                            {credit ? (
                              <StoreIcon name="walletIn" size={20} />
                            ) : (
                              <span className="relative inline-flex size-6 items-center justify-center" aria-hidden="true">
                                <StoreIcon name="wallet" size={20} />
                                <span className="absolute -bottom-0.5 -left-1 grid size-3 place-items-center rounded-full bg-muted">
                                  <StoreIcon name="minus" size={9} />
                                </span>
                              </span>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{walletKindLabel(item.kind)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{asOfLabel(item.createdAt)}</p>
                          </div>
                          <div className="min-w-0 max-w-[48%] break-words text-left">
                            <p dir="ltr" className={`font-iransans-fanum text-sm font-normal tabular-nums ${credit ? "text-emerald-600" : "text-foreground"}`}>
                              {formatSignedToman(BigInt(item.deltaRial))}
                            </p>
                            <p className="font-iransans-fanum mt-0.5 text-[11px] leading-5 text-muted-foreground tabular-nums">
                              مانده: {formatToman(rialToToman(BigInt(item.balanceAfterRial)))}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {hasMore && (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                    className="mt-3 w-full rounded-2xl border border-border bg-white py-3 text-sm font-medium text-foreground disabled:opacity-50"
                    aria-busy={Boolean(loadingMore)}
                  >
                    {loadingMore ? <><HeartbeatLoader />{"در حال دریافت…"}</> : "نمایش تراکنش‌های بیشتر"}
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <AnimatePresence>
        {topupOpen && <TopupSheet onClose={() => setTopupOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
