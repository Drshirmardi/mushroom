"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  ChevronLeft,
  Edit2,
  FileText,
  HeartPulse,
  History,
  LogOut,
  Package,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { toP } from "@/lib/format";
import { loadOnboardingStatus, loadSelfProfile, onboardingErrorMessage, type OnboardingStatus, type SelfProfile } from "@/lib/onboarding/patient-onboarding";

/**
 * Icon-chip tones mirror the store's actual accent language:
 * - rose: badges / wishlist-heart red (پیگیری سفارش)
 * - amber: rating-star gold (کیف پول)
 * - soft: neutral product-card surface (everything else)
 */
type Tone = "soft" | "rose" | "amber";

const TONES: Record<Tone, string> = {
  soft: "bg-muted text-foreground",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
};

/** Same red gradient as the store's incredible-offers panel. */
const OFFERS_RED = "linear-gradient(225deg, #d22c4e 0%, #ee384e 100%)";

function MenuRow({ icon: Icon, label, hint, tone = "soft", onClick }: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  tone?: Tone;
  onClick: () => void;
}) {
  return <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 p-4 text-right transition-colors active:bg-muted"
  >
    <span className={`rounded-xl p-2 ${TONES[tone]}`}><Icon size={17} aria-hidden="true" /></span>
    <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    <ChevronLeft size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
  </button>;
}

function Caption({ children }: { children: string }) {
  return <p className="px-1 text-xs font-bold text-muted-foreground">{children}</p>;
}

export default function ProfilePage() {
  const router = useRouter(); const { authentication, logout } = useAuthSession();
  const [profile, setProfile] = useState<SelfProfile | null>(null); const [status, setStatus] = useState<OnboardingStatus | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => { void (async () => { try { const [profileResponse, statusResponse] = await Promise.all([loadSelfProfile(authentication.accessToken), loadOnboardingStatus(authentication.accessToken)]); setProfile(profileResponse); setStatus(statusResponse); } catch (cause) { setError(onboardingErrorMessage(cause, "load")); } finally { setLoading(false); } })(); }, [authentication.accessToken]);
  const name = profile && [profile.firstName, profile.lastName].filter((value) => typeof value === "string").join(" ");
  const percent = status && status.requiredCount > 0 ? Math.round((status.answeredRequiredCount / status.requiredCount) * 100) : status?.isComplete ? 100 : 0;
  const complete = status?.isComplete ?? false;
  return <div className="space-y-5 px-4 pb-6">
    <div className="pt-3 pb-1"><h1 className="text-xl font-bold text-foreground">پروفایل</h1></div>
    {loading ? <div className="rounded-3xl border border-border bg-white p-5 shadow-sm" aria-hidden="true"><div className="flex items-center gap-4"><div className="h-[72px] w-[72px] animate-pulse rounded-2xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /></div></div></div>
      : error ? <div role="alert" className="rounded-3xl bg-red-50 p-5 text-sm text-red-700">{error}</div> : <>
        <section className="rounded-3xl border border-border bg-white p-5 shadow-sm" aria-label="مشخصات حساب">
          <div className="flex items-center gap-4">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-2xl font-bold text-rose-600" aria-hidden="true">{name?.slice(0, 1) || "؟"}</div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-foreground">{name || "نام شما ثبت نشده است"}</h2>
              <p className="mt-0.5 truncate text-sm text-muted-foreground" dir="auto">{[typeof profile?.cityName === "string" ? profile.cityName : null, profile?.phone].filter(Boolean).join(" · ") || "—"}</p>
              <p className="mt-2"><span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">{profile?.accountStatus === "ACTIVE" ? "حساب فعال" : "حساب غیرفعال"}</span></p>
            </div>
            <button type="button" aria-label="ویرایش پروفایل" onClick={() => router.push("/profile/edit")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-transform active:scale-95"><Edit2 size={16} aria-hidden="true" /></button>
          </div>
        </section>
        <section aria-label="وضعیت پرونده پزشکی">
          <button type="button" onClick={() => router.push("/profile/medical")} className="block w-full rounded-2xl border border-border bg-white p-4 text-right shadow-sm transition-colors active:bg-muted">
            <span className="flex items-center justify-between text-sm"><span className="font-bold text-foreground">تکمیل پرونده پزشکی</span><span className="font-bold text-rose-600">{toP(percent)}٪</span></span>
            <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="درصد تکمیل پرونده پزشکی"><span className="block h-full rounded-full" style={{ backgroundImage: OFFERS_RED, width: `${percent}%` }} /></span>
            <span className="mt-2 block text-xs text-muted-foreground">{complete ? "پرونده شما کامل است" : "برای خدمات بهتر، پرونده را کامل کنید"}</span>
          </button>
        </section>
        <div className="space-y-2">
          <Caption>سفارش‌ها و خرید</Caption>
          <section className="store-menu overflow-hidden rounded-2xl border border-border bg-white shadow-sm" aria-label="سفارش‌ها و خرید">
            <MenuRow icon={Package} label="پیگیری سفارش" hint="وضعیت سفارش‌ها" tone="rose" onClick={() => router.push("/store/orders")} />
            <MenuRow icon={Wallet} label="کیف پول" tone="amber" onClick={() => router.push("/profile/wallet")} />
          </section>
        </div>
        <div className="space-y-2">
          <Caption>پرونده سلامت</Caption>
          <section className="store-menu overflow-hidden rounded-2xl border border-border bg-white shadow-sm" aria-label="پرونده سلامت">
            <MenuRow icon={Activity} label="پروفایل پزشکی خوداظهاری" hint={complete ? "تکمیل‌شده" : "نیازمند تکمیل"} onClick={() => router.push("/profile/medical")} />
            <MenuRow icon={History} label="سوابق درمانی" onClick={() => router.push("/profile/history")} />
            <MenuRow icon={HeartPulse} label="پرونده سلامت" onClick={() => router.push("/profile/health-record")} />
          </section>
        </div>
        <div className="space-y-2">
          <Caption>حساب کاربری</Caption>
          <section className="store-menu overflow-hidden rounded-2xl border border-border bg-white shadow-sm" aria-label="حساب کاربری">
            {!complete && <MenuRow icon={FileText} label="تکمیل پرونده پزشکی" hint={`فقط ${toP(100 - percent)}٪ مانده`} onClick={() => router.push("/onboarding")} />}
            <MenuRow icon={ShieldCheck} label="امنیت و حریم خصوصی" onClick={() => router.push("/profile/security")} />
            <MenuRow icon={Bell} label="اعلان‌ها" onClick={() => router.push("/profile/notifications")} />
          </section>
        </div>
      </>}
    <button type="button" disabled={loggingOut || loading} onClick={() => { setLoggingOut(true); void logout(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-bold text-red-600 transition-colors active:bg-red-50 disabled:opacity-60"><LogOut size={16} aria-hidden="true" />{loggingOut ? "در حال خروج…" : "خروج از حساب"}</button>
  </div>;
}
