"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { ArrowDownLeft, History, Minus, Plus, RefreshCw, ShieldAlert } from "lucide-react";
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
            <section aria-label="موجودی کیف پول" className="rounded-2xl border border-border bg-white p-5">
              <p className="text-muted-foreground text-xs mb-2">موجودی کیف پول</p>
              <p className="flex flex-wrap items-baseline gap-2 font-iransans-fanum text-[clamp(24px,7vw,32px)] leading-relaxed font-normal tabular-nums text-primary" data-testid="wallet-balance-value">
                <bdi dir="ltr" className="break-all">{balance === null ? "—" : formatToman(rialToToman(balance))}</bdi><span className="font-iranyekanx text-xs font-normal text-muted-foreground">تومان</span>
              </p>
              {remainder && <p className="mt-1 text-xs text-muted-foreground">به‌همراه {remainder}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopupOpen(true)}
                  className="inline-flex items-center gap-1.5 min-h-11 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-white active:scale-95 transition-transform"
                >
                  <Plus size={15} aria-hidden="true" />افزایش موجودی
                </button>
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-normal text-muted-foreground">
                  {formatToman(BigInt(total))} تراکنش
                </span>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">آخرین به‌روزرسانی: {asOfLabel(summary.asOf)}</p>
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
