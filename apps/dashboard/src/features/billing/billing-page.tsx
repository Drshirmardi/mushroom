"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeftRight, CreditCard, RefreshCw, Search, ShieldAlert, Wallet } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { KpiCard, SectionCard, StatusBadge } from "@/components/shared";
import {
  billingAdminErrorMessage,
  completeBillingRefund,
  getBillingIntent,
  getBillingSummary,
  listBillingIntents,
  listBillingReconciliation,
  refundBillingIntent,
  resolveBillingAttemptFailed,
  retryBillingAttempt,
  type AdminBillingIntent,
  type BillingIntentStatus,
  type BillingIntentsQuery,
  type BillingReconciliationItem,
  type BillingSummary,
} from "@/lib/billing-admin-api";
import { formatRial, parseTomanInput } from "@/lib/wallet-money";

const PURPOSE_LABELS: Record<string, string> = { TOPUP: "شارژ", ORDER: "سفارش", APPOINTMENT: "نوبت" };
const STATUS_LABELS: Record<string, string> = { PENDING: "در انتظار", PAID: "پرداخت‌شده", EXPIRED: "منقضی", CANCELLED: "لغو", COMPENSATED: "جبران‌شده" };
const METHOD_LABELS: Record<string, string> = { WALLET: "کیف پول", GATEWAY: "درگاه", FREE: "رایگان" };
const ATTEMPT_LABELS: Record<string, string> = { CREATED: "ایجادشده", REDIRECT_READY: "آمادهٔ درگاه", CALLBACK_RECEIVED: "بازگشت دریافت شد", VERIFYING: "در حال بررسی", VERIFIED: "تأییدشده", FAILED: "ناموفق", REQUIRES_RECONCILIATION: "نیازمند بررسی" };

const dateLabel = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

type Tab = "summary" | "intents" | "reconciliation";

