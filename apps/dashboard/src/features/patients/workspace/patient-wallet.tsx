"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Lock, Plus, RefreshCw, ShieldAlert, Unlock, Wallet } from "lucide-react";
import { KpiCard, SectionCard, StatusBadge } from "@/components/shared";
import {
  adjustAdminWallet,
  createAdminAppointmentIntent,
  getAdminWallet,
  listAdminWalletTransactions,
  listDoctorServicesForBooking,
  setAdminWalletStatus,
  walletAdminErrorMessage,
  type AdminWalletSummary,
  type AdminWalletTransaction,
  type DoctorService,
} from "@/lib/patient-wallet-api";
import { formatRial, formatSignedToman, parseTomanInput } from "@/lib/wallet-money";

const KIND_LABELS: Record<string, string> = {
  TOPUP: "شارژ کیف پول",
  PAYMENT: "پرداخت از کیف پول",
  REFUND: "بازگشت وجه",
  ADMIN_CREDIT: "افزایش توسط مدیریت",
  ADMIN_DEBIT: "کاهش توسط مدیریت",
  LATE_PAYMENT_CREDIT: "جبران واریز دیرهنگام",
};

const PAGE_SIZE = 20;

const dateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export function PatientWallet({ patientId, accessToken }: { patientId: string; accessToken: string }) {
  const [summary, setSummary] = useState<AdminWalletSummary | null>(null);
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextSummary, firstPage] = await Promise.all([
        getAdminWallet(accessToken, patientId),
        listAdminWalletTransactions(accessToken, patientId, 1, PAGE_SIZE),
      ]);
      setSummary(nextSummary);
      setTransactions(firstPage.items);
      setTotal(firstPage.total);
      setPage(1);
      setError(null);
    } catch (cause) {
      setError(walletAdminErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [accessToken, patientId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getAdminWallet(accessToken, patientId),
      listAdminWalletTransactions(accessToken, patientId, 1, PAGE_SIZE),
    ])
      .then(([nextSummary, firstPage]) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setTransactions(firstPage.items);
        setTotal(firstPage.total);
        setPage(1);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(walletAdminErrorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, patientId]);

  const loadMore = async () => {
    try {
      const next = await listAdminWalletTransactions(accessToken, patientId, page + 1, PAGE_SIZE);
      setTransactions((current) => [...current, ...next.items]);
      setTotal(next.total);
      setPage(page + 1);
    } catch (cause) {
      setError(walletAdminErrorMessage(cause));
    }
  };

  const refreshSummary = async () => {
    const next = await getAdminWallet(accessToken, patientId);
    setSummary(next);
    return next;
  };

  if (loading && !summary) return <p className="text-sm text-muted-foreground">در حال دریافت کیف پول بیمار…</p>;
  if (error && !summary) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => void load()} className="mr-3 font-bold underline">تلاش دوباره</button></div>;
  if (!summary) return null;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          title="موجودی کیف پول"
          value={formatRial(BigInt(summary.balanceRial))}
          sub={`نسخه ${summary.version} · ${dateLabel(summary.asOf)}`}
          icon={Wallet}
          iconBg="bg-blue-50 text-blue-700"
        />
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">وضعیت خرج</p>
            <StatusBadge status={summary.frozen ? "مسدود" : "فعال"} />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {summary.frozen
              ? "کیف پول این بیمار برای خرج مسدود است؛ شارژ و اصلاحات ادمین همچنان ممکن است."
              : "بیمار می‌تواند از این موجودی برای پرداخت سفارش و نوبت استفاده کند."}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">گردش ثبت‌شده</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{total.toLocaleString("fa-IR")}</p>
          <p className="mt-1 text-xs text-muted-foreground">تراکنش مالی</p>
        </div>
      </div>

      {summary.frozen && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>کیف پول مسدود است. تا رفع مسدودی، بیمار نمی‌تواند از آن خرج کند.</span>
        </div>
      )}

      <AdjustmentForm
        patientId={patientId}
        accessToken={accessToken}
        summary={summary}
        onChanged={async () => {
          await refreshSummary();
          await load();
        }}
      />

      <FreezeControl patientId={patientId} accessToken={accessToken} summary={summary} onChanged={async () => { await refreshSummary(); }} />

      <AppointmentIntentForm patientId={patientId} accessToken={accessToken} onCreated={load} />

      <SectionCard title="گردش مالی">
        {error && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">برای این بیمار گردش مالی ثبت نشده است.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-right font-semibold">نوع</th>
                  <th className="px-4 py-2.5 text-right font-semibold">مبلغ</th>
                  <th className="px-4 py-2.5 text-right font-semibold">مانده پس از</th>
                  <th className="px-4 py-2.5 text-right font-semibold">عامل / دلیل</th>
                  <th className="px-4 py-2.5 text-right font-semibold">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5">{KIND_LABELS[item.kind] ?? "گردش مالی"}</td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums" dir="ltr">{formatSignedToman(BigInt(item.deltaRial))}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{formatRial(BigInt(item.balanceAfterRial))}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.actorDisplayName ?? "—"}{item.reason ? ` · ${item.reason}` : ""}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{dateLabel(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {transactions.length < total && (
          <button onClick={() => void loadMore()} className="mt-3 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground">نمایش بیشتر</button>
        )}
      </SectionCard>
    </div>
  );
}

