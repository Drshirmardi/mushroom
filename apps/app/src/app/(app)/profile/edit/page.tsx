"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Check, MapPin, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { ProfileFields, validateEmail, type ProfileDraft } from "@/components/onboarding/profile-fields";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { loadSelfProfile, onboardingErrorMessage, updateSelfProfile } from "@/lib/onboarding/patient-onboarding";

const EMPTY: ProfileDraft = { firstName: "", lastName: "", email: "", cityName: "", gender: "" };
const same = (a: ProfileDraft, b: ProfileDraft) => a.firstName === b.firstName && a.lastName === b.lastName && a.email === b.email && a.cityName === b.cityName && a.gender === b.gender;

function FieldsSkeleton() {
  return <div aria-hidden="true"><p className="rounded-2xl bg-muted p-4"><span className="block h-4 w-3/4 animate-pulse rounded bg-border" /><span className="mt-2 block h-4 w-1/2 animate-pulse rounded bg-border" /></p><div className="mt-4 rounded-2xl border border-border bg-white p-4"><div className="space-y-3">{[0, 1, 2, 3, 4].map((row) => <div key={row}><span className="mb-1 block h-3 w-20 animate-pulse rounded bg-muted" /><span className="flex h-[52px] items-center rounded-lg border border-border bg-white px-4" aria-hidden="true"><span className="block h-3 w-1/2 animate-pulse rounded bg-muted" /></span></div>)}</div></div><div className="mt-4 h-[56px] animate-pulse rounded-2xl bg-muted" /></div>;
}

export default function EditProfilePage() {
  const router = useRouter(); const { authentication } = useAuthSession();
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY); const [initial, setInitial] = useState<ProfileDraft>(EMPTY); const [phone, setPhone] = useState<string>(); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [justSaved, setJustSaved] = useState(false); const [previewFailed, setPreviewFailed] = useState(false); const [emailError, setEmailError] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [confirmLeave, setConfirmLeave] = useState(false);
  const pushTimer = useRef<number | null>(null);
  useEffect(() => () => { if (pushTimer.current !== null) window.clearTimeout(pushTimer.current); }, []);
  useEffect(() => { void (async () => { try { const result = await loadSelfProfile(authentication.accessToken); const draft = { firstName: typeof result.firstName === "string" ? result.firstName : "", lastName: typeof result.lastName === "string" ? result.lastName : "", email: typeof result.email === "string" ? result.email : "", cityName: typeof result.cityName === "string" ? result.cityName : "", gender: result.gender === "FEMALE" || result.gender === "MALE" ? result.gender : "" as const }; setProfile(draft); setInitial(draft); setPhone(result.phone); } catch (cause) { setError(onboardingErrorMessage(cause, "load")); } finally { setLoading(false); } })(); }, [authentication.accessToken]);
  useEffect(() => { if (!confirmLeave) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirmLeave(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [confirmLeave]);
  const dirty = !same(profile, initial);
  const save = async (navigate = true): Promise<boolean> => { if (saving || justSaved || !dirty) return false; const emailMessage = validateEmail(profile.email); if (emailMessage) { setEmailError(emailMessage); document.getElementById("email")?.focus(); return false; } setSaving(true); setError(null); try { await updateSelfProfile(authentication.accessToken, profile); setInitial(profile); if (navigate) { setJustSaved(true); pushTimer.current = window.setTimeout(() => router.push((() => { const next = new URLSearchParams(window.location.search).get("returnTo"); return next && /^\/assessment\/marriage\/requests\/[a-f0-9-]{36}$/i.test(next) ? next : "/profile"; })()), 750); } return true; } catch (cause) { setError(onboardingErrorMessage(cause)); return false; } finally { setSaving(false); } };
  const goBack = () => { if (dirty && !saving) setConfirmLeave(true); else router.back(); };
  const liveName = [profile.firstName.trim(), profile.lastName.trim()].filter(Boolean).join(" ");
  return <div className="profile-scope"><PageHeader title="ویرایش پروفایل" onBack={goBack} /><div className="space-y-4 px-4 pb-4 pt-4">{loading ? <FieldsSkeleton /> : <form onSubmit={(event) => { event.preventDefault(); void save(true); }} className="space-y-4">
    <div className="rounded-2xl border border-border bg-white p-5 text-center" aria-label="پیش‌نمایش پروفایل">
      <p className="text-[11px] font-bold text-muted-foreground">پیش‌نمایش در پروفایل</p>
      {!previewFailed ? (
        <img src="/avatars/avatar-male.png" alt="" width={96} height={96} draggable={false} onError={() => setPreviewFailed(true)} aria-hidden="true" className="mx-auto mt-3 h-[96px] w-[96px] object-contain" />
      ) : (
        <div className="mx-auto mt-3 flex h-[96px] w-[96px] items-center justify-center rounded-2xl bg-blue-50 text-3xl font-bold text-blue-700" aria-hidden="true">{(liveName || "؟").slice(0, 1)}</div>
      )}
      <p className="mt-3 truncate text-lg font-extrabold text-foreground">{liveName || "نام شما"}</p>
      {profile.cityName.trim() ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={13} aria-hidden="true" />{profile.cityName.trim()}</p>
      ) : null}
      {phone ? (
        <p dir="ltr" className="mt-1 flex items-center justify-center gap-1.5 text-xs tabular-nums text-muted-foreground">{phone}<Phone size={13} aria-hidden="true" /></p>
      ) : null}
      {!profile.cityName.trim() && !phone ? (
        <p className="mt-1.5 text-xs text-muted-foreground">—</p>
      ) : null}
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="rounded-2xl border border-border bg-white p-4"><ProfileFields value={profile} onChange={setProfile} phone={phone} tone="blue" grouped inlineEdit showGender hiddenFields={["cityName"]} emailError={emailError} onEmailError={setEmailError} phoneAction={{ label: "رفتن به امنیت حساب", onClick: () => router.push("/profile/security") }} /></div>
    <button type="submit" disabled={saving || justSaved || !dirty} className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-700 py-4 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60">{saving ? "در حال ذخیره…" : justSaved ? <><Check size={16} strokeWidth={3} aria-hidden="true" />ذخیره شد</> : dirty ? "ذخیره تغییرات" : "بدون تغییر"}</button>
  </form>}</div>
  <AnimatePresence>{confirmLeave && <BottomSheet title="تغییرات ذخیره نشده" onClose={() => setConfirmLeave(false)}>
    <p className="text-sm leading-6 text-muted-foreground">تغییراتی دارید که هنوز ذخیره نشده است. می‌خواهید چه کار کنید؟</p>
    <div className="mt-4 space-y-2">
      <button type="button" disabled={saving} onClick={() => void save(false).then((ok) => { if (ok) router.back(); })} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60">{saving ? "در حال ذخیره…" : "ذخیره و خروج"}</button>
      <button type="button" onClick={() => router.back()} className="w-full rounded-2xl bg-muted py-3.5 text-sm font-bold text-foreground transition-colors active:bg-border">خروج بدون ذخیره</button>
      <button type="button" onClick={() => setConfirmLeave(false)} className="w-full rounded-2xl py-3 text-sm font-bold text-muted-foreground transition-colors active:bg-muted">انصراف</button>
    </div>
  </BottomSheet>}</AnimatePresence></div>;
}
