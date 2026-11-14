"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { LoadingState } from "@/components/shared/skeletons";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { getCommerceAddresses, type CommerceAddress } from "@/lib/commerce-catalog-api";
import { toP } from "@/lib/format";
import { loadOnboardingStatus, loadSelfProfile, onboardingErrorMessage, type OnboardingStatus, type SelfProfile } from "@/lib/onboarding/patient-onboarding";
import { PATIENT_CATALOG_TTL_MS, patientCacheKey, patientCachedData, peekPatientCache } from "@/lib/patient-request";

import { StoreIcon, type StoreIconName } from '@/components/store/store-icon';

/**
 * Keep the Digipay glyphs color-coded by section without adding icon chips.
 */
type Tone = "soft" | "blue" | "sky" | "amber" | "slate";

const TONES: Record<Tone, string> = {
  soft: "text-foreground",
  blue: "text-blue-700",
  sky: "text-sky-700",
  amber: "text-amber-600",
  slate: "text-slate-600",
};

function MenuRow({ icon, label, hint, tone = "soft", onClick }: {
  icon: StoreIconName;
  label: string;
  hint?: string;
  tone?: Tone;
  onClick: () => void;
}) {
  return <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 p-4 text-right transition-colors hover:bg-muted/60 active:bg-muted"
  >
    <StoreIcon name={icon} size={21} className={`shrink-0 ${TONES[tone]}`} />
    <span className="flex-1 text-[13px] leading-6 font-medium text-foreground">{label}</span>
    {hint && <span title={hint} className="min-w-0 max-w-[60%] shrink truncate text-xs text-muted-foreground">{hint}</span>}
    <StoreIcon name="arrowLeft" size={15} className="shrink-0 text-muted-foreground" />
  </button>;
}

function Caption({ children }: { children: string }) {
  return <p className="px-1 text-xs font-medium text-muted-foreground">{children}</p>;
}

type ProfileGender = "male" | "female";

/**
 * Frontend-only gender base. The profile API exposes no gender field yet, so
 * we default to "male". When the backend adds one, it is picked up here with
 * no other change: any `gender`/`sex`-like key on the profile wins.
 */
function resolveProfileGender(profile: SelfProfile | null): ProfileGender {
  return profile?.gender === "FEMALE" ? "female" : "male";
}

/** 3D avatar artwork (transparent PNGs saved under `apps/app/public/avatars/`). */
const AVATAR_SRC: Record<ProfileGender, string> = {
  male: "/avatars/avatar-male.png",
  female: "/avatars/avatar-female.png",
};

/** Ring geometry for the medical-record progress dial. */