type AdjustmentType = "CREDIT" | "DEBIT" | "SET_BALANCE";

function AdjustmentForm({ patientId, accessToken, summary, onChanged }: { patientId: string; accessToken: string; summary: AdminWalletSummary; onChanged: () => Promise<void> }) {
  const [type, setType] = useState<AdjustmentType>("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<{ payload: string; key: string } | null>(null);

  const balance = BigInt(summary.balanceRial);
  const parsed = parseTomanInput(amount);
  const toman = parsed.ok ? parsed.toman : null;
  const positive = type === "SET_BALANCE" ? toman !== null && toman >= BigInt(0) : toman !== null && toman > BigInt(0);
  const deltaRial = toman === null ? null : type === "CREDIT" ? toman * BigInt(10) : type === "DEBIT" ? -toman * BigInt(10) : toman * BigInt(10) - balance;
  const after = deltaRial === null ? null : balance + deltaRial;
  const overspend = type === "DEBIT" && after !== null && after < BigInt(0);
  const valid = positive && reason.trim().length > 0 && !overspend;

  const submit = async () => {
    if (!valid || toman === null) return;
    const payload = JSON.stringify({ type, amount: toman.toString(), reason: reason.trim() });
    if (keyRef.current?.payload !== payload) keyRef.current = { payload, key: crypto.randomUUID() };
    setBusy(true);
    setError(null);
    try {
      await adjustAdminWallet(accessToken, patientId, { type, amountToman: toman.toString(), expectedVersion: summary.version, reason: reason.trim() }, keyRef.current.key);
      keyRef.current = null;
      setAmount("");
      setReason("");
      await onChanged();
    } catch (cause) {
      if (cause instanceof Error && (cause as { code?: string }).code === "WALLET_VERSION_CONFLICT") {
        await onChanged();
        setError("موجودی کیف پول در فاصلهٔ نمایش و ثبت تغییر کرد. پیش‌نمایش با موجودی جدید به‌روز شد؛ لطفاً دوباره تصمیم بگیرید.");
      } else {
        setError(walletAdminErrorMessage(cause));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="تغییر موجودی بیمار">
      <div className="space-y-3">
        <div className="flex gap-2">
          {(["CREDIT", "DEBIT", "SET_BALANCE"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold ${type === value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
            >
              {value === "CREDIT" ? "افزایش" : value === "DEBIT" ? "کاهش" : "تعیین موجودی نهایی"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="adjust-amount" className="mb-1 block text-xs font-bold text-muted-foreground">مبلغ (تومان)</label>
            <input
              id="adjust-amount"
              inputMode="numeric"
              dir="ltr"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={type === "SET_BALANCE" ? "موجودی هدف به تومان" : "مبلغ به تومان"}
              className="w-full rounded-lg border border-border bg-card p-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="adjust-reason" className="mb-1 block text-xs font-bold text-muted-foreground">دلیل (الزامی)</label>
            <input
              id="adjust-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="مثلاً شارژ دستی یا اصلاح"
              className="w-full rounded-lg border border-border bg-card p-2 text-sm"
            />
          </div>
        </div>

        {toman !== null && positive && (
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="text-xs text-muted-foreground">پیش‌نمایش:</p>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>قبل: <strong>{formatRial(balance)}</strong></span>
              <span>تغییر: <strong className="tabular-nums" dir="ltr">{deltaRial === null ? "—" : formatSignedToman(deltaRial)}</strong></span>
              <span>بعد: <strong>{after === null ? "—" : formatRial(after)}</strong></span>
            </div>
          </div>
        )}
        {overspend && <p role="alert" className="text-xs font-bold text-red-600">کاهش بیش از موجودی قابل استفاده مجاز نیست.</p>}

        {error && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}

        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => void submit()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          {busy ? "در حال ثبت…" : "ثبت تغییر موجودی"}
        </button>
      </div>
    </SectionCard>
  );
}

function FreezeControl({ patientId, accessToken, summary, onChanged }: { patientId: string; accessToken: string; summary: AdminWalletSummary; onChanged: () => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await setAdminWalletStatus(accessToken, patientId, { frozen: !summary.frozen, reason: reason.trim(), expectedVersion: summary.version }, crypto.randomUUID());
      setReason("");
      await onChanged();
    } catch (cause) {
      setError(walletAdminErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title={summary.frozen ? "رفع مسدودی کیف پول" : "مسدود کردن کیف پول"}>
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="دلیل مسدودی/رفع مسدودی (الزامی)" className="w-full rounded-lg border border-border bg-card p-2 text-sm" />
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => void submit()}
            className={`flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50 ${summary.frozen ? "bg-primary text-primary-foreground" : "border border-red-500 text-red-600"}`}
          >
            {busy ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : summary.frozen ? <Unlock size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
            {summary.frozen ? "آزاد کردن" : "مسدود کردن"}
          </button>
        </div>
        {error && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
      </div>
    </SectionCard>
  );
}

function AppointmentIntentForm({ patientId, accessToken, onCreated }: { patientId: string; accessToken: string; onCreated: () => Promise<void> }) {
  const [offerings, setOfferings] = useState<DoctorService[] | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; amountRial: string; expiresAt: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listDoctorServicesForBooking(accessToken).then(
      (pageData) => { if (!cancelled) setOfferings(pageData.items.filter((item) => item.isActive && item.publicationStatus === "PUBLISHED")); },
      (cause: unknown) => { if (!cancelled) setError(walletAdminErrorMessage(cause)); },
    );
    return () => { cancelled = true; };
  }, [accessToken]);

  const submit = async () => {
    if (!serviceId || !startsAt) return;
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) {
      setError("زمان شروع معتبر نیست.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const intent = await createAdminAppointmentIntent(accessToken, patientId, { doctorServiceId: serviceId, startsAt: date.toISOString() }, crypto.randomUUID());
      setResult({ id: intent.id, amountRial: intent.amountRial, expiresAt: intent.expiresAt });
      await onCreated();
    } catch (cause) {
      setError(walletAdminErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="ایجاد intent نوبت برای بیمار">
      <p className="mb-3 text-xs leading-6 text-muted-foreground">این کار یک رزرو موقت با قیمت snapshot ایجاد می‌کند؛ بیمار باید پرداخت کامل را انجام دهد تا نوبت نهایی شود.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="appt-service" className="mb-1 block text-xs font-bold text-muted-foreground">پزشک و خدمت</label>
          <select id="appt-service" value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="w-full rounded-lg border border-border bg-card p-2 text-sm">
            <option value="">انتخاب خدمت…</option>
            {(offerings ?? []).map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.doctor.name} · {offering.service.name} · {formatRial(BigInt(offering.priceAmount))} · {offering.visitMode === "IN_PERSON" ? "حضوری" : "آنلاین"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="appt-starts-at" className="mb-1 block text-xs font-bold text-muted-foreground">زمان شروع</label>
          <input id="appt-starts-at" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-border bg-card p-2 text-sm" />
        </div>
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          intent با شناسهٔ <span className="font-mono" dir="ltr">{result.id}</span> به مبلغ {formatRial(BigInt(result.amountRial))} ایجاد شد{result.expiresAt ? ` و تا ${dateLabel(result.expiresAt)} اعتبار دارد` : ""}.
        </div>
      )}

      <button
        type="button"
        disabled={busy || !serviceId || !startsAt || !offerings}
        onClick={() => void submit()}
        className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : <CreditCard size={14} aria-hidden="true" />}
        {busy ? "در حال ایجاد…" : "ایجاد intent نوبت"}
      </button>
    </SectionCard>
  );
}
