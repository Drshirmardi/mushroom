"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { ProfileFields, type ProfileDraft } from "@/components/onboarding/profile-fields";
import { PageHeader } from "@/components/shared/page-header";
import { loadPatientOnboarding, onboardingErrorMessage, updateSelfProfile } from "@/lib/onboarding/patient-onboarding";

export default function EditProfilePage() {
  const router = useRouter(); const { authentication } = useAuthSession();
  const [profile, setProfile] = useState<ProfileDraft>({ firstName: "", lastName: "", email: "", cityName: "" }); const [phone, setPhone] = useState<string>(); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { try { const result = await loadPatientOnboarding(authentication.accessToken); setProfile({ firstName: typeof result.profile.firstName === "string" ? result.profile.firstName : "", lastName: typeof result.profile.lastName === "string" ? result.profile.lastName : "", email: typeof result.profile.email === "string" ? result.profile.email : "", cityName: typeof result.profile.cityName === "string" ? result.profile.cityName : "" }); setPhone(result.profile.phone); } catch (cause) { setError(onboardingErrorMessage(cause)); } finally { setLoading(false); } })(); }, [authentication.accessToken]);
  const save = async () => { setSaving(true); setError(null); try { await updateSelfProfile(authentication.accessToken, profile); router.push("/profile"); } catch (cause) { setError(onboardingErrorMessage(cause)); } finally { setSaving(false); } };
  return <div><PageHeader title="ویرایش پروفایل" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4">{loading ? <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">در حال دریافت پروفایل…</p> : <><p className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground">نام، ایمیل و شهر در پرونده شما ذخیره می‌شوند. شماره موبایل از بخش امنیت حساب تغییر می‌کند.</p>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="rounded-2xl border border-border bg-white p-4"><ProfileFields value={profile} onChange={setProfile} phone={phone} /></div><button type="button" disabled={saving} onClick={() => void save()} className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white disabled:opacity-60">{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</button></>}</div></div>;
}