export default function ProfilePage() {
  const router = useRouter(); const { authentication, logout } = useAuthSession();
  const token = authentication.accessToken;
  const profileKey = patientCacheKey(token, "self-profile");
  const statusKey = patientCacheKey(token, "onboarding-status");
  const [profile, setProfile] = useState<SelfProfile | null>(() => peekPatientCache<SelfProfile>(profileKey) ?? null);
  const [status, setStatus] = useState<OnboardingStatus | null>(() => peekPatientCache<OnboardingStatus>(statusKey) ?? null);
  const [addresses, setAddresses] = useState<CommerceAddress[] | null>(null);
  const [loading, setLoading] = useState(() => peekPatientCache(profileKey) == null || peekPatientCache(statusKey) == null);
  const [error, setError] = useState<string | null>(null); const [loggingOut, setLoggingOut] = useState(false); const [logoutError, setLogoutError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [profileResponse, statusResponse] = await Promise.all([
          patientCachedData(profileKey, PATIENT_CATALOG_TTL_MS, () => loadSelfProfile(token)),
          patientCachedData(statusKey, PATIENT_CATALOG_TTL_MS, () => loadOnboardingStatus(token)),
        ]);
        if (cancelled) return;
        setProfile(profileResponse);
        setStatus(statusResponse);
      } catch (cause) {
        if (!cancelled) setError(onboardingErrorMessage(cause, "load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileKey, statusKey, token]);
  useEffect(() => { void getCommerceAddresses(authentication.accessToken).then(setAddresses).catch(() => setAddresses(null)); }, [authentication.accessToken]);
  const defaultAddress = addresses?.find((address) => address.isDefault) ?? addresses?.[0] ?? null;
  const name = profile && [profile.firstName, profile.lastName].filter((value) => typeof value === "string").join(" ");
  const percent = status && status.requiredCount > 0 ? Math.round((status.answeredRequiredCount / status.requiredCount) * 100) : status?.isComplete ? 100 : 0;
  const complete = status?.isComplete ?? false;
  const hasSteps = (status?.requiredCount ?? 0) > 0;
  const remaining = status ? Math.max(0, status.requiredCount - status.answeredRequiredCount) : 0;
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id); }, []);
  const gender = resolveProfileGender(profile);
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => { setAvatarFailed(false); }, [gender]);
  const doneSteps = complete ? 5 : Math.floor(percent / 20);
  return <main className="profile-scope font-iranyekanx [--font-weight-medium:500] space-y-5 px-4 pb-6">
    <div className="pt-4 pb-1 text-center"><h1 className="text-lg font-medium text-foreground">پروفایل</h1></div>
    {loading ? <LoadingState variant="profile" className="rounded-3xl border border-border bg-white p-5" />
      : error ? <div role="alert" className="rounded-3xl bg-red-50 p-5 text-sm text-red-700">{error}</div> : <>
        <section className="rounded-3xl border border-border bg-white p-5 shadow-sm" aria-label="مشخصات حساب">
          <div className="flex items-center gap-4">
            {!avatarFailed ? (
              <img key={AVATAR_SRC[gender]} src={AVATAR_SRC[gender]} alt="" width={72} height={72} draggable={false} onError={() => setAvatarFailed(true)} aria-hidden="true" className="h-[72px] w-[72px] shrink-0 object-contain" />
            ) : (
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-medium text-blue-700" aria-hidden="true">{name?.slice(0, 1) || "؟"}</div>
            )}
            <div className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-medium text-foreground">{name || "نام شما ثبت نشده است"}</h2>
                <span className="inline-block shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{profile?.accountStatus === "ACTIVE" ? "فعال" : "غیرفعال"}</span>
              </span>
              <span className="mt-1.5 flex flex-col gap-1">
                {profile?.phone ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><StoreIcon name="call" size={10} /><span dir="ltr">{profile.phone}</span></span>
                ) : null}
                {typeof profile?.cityName === "string" && profile.cityName ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><StoreIcon name="location" size={10} />{profile.cityName}</span>
                ) : null}
                {!profile?.phone && !(typeof profile?.cityName === "string" && profile.cityName) ? (
                  <span className="text-xs text-muted-foreground">اطلاعات تماس ثبت نشده است</span>
                ) : null}
              </span>
            </div>
            <button type="button" aria-label="ویرایش پروفایل" onClick={() => router.push("/profile/edit")} className="flex h-12 w-12 shrink-0 items-center justify-center bg-transparent text-foreground transition-colors hover:text-blue-700 active:scale-95"><StoreIcon name="pen" size={24} /></button>
          </div>
        </section>
        <section aria-label="وضعیت پرونده پزشکی">
          <button type="button" onClick={() => router.push("/profile/medical")} className="block w-full cursor-pointer rounded-2xl border border-border bg-white p-4 text-right shadow-sm transition-all hover:bg-muted/40 active:scale-[0.99] active:bg-muted">
            <span className="flex items-center gap-3">
              <StoreIcon name="medicalBag" size={16} className="shrink-0 text-blue-700" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">پرونده پزشکی</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{complete ? "همه بخش‌ها ثبت شده است" : "با تکمیل بخش‌ها، خدمات دقیق‌تری می‌گیرید"}</span>
              </span>
              <span className="shrink-0 text-xl font-medium tabular-nums text-blue-900">{toP(percent)}<span className="text-xs font-medium text-muted-foreground">٪</span></span>
            </span>
            <span className="mt-4 flex items-center gap-1.5" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="درصد تکمیل پرونده پزشکی">
              {["bg-blue-300", "bg-blue-400", "bg-blue-500", "bg-blue-600", "bg-blue-800"].map((shade, index) => {
                const done = index < doneSteps;
                const now = !complete && index === doneSteps;
                return <span
                  key={shade}
                  style={{ transitionDelay: `${index * 90}ms` }}
                  className={`h-2.5 flex-1 rounded-full motion-safe:transition-all motion-safe:duration-500 ${ready ? "translate-y-0" : "translate-y-1"} ${done ? shade : now ? `${shade} opacity-50` : "bg-blue-100"}`}
                  aria-hidden="true"
                />;
              })}
            </span>
            <span className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
              {complete
                ? <span className="inline-flex items-center gap-1.5 font-medium text-foreground"><StoreIcon name="checkCircle" size={11} className="text-blue-600" />پرونده کامل است</span>
                : hasSteps
                  ? <span className="text-muted-foreground">فقط <b className="font-medium tabular-nums text-blue-700">{toP(remaining)}</b> بخش مانده</span>
                  : <span className="text-muted-foreground">برای خدمات بهتر، پرونده را کامل کنید</span>}
              <span className="inline-flex items-center gap-0.5 font-medium text-blue-700">{complete ? "مشاهده پرونده" : "ادامه تکمیل"}<StoreIcon name="arrowLeft" size={11} /></span>
            </span>
          </button>
        </section>
        <div className="space-y-2">
          <Caption>سفارش‌ها و خرید</Caption>
          <section className="store-menu overflow-hidden rounded-2xl border border-border bg-white" aria-label="سفارش‌ها و خرید">
            <MenuRow icon="deliveryBox" label="پیگیری سفارش" hint="وضعیت سفارش‌ها" tone="blue" onClick={() => router.push("/store/orders")} />
            <MenuRow icon="location" label="آدرس‌ها" hint={defaultAddress ? `${defaultAddress.label} · ${defaultAddress.city}، ${defaultAddress.line1}` : "تحویل سفارش‌ها"} tone="blue" onClick={() => router.push("/profile/addresses")} />
            <MenuRow icon="walletBold" label="کیف پول" tone="amber" onClick={() => router.push("/profile/wallet")} />
          </section>
        </div>
        <div className="space-y-2">
          <Caption>سلامت و مراقبت</Caption>
          <section className="store-menu overflow-hidden rounded-2xl border border-border bg-white" aria-label="سلامت و مراقبت">
            <MenuRow icon="history" label="سوابق درمانی" tone="sky" onClick={() => router.push("/profile/history")} />
            <MenuRow icon="book" label="برنامه‌های آموزشی و اختصاصی من" tone="sky" onClick={() => router.push("/programs")} />
            <MenuRow icon="checklist" label="ارزیابی‌های فردی و زوجین" tone="sky" onClick={() => router.push("/assessment")} />
          </section>
        </div>
        <div className="space-y-2">
          <Caption>حساب کاربری</Caption>
          <section className="store-menu overflow-hidden rounded-2xl border border-border bg-white" aria-label="حساب کاربری">
            <MenuRow icon="digitalDevice" label="دستگاه‌های متصل" tone="slate" onClick={() => router.push("/profile/security")} />
            <MenuRow icon="notification" label="اعلان‌ها" tone="sky" onClick={() => router.push("/profile/notifications")} />
          </section>
        </div>
      </>}
    {logoutError && <p role="alert" className="text-sm text-red-700">خروج انجام نشد؛ دوباره تلاش کنید.</p>}
    <button type="button" disabled={loggingOut || loading} onClick={() => { if (loggingOut) return; setLoggingOut(true); setLogoutError(false); void logout().then(ok => { if (!ok) { setLoggingOut(false); setLogoutError(true); } }); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-medium text-red-600 transition-colors active:bg-red-50 disabled:opacity-60" aria-busy={Boolean(loggingOut)}><StoreIcon name="logout" size={13} />{loggingOut ? <><HeartbeatLoader />{"در حال خروج…"}</> : "خروج از حساب"}</button>
  </main>;
}
