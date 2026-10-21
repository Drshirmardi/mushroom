"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { ArrowDownLeft, Eye, EyeOff, History, Minus, Plus, RefreshCw, ShieldAlert, Wallet } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/skeletons";
import { TopupSheet } from "@/components/billing/topup-sheet";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, firstPage] = await Promise.all([
        getWalletSummary(authentication.accessToken),
        listWalletTransactions(authentication.accessToken, 1, PAGE_SIZE),
      ]);
      setSummary(nextSummary);
      setItems(firstPage.items);
      setTotal(firstPage.total);
      setPage(1);
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [authentication.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
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
        right={
          <button
            type="button"
            onClick={() => void load()}
            aria-label="تازه‌سازی کیف پول"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted"
          >
            <RefreshCw size={18} className="text-foreground" aria-hidden="true" />
          </button>
        }
      />
      <div className="px-4 space-y-4 pb-4 pt-4">
        {loading && !summary && <LoadingState label="در حال دریافت موجودی کیف پول…" />}

        {error && !summary && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={() => void load()} className="mr-3 font-medium text-primary">تلاش دوباره</button>
          </div>
        )}

        {summary && (
          <>
            <section aria-label="موجودی کیف پول" className="relative isolate overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(125deg,#103b63_10%,#125c78_70%,#187b85)] p-5 text-white shadow-[0_16px_36px_-20px_rgba(16,59,99,0.65)] sm:p-6">
              <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-28 -z-10 h-72 w-72 rounded-full border-[32px] border-white/[0.04]" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <Wallet size={26} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <div><p className="text-sm font-medium">کیف پول شما</p><p className="mt-1 text-[11px] text-white/75"> قابل استفاده</p></div>
                </div>
                <button type="button" aria-label={balanceVisible ? "پنهان کردن موجودی" : "نمایش موجودی"} aria-pressed={!balanceVisible} onClick={() => setBalanceVisible(value => !value)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  {balanceVisible ? <Eye size={20} strokeWidth={1.7} aria-hidden="true" /> : <EyeOff size={20} strokeWidth={1.7} aria-hidden="true" />}
                </button>
              </div>
              <div className="pb-6 pt-7">
                <p className="mb-2 text-xs text-white/80">موجودی کیف پول</p>
                <p className="flex min-h-14 flex-wrap items-baseline gap-x-2 gap-y-0 text-[clamp(26px,8vw,40px)] leading-snug font-semibold tabular-nums" style={{ fontFamily: "var(--font-iransans-fanum), sans-serif" }} data-testid="wallet-balance-value">
                  {balanceVisible ? <><bdi dir="ltr" className="min-w-0 break-all">{balance === null ? "—" : formatToman(rialToToman(balance))}</bdi><span className="font-iranyekanx text-xs font-normal text-white/80">تومان</span></> : <span aria-label="موجودی پنهان است" className="tracking-[0.18em]" dir="ltr">***</span>}
                </p>
                {balanceVisible && remainder && <p className="mt-1 text-[11px] text-white/75">به‌همراه {remainder}</p>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
                <button
                  type="button"
                  onClick={() => setTopupOpen(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-medium text-[#103b63] transition-colors hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <Plus size={18} strokeWidth={1.8} aria-hidden="true" />افزایش موجودی
                </button>
                <div className="min-w-0 text-[10px] leading-5 text-white/75"><p>{formatToman(BigInt(total))} تراکنش</p><p>به‌روزرسانی: {asOfLabel(summary.asOf)}</p></div>
              </div>
            </section>

            {summary.frozen && (
              <div role="status" className="wallet-notice wallet-notice--frozen">
                <ShieldAlert size={18} aria-hidden="true" />
                <span>خرج کردن از این کیف پول موقتاً مسدود شده است. شارژ و مشاهدهٔ گردش همچنان ممکن است؛ برای رفع مسدودی با پشتیبانی تماس بگیرید.</span>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-sm font-medium text-foreground mb-3">تراکنش‌های اخیر</p>

              {error && (
                <div role="alert" className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                  <button type="button" onClick={() => void load()} className="mr-3 font-medium text-primary">تلاش دوباره</button>
                </div>
              )}

              {items.length === 0 ? (
                <div className="py-8 text-center">
                  <History size={28} className="mx-auto mb-3 text-muted-foreground/50" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">تراکنشی وجود ندارد.</p>
                  <p className="mt-1 text-xs text-muted-foreground">تاریخچه تراکنش‌های شما اینجا نمایش داده می‌شود.</p>
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
                          {credit ? <ArrowDownLeft size={20} /> : <Minus size={20} />}
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
                >
                  {loadingMore ? "در حال دریافت…" : "نمایش تراکنش‌های بیشتر"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {topupOpen && <TopupSheet onClose={() => setTopupOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