export function BillingPage() {
  const { authentication } = useDashboardSession();
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-7 pt-6 pb-4">
        <h1 className="text-xl font-bold">کیف پول و صورتحساب</h1>
        <p className="mt-1 text-sm text-muted-foreground">کیف پول بیماران، پرداخت‌ها و تطبیق مالی</p>
      </div>
      <div className="border-b border-border bg-card flex-shrink-0">
        <div className="flex px-7">
          {([["summary", "خلاصه"], ["intents", "پرداخت‌ها"], ["reconciliation", "تطبیق"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-4 py-3 text-xs font-semibold border-b-2 ${tab === id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-7">
        {tab === "summary" && <BillingSummaryView accessToken={authentication.accessToken} />}
        {tab === "intents" && <IntentsView accessToken={authentication.accessToken} />}
        {tab === "reconciliation" && <ReconciliationView accessToken={authentication.accessToken} />}
      </div>
    </div>
  );
}

function BillingSummaryView({ accessToken }: { accessToken: string }) {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getBillingSummary(accessToken);
      setSummary(data);
      setError(null);
    } catch (cause) {
      setError(billingAdminErrorMessage(cause));
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    void getBillingSummary(accessToken)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(billingAdminErrorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!summary && !error) return <p className="text-sm text-muted-foreground">در حال دریافت خلاصهٔ مالی…</p>;
  if (error && !summary) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => void load()} className="mr-3 font-bold underline">تلاش دوباره</button></div>;
  if (!summary) return null;

  const rial = (value: string) => formatRial(BigInt(value));
  const cards = [
    { title: "تعهد کیف پول (مانده)", value: rial(summary.walletLiabilityRial), icon: Wallet, iconBg: "bg-blue-50 text-blue-700" },
    { title: "دریافتی درگاه", value: rial(summary.gatewayReceivedRial), icon: CreditCard, iconBg: "bg-emerald-50 text-emerald-700" },
    { title: "شارژ (topup)", value: rial(summary.topupReceivedRial), icon: CreditCard, iconBg: "bg-sky-50 text-sky-700" },
    { title: "فروش سفارش", value: rial(summary.orderPaidRial), icon: CreditCard, iconBg: "bg-violet-50 text-violet-700" },
    { title: "پرداخت نوبت", value: rial(summary.appointmentPaidRial), icon: CreditCard, iconBg: "bg-amber-50 text-amber-700" },
    { title: "بازپرداخت", value: rial(summary.refundedRial), icon: ArrowLeftRight, iconBg: "bg-rose-50 text-rose-700" },
    { title: "اعتبار ادمین", value: rial(summary.administrativeCreditRial), icon: CreditCard, iconBg: "bg-teal-50 text-teal-700" },
    { title: "کسر ادمین", value: rial(summary.administrativeDebitRial), icon: CreditCard, iconBg: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>به‌روزرسانی: {dateLabel(summary.asOf)}</span>
        <button onClick={() => void load()} className="flex items-center gap-1 font-semibold text-primary"><RefreshCw size={13} />تازه‌سازی</button>
      </div>

      {summary.ledgerMismatchCount > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{summary.ledgerMismatchCount.toLocaleString("fa-IR")} مورد اختلاف دفتر مالی شناسایی شده است؛ بررسی و اصلاح با سند معکوس لازم است.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <KpiCard key={card.title} title={card.title} value={card.value} icon={card.icon} iconBg={card.iconBg} />
        ))}
      </div>
    </div>
  );
}

function IntentsView({ accessToken }: { accessToken: string }) {
  const [purpose, setPurpose] = useState<"" | "TOPUP" | "ORDER" | "APPOINTMENT">("");
  const [status, setStatus] = useState<"" | BillingIntentStatus>("");
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState<AdminBillingIntent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminBillingIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterQuery = (pageNumber: number): BillingIntentsQuery => ({
    page: pageNumber,
    pageSize: 20,
    ...(purpose ? { purpose } : {}),
    ...(status ? { status } : {}),
    ...(patientId.trim() ? { patientId: patientId.trim() } : {}),
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listBillingIntents(accessToken, filterQuery(1));
      setItems(next.items);
      setTotal(next.total);
      setPage(1);
      setSelected(null);
    } catch (cause) {
      setError(billingAdminErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    try {
      const next = await listBillingIntents(accessToken, filterQuery(page + 1));
      setItems((current) => [...current, ...next.items]);
      setPage(page + 1);
    } catch (cause) {
      setError(billingAdminErrorMessage(cause));
    }
  };

  useEffect(() => {
    let cancelled = false;
    void listBillingIntents(accessToken, { page: 1, pageSize: 20 })
      .then((next) => {
        if (cancelled) return;
        setItems(next.items);
        setTotal(next.total);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(billingAdminErrorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const open = async (intent: AdminBillingIntent) => {
    try {
      setSelected(await getBillingIntent(accessToken, intent.id));
    } catch (cause) {
      setError(billingAdminErrorMessage(cause));
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard title="فیلتر پرداخت‌ها">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={purpose} onChange={(event) => setPurpose(event.target.value as never)} className="rounded-lg border border-border bg-card p-2 text-sm">
            <option value="">همهٔ اهداف</option>
            <option value="TOPUP">شارژ</option>
            <option value="ORDER">سفارش</option>
            <option value="APPOINTMENT">نوبت</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as never)} className="rounded-lg border border-border bg-card p-2 text-sm">
            <option value="">همهٔ وضعیت‌ها</option>
            <option value="PENDING">در انتظار</option>
            <option value="PAID">پرداخت‌شده</option>
            <option value="EXPIRED">منقضی</option>
            <option value="CANCELLED">لغو</option>
            <option value="COMPENSATED">جبران‌شده</option>
          </select>
          <input value={patientId} onChange={(event) => setPatientId(event.target.value)} placeholder="شناسهٔ بیمار (uuid)" dir="ltr" className="rounded-lg border border-border bg-card p-2 text-sm" />
          <button onClick={() => void load()} className="flex items-center justify-center gap-1 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground"><Search size={14} />اعمال فیلتر</button>
        </div>
      </SectionCard>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <SectionCard title={`پرداخت‌ها (${total.toLocaleString("fa-IR")})`}>
        {loading ? (
          <p className="text-sm text-muted-foreground">در حال دریافت…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">هیچ پرداختی با این فیلتر پیدا نشد.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-right font-semibold">هدف</th>
                  <th className="px-4 py-2.5 text-right font-semibold">وضعیت</th>
                  <th className="px-4 py-2.5 text-right font-semibold">روش</th>
                  <th className="px-4 py-2.5 text-right font-semibold">مبلغ</th>
                  <th className="px-4 py-2.5 text-right font-semibold">بیمار</th>
                  <th className="px-4 py-2.5 text-right font-semibold">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((intent) => (
                  <tr key={intent.id} onClick={() => void open(intent)} className="cursor-pointer hover:bg-muted/40">
                    <td className="px-4 py-2.5">{PURPOSE_LABELS[intent.purpose] ?? intent.purpose}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={STATUS_LABELS[intent.status] ?? intent.status} /></td>
                    <td className="px-4 py-2.5">{intent.method ? METHOD_LABELS[intent.method] ?? intent.method : "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatRial(BigInt(intent.amountRial))}</td>
                    <td className="px-4 py-2.5 font-mono text-xs" dir="ltr">{intent.patientId.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{dateLabel(intent.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {items.length < total && (
          <button onClick={() => void loadMore()} className="mt-3 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground">نمایش بیشتر</button>
        )}
      </SectionCard>

      {selected && <IntentDetail accessToken={accessToken} intent={selected} onChanged={(next) => setSelected(next)} />}
    </div>
  );
}

function IntentDetail({ accessToken, intent, onChanged }: { accessToken: string; intent: AdminBillingIntent; onChanged: (next: AdminBillingIntent) => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Record<string, string>>({});

  const refresh = async () => onChanged(await getBillingIntent(accessToken, intent.id));

  const refunded = (intent.refunds ?? []).filter((refund) => ["COMPLETED", "MANUAL_REQUIRED"].includes(refund.status)).reduce((sum, refund) => sum + BigInt(refund.amountRial), BigInt(0));
  const remaining = BigInt(intent.amountRial) - refunded;
  const parsed = parseTomanInput(amount);
  const toman = parsed.ok ? parsed.toman : null;
  const refundRial = toman === null ? null : toman * BigInt(10);
  const valid = intent.status === "PAID" && intent.purpose !== "TOPUP" && toman !== null && toman > BigInt(0) && refundRial !== null && refundRial <= remaining && reason.trim().length > 0;

  const submitRefund = async () => {
    if (!valid || refundRial === null) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await refundBillingIntent(accessToken, intent.id, { amountRial: refundRial.toString(), reason: reason.trim() }, crypto.randomUUID());
      setAmount("");
      setReason("");
      setMessage("بازپرداخت ثبت شد.");
      await refresh();
    } catch (cause) {
      setError(billingAdminErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="جزئیات پرداخت">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
        <div><span className="block text-xs text-muted-foreground">هدف</span><span className="font-semibold">{PURPOSE_LABELS[intent.purpose] ?? intent.purpose}</span></div>
        <div><span className="block text-xs text-muted-foreground">وضعیت</span><StatusBadge status={STATUS_LABELS[intent.status] ?? intent.status} /></div>
        <div><span className="block text-xs text-muted-foreground">روش</span><span className="font-semibold">{intent.method ? METHOD_LABELS[intent.method] ?? intent.method : "—"}</span></div>
        <div><span className="block text-xs text-muted-foreground">مبلغ</span><span className="font-semibold tabular-nums">{formatRial(BigInt(intent.amountRial))}</span></div>
        <div><span className="block text-xs text-muted-foreground">بیمار</span><span className="font-mono text-xs" dir="ltr">{intent.patientId}</span></div>
        <div><span className="block text-xs text-muted-foreground">پرداخت‌شده</span><span>{dateLabel(intent.paidAt)}</span></div>
        <div><span className="block text-xs text-muted-foreground">انقضا</span><span>{dateLabel(intent.expiresAt)}</span></div>
        <div><span className="block text-xs text-muted-foreground">شناسه</span><span className="font-mono text-xs" dir="ltr">{intent.id.slice(0, 8)}</span></div>
      </div>

      {intent.attempts && intent.attempts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-muted-foreground">تلاش‌های درگاه</p>
          <div className="space-y-2">
            {intent.attempts.map((attempt) => (
              <div key={attempt.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border p-3 text-xs">
                <span>{ATTEMPT_LABELS[attempt.status] ?? attempt.status}</span>
                {attempt.traceNumber && <span className="text-muted-foreground" dir="ltr">{attempt.traceNumber}</span>}
                <span className="text-muted-foreground">{dateLabel(attempt.verifiedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {intent.refunds && intent.refunds.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-muted-foreground">بازپرداخت‌ها</p>
          <div className="space-y-2">
            {intent.refunds.map((refund) => (
              <div key={refund.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border p-3 text-xs">
                <span className="font-semibold tabular-nums">{formatRial(BigInt(refund.amountRial))}</span>
                <span className="text-muted-foreground">{refund.status}</span>
                <span className="text-muted-foreground">{dateLabel(refund.completedAt)}</span>
                {refund.status === "MANUAL_REQUIRED" && (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      value={evidence[refund.id] ?? ""}
                      onChange={(event) => setEvidence((current) => ({ ...current, [refund.id]: event.target.value }))}
                      placeholder="مرجع غیرحساس انتقال بانکی"
                      className="flex-1 rounded-lg border border-border bg-card p-1.5 text-xs"
                    />
                    <button
                      onClick={async () => {
                        try { await completeBillingRefund(accessToken, refund.id, (evidence[refund.id] ?? "").trim() || "manual", crypto.randomUUID()); await refresh(); }
                        catch (cause) { setError(billingAdminErrorMessage(cause)); }
                      }}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      تکمیل
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {intent.status === "PAID" && intent.purpose !== "TOPUP" && (
        <div className="mt-4 rounded-xl border border-border p-4">
          <p className="mb-1 text-xs text-muted-foreground">مبلغ قابل بازپرداخت: <strong className="tabular-nums">{formatRial(remaining)}</strong></p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <input inputMode="numeric" dir="ltr" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="مبلغ به تومان" className="rounded-lg border border-border bg-card p-2 text-sm tabular-nums" />
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="دلیل بازپرداخت (الزامی)" className="rounded-lg border border-border bg-card p-2 text-sm" />
            <button disabled={!valid || busy} onClick={() => void submitRefund()} className="flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}ثبت بازپرداخت
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-xs text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
    </SectionCard>
  );
}

function ReconciliationView({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<BillingReconciliationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const next = await listBillingReconciliation(accessToken, 1, 50);
      setItems(next.items);
      setError(null);
    } catch (cause) {
      setError(billingAdminErrorMessage(cause));
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    void listBillingReconciliation(accessToken, 1, 50)
      .then((next) => {
        if (cancelled) return;
        setItems(next.items);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(billingAdminErrorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const resolve = async (attempt: BillingReconciliationItem) => {
    try {
      await resolveBillingAttemptFailed(accessToken, attempt.id, (evidence[attempt.id] ?? "").trim() || "reviewed", crypto.randomUUID());
      await load();
    } catch (cause) {
      setError(billingAdminErrorMessage(cause));
    }
  };

  const retry = async (attemptId: string) => {
    try {
      await retryBillingAttempt(accessToken, attemptId, crypto.randomUUID());
      await load();
    } catch (cause) {
      setError(billingAdminErrorMessage(cause));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">تلاش‌های درگاه که نیاز به بررسی یا Verify مجدد دارند.</p>
        <button onClick={() => void load()} className="flex items-center gap-1 text-xs font-semibold text-primary"><RefreshCw size={13} />تازه‌سازی</button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground"><ShieldAlert size={18} />موردی برای تطبیق وجود ندارد.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-right font-semibold">وضعیت</th>
                <th className="px-4 py-2.5 text-right font-semibold">OrderId درگاه</th>
                <th className="px-4 py-2.5 text-right font-semibold">کد نتیجه</th>
                <th className="px-4 py-2.5 text-right font-semibold">مبلغ</th>
                <th className="px-4 py-2.5 text-right font-semibold">شماره پیگیری</th>
                <th className="px-4 py-2.5 text-right font-semibold">اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((attempt) => (
                <tr key={attempt.id}>
                  <td className="px-4 py-2.5"><StatusBadge status={ATTEMPT_LABELS[attempt.status] ?? attempt.status} /></td>
                  <td className="px-4 py-2.5 font-mono text-xs" dir="ltr">{attempt.providerOrderId}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" dir="ltr">{attempt.resultCode ?? "—"}</td>
                  <td className="px-4 py-2.5 tabular-nums">{formatRial(BigInt(attempt.amountRial))}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" dir="ltr">{attempt.traceNumber ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => void retry(attempt.id)} className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary">Verify مجدد</button>
                      {attempt.status === "REQUIRES_RECONCILIATION" && (
                        <>
                          <input
                            value={evidence[attempt.id] ?? ""}
                            onChange={(event) => setEvidence((current) => ({ ...current, [attempt.id]: event.target.value }))}
                            placeholder="سند غیرحساس بررسی"
                            className="rounded-lg border border-border bg-card p-1.5 text-xs"
                          />
                          <button onClick={() => void resolve(attempt)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">ثبت شکست</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
