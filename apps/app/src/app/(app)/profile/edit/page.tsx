"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileFields, type ProfileDraft } from "@/components/onboarding/profile-fields";

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDraft>({ firstName: "", lastName: "", email: "", cityName: "" });
  return <div><PageHeader title="ویرایش پروفایل" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4"><p className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground">نام و نام خانوادگی جداگانه ثبت می‌شوند. این فرم تا اتصال client تولیدشده فقط آماده‌سازی رابط است و تغییرات را ارسال نمی‌کند.</p><div className="rounded-2xl border border-border bg-white p-4"><ProfileFields value={profile} onChange={setProfile} /></div><button type="button" disabled className="w-full cursor-not-allowed rounded-2xl bg-muted py-4 text-sm font-bold text-muted-foreground">ذخیره پس از اتصال سرویس</button></div></div>;
}
