"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  BriefcaseMedical, Building2, CalendarDays, Check, CheckCircle2, Circle,
  Clock, LoaderCircle, RefreshCw, Save, ShieldAlert, Stethoscope, Wallet,
} from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { PaymentProviderSettings } from "@/features/settings/payment-provider-settings";
import { settingsProgress } from "@/features/settings/settings-flow";
import { apiClient } from "@/lib/api";
import {
  createAvailabilityRule, createClinicClosure, createDoctor, createDoctorException,
  createDoctorService, createService, createSpecialty, directoryMutationMessage,
  loadDirectorySettings, type DirectorySettingsData, type DirectorySettingsState,
  updateClinic, updateDoctor, updateDoctorService, updateService, updateSpecialty,
} from "@/lib/directory-settings-api";

const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50";
const WEEKDAYS = ["دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه", "یکشنبه"];

type Area = "clinic" | "specialty" | "doctor" | "service" | "offering" | "schedule" | "closure" | "leave";
type Feedback = { area: Area; tone: "success" | "error"; message: string } | null;

function Notice({ state, onRetry }: { state: Exclude<DirectorySettingsState["status"], "ready">; onRetry: () => void }) {
  const title = state === "unauthenticated" ? "نشست کاربری منقضی شده است" : state === "forbidden" ? "دسترسی مجاز نیست" : state === "unavailable" ? "سرویس در دسترس نیست" : "دریافت تنظیمات ناموفق بود";
  const body = state === "unauthenticated" ? "نشست شما تمدید نشد؛ دوباره وارد حساب شوید." : state === "forbidden" ? "حساب شما اجازهٔ مدیریت تنظیمات کلینیک را ندارد." : state === "unavailable" ? "اتصال به API برقرار نشد." : "داده‌ای نمایش داده نشد؛ دوباره تلاش کنید.";
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><div className="flex items-center gap-2 font-bold"><ShieldAlert size={18} />{title}</div><p className="mt-2 text-sm">{body}</p>{state !== "forbidden" && <button type="button" onClick={onRetry} className={secondaryButton}><RefreshCw size={15} />تلاش دوباره</button>}</div>;
}

function Section({ id, number, icon: Icon, title, description, complete, children }: { id?: string; number?: number; icon: ComponentType<{ size?: number }>; title: string; description: string; complete?: boolean; children: ReactNode }) {
  return <section id={id} className="scroll-mt-20 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
    <div className="mb-5 flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${complete ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}>{complete ? <Check size={19} /> : number ? <span className="font-bold">{number}</span> : <Icon size={19} />}</div>
      <div className="min-w-0"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>
    </div>
    {children}
  </section>;
}

function StatusPill({ published, active = true }: { published: boolean; active?: boolean }) {
  const ready = published && active;
  return <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{ready ? "فعال و منتشرشده" : published ? "غیرفعال" : "پیش‌نویس"}</span>;
}

function AreaFeedback({ area, feedback }: { area: Area; feedback: Feedback }) {
  if (!feedback || feedback.area !== area) return null;
  return <p role={feedback.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl px-3 py-2 text-sm ${feedback.tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{feedback.message}</p>;
}

function BusyLabel({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <>{busy && <LoaderCircle size={15} className="animate-spin" />}{children}</>;
}

function SettingsForms({ data, accessToken, refresh }: { data: DirectorySettingsData; accessToken: string; refresh: () => Promise<boolean> }) {
  const [busyArea, setBusyArea] = useState<Area | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [clinicName, setClinicName] = useState(data.clinic.name);
  const [clinicTimeZone, setClinicTimeZone] = useState(data.clinic.timeZone);
  const [specialtyName, setSpecialtyName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialtyId, setDoctorSpecialtyId] = useState("");
  const [draftDoctorSpecialties, setDraftDoctorSpecialties] = useState<Record<string, string>>({});
  const [serviceName, setServiceName] = useState("");
  const [offeringDoctorId, setOfferingDoctorId] = useState("");
  const [offeringServiceId, setOfferingServiceId] = useState("");
  const [visitMode, setVisitMode] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  const [duration, setDuration] = useState("30");
  const [buffer, setBuffer] = useState("0");
  const [priceToman, setPriceToman] = useState("0");
  const [scheduleDoctorId, setScheduleDoctorId] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  const [weekday, setWeekday] = useState("6");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [closureLabel, setClosureLabel] = useState("");
  const [closureStart, setClosureStart] = useState("");
  const [closureEnd, setClosureEnd] = useState("");
  const [leaveDoctorId, setLeaveDoctorId] = useState("");
  const [leaveLabel, setLeaveLabel] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");

  const progress = settingsProgress(data);
  const publishedSpecialties = data.specialties.filter((item) => item.isActive && item.publicationStatus === "PUBLISHED");
  const publishedSpecialtyIds = new Set(publishedSpecialties.map((item) => item.id));
  const publishedDoctors = data.doctors.filter((item) => item.isActive && item.publicationStatus === "PUBLISHED" && item.specialties.some((specialty) => publishedSpecialtyIds.has(specialty.id)));
  const publishedServices = data.services.filter((item) => item.isActive && item.publicationStatus === "PUBLISHED");
  const doctorNames = useMemo(() => new Map(data.doctors.map((doctor) => [doctor.id, doctor.displayName])), [data.doctors]);
  const durationNumber = Number(duration); const bufferNumber = Number(buffer); const priceTomanNumber = Number(priceToman);
  const offeringValuesValid = Number.isInteger(durationNumber) && durationNumber >= 5 && durationNumber <= 360 && Number.isInteger(bufferNumber) && bufferNumber >= 0 && bufferNumber <= 120 && Number.isSafeInteger(priceTomanNumber) && priceTomanNumber >= 0 && Number.isSafeInteger(priceTomanNumber * 10);
  const complete = (id: (typeof progress)[number]["id"]) => progress.find((item) => item.id === id)?.complete ?? false;
  const isBusy = (area: Area) => busyArea === area;

  const mutate = async <T,>(area: Area, work: () => Promise<T>, success: string, onSuccess?: (result: T) => void) => {
    setBusyArea(area); setFeedback(null);
    try {
      const result = await work();
      onSuccess?.(result);
      const refreshed = await refresh();
      setFeedback({ area, tone: "success", message: refreshed ? success : `${success}؛ تازه‌سازی صفحه ناموفق بود، دوباره تلاش کنید.` });
      return true;
    } catch (error) {
      setFeedback({ area, tone: "error", message: directoryMutationMessage(error) });
      return false;
    } finally {
      setBusyArea(null);
    }
  };

  return <div className="space-y-5">
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">مسیر آماده‌سازی رزرو</h2><p className="mt-1 text-sm text-muted-foreground">مراحل را از راست به چپ کامل کنید. هر مرحله بعد از ثبت موفق و دریافت مجدد از سرور سبز می‌شود.</p></div><span className="text-sm font-bold text-primary">{progress.filter((item) => item.complete).length} از {progress.length} مرحله</span></div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{progress.map((item, index) => <li key={item.id}><a href={`#settings-${item.id}`} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition hover:border-primary/30 ${item.complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-card text-muted-foreground"}`}>{item.complete ? <CheckCircle2 size={17} /> : <Circle size={17} />}<span>{index + 1}. {item.label}</span></a></li>)}</ol>
    </div>

    <Section id="settings-clinic" icon={Building2} title="مشخصات کلینیک" description="نام و منطقه زمانی مبنای نمایش نوبت‌ها و تقویم هستند.">
      <form className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void mutate("clinic", () => updateClinic(accessToken, { name: clinicName.trim(), timeZone: clinicTimeZone.trim() }), "مشخصات کلینیک ذخیره شد.", (clinic) => { setClinicName(clinic.name); setClinicTimeZone(clinic.timeZone); }); }}>
        <label className="text-sm font-bold">نام کلینیک<input className={`${field} mt-1.5`} value={clinicName} onChange={(event) => setClinicName(event.target.value)} /></label>
        <label className="text-sm font-bold">منطقه زمانی<input className={`${field} mt-1.5`} value={clinicTimeZone} onChange={(event) => setClinicTimeZone(event.target.value)} placeholder="Asia/Tehran" dir="ltr" /></label>
        <button className={`${primaryButton} self-end`} disabled={!clinicName.trim() || !clinicTimeZone.trim() || busyArea !== null}><BusyLabel busy={isBusy("clinic")}><Save size={16} />ذخیره</BusyLabel></button>
      </form><AreaFeedback area="clinic" feedback={feedback} />
    </Section>

    <Section id="settings-specialty" number={1} icon={Stethoscope} title="تخصص" description="پزشک فقط با حداقل یک تخصص فعال و منتشرشده قابل انتشار است." complete={complete("specialty")}>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!specialtyName.trim()) return; void mutate("specialty", () => createSpecialty(accessToken, { name: specialtyName.trim(), isActive: true, publicationStatus: "PUBLISHED" }), "تخصص ایجاد و منتشر شد.", (specialty) => { setSpecialtyName(""); setDoctorSpecialtyId(specialty.id); }); }}>
        <label className="sr-only" htmlFor="new-specialty">نام تخصص</label><input id="new-specialty" className={field} value={specialtyName} onChange={(event) => setSpecialtyName(event.target.value)} placeholder="مثلاً طب سوزنی" /><button className={primaryButton} disabled={!specialtyName.trim() || busyArea !== null}><BusyLabel busy={isBusy("specialty")}>ایجاد تخصص</BusyLabel></button>
      </form>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{data.specialties.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"><span className="text-sm font-semibold">{item.name}</span><div className="flex items-center gap-2"><StatusPill published={item.publicationStatus === "PUBLISHED"} active={item.isActive} />{(item.publicationStatus !== "PUBLISHED" || !item.isActive) && <button type="button" className={secondaryButton} disabled={busyArea !== null} onClick={() => void mutate("specialty", () => updateSpecialty(accessToken, item.id, { isActive: true, publicationStatus: "PUBLISHED" }), `تخصص «${item.name}» منتشر شد.`)}>انتشار</button>}</div></div>)}{data.specialties.length === 0 && <p className="text-sm text-muted-foreground">هنوز تخصصی ثبت نشده است.</p>}</div>
      <AreaFeedback area="specialty" feedback={feedback} />
    </Section>

    <Section id="settings-doctor" number={2} icon={Stethoscope} title="پزشک" description="در همین مرحله تخصص به پزشک متصل می‌شود و پروفایل برای نمایش عمومی منتشر می‌شود." complete={complete("doctor")}>
      <form className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); if (!doctorName.trim() || !doctorSpecialtyId) return; void mutate("doctor", () => createDoctor(accessToken, { displayName: doctorName.trim(), specialtyIds: [doctorSpecialtyId], isActive: true, publicationStatus: "PUBLISHED" }), "پزشک با تخصص انتخاب‌شده ایجاد و منتشر شد.", (doctor) => { setDoctorName(""); setOfferingDoctorId(doctor.id); setScheduleDoctorId(doctor.id); setLeaveDoctorId(doctor.id); }); }}>
        <label className="text-sm font-bold">نام نمایشی پزشک<input className={`${field} mt-1.5`} value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="دکتر ..." /></label>
        <label className="text-sm font-bold">تخصص<select className={`${field} mt-1.5`} value={doctorSpecialtyId} onChange={(event) => setDoctorSpecialtyId(event.target.value)}><option value="">انتخاب تخصص منتشرشده</option>{publishedSpecialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button className={`${primaryButton} self-end`} disabled={!doctorName.trim() || !doctorSpecialtyId || busyArea !== null}><BusyLabel busy={isBusy("doctor")}>ایجاد پزشک</BusyLabel></button>
      </form>
      {publishedSpecialties.length === 0 && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">ابتدا مرحله تخصص را کامل کنید.</p>}
      <div className="mt-4 grid gap-3 xl:grid-cols-2">{data.doctors.map((doctor) => { const ready = doctor.isActive && doctor.publicationStatus === "PUBLISHED"; const selectedSpecialty = draftDoctorSpecialties[doctor.id] ?? doctor.specialties.find((item) => publishedSpecialties.some((specialty) => specialty.id === item.id))?.id ?? publishedSpecialties[0]?.id ?? ""; return <article key={doctor.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{doctor.displayName}</h3><p className="mt-1 text-xs text-muted-foreground">{doctor.specialties.map((item) => item.name).join("، ") || "بدون تخصص"}</p></div><StatusPill published={doctor.publicationStatus === "PUBLISHED"} active={doctor.isActive} /></div>{!ready && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select aria-label={`تخصص ${doctor.displayName}`} className={field} value={selectedSpecialty} onChange={(event) => setDraftDoctorSpecialties((current) => ({ ...current, [doctor.id]: event.target.value }))}><option value="">انتخاب تخصص</option>{publishedSpecialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className={secondaryButton} disabled={!selectedSpecialty || busyArea !== null} onClick={() => void mutate("doctor", () => updateDoctor(accessToken, doctor.id, { specialtyIds: Array.from(new Set([...doctor.specialties.map((item) => item.id), selectedSpecialty])), isActive: true, publicationStatus: "PUBLISHED" }), `پروفایل «${doctor.displayName}» تکمیل و منتشر شد.`)}>تکمیل و انتشار</button></div>}</article>; })}{data.doctors.length === 0 && <p className="text-sm text-muted-foreground">هنوز پزشکی ثبت نشده است.</p>}</div>
      <AreaFeedback area="doctor" feedback={feedback} />
      <p className="mt-4 text-xs leading-6 text-muted-foreground">این مرحله پروفایل قابل رزرو پزشک را می‌سازد. ساخت حساب ورود پزشک، نقش و دسترسی کاربری مسیر جداگانه‌ای دارد.</p>
    </Section>

    <Section id="settings-service" number={3} icon={BriefcaseMedical} title="خدمت" description="خدمت قابل رزرو را با نام روشن ایجاد و همان لحظه منتشر کنید." complete={complete("service")}>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!serviceName.trim()) return; void mutate("service", () => createService(accessToken, { name: serviceName.trim(), isActive: true, publicationStatus: "PUBLISHED" }), "خدمت ایجاد و منتشر شد.", (service) => { setServiceName(""); setOfferingServiceId(service.id); }); }}><input className={field} value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="مثلاً جلسه طب سوزنی" aria-label="نام خدمت" /><button className={primaryButton} disabled={!serviceName.trim() || busyArea !== null}><BusyLabel busy={isBusy("service")}>ایجاد خدمت</BusyLabel></button></form>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{data.services.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"><span className="text-sm font-semibold">{item.name}</span><div className="flex items-center gap-2"><StatusPill published={item.publicationStatus === "PUBLISHED"} active={item.isActive} />{(item.publicationStatus !== "PUBLISHED" || !item.isActive) && <button type="button" className={secondaryButton} disabled={busyArea !== null} onClick={() => void mutate("service", () => updateService(accessToken, item.id, { isActive: true, publicationStatus: "PUBLISHED" }), `خدمت «${item.name}» منتشر شد.`)}>انتشار</button>}</div></div>)}</div><AreaFeedback area="service" feedback={feedback} />
    </Section>

    <Section id="settings-offering" number={4} icon={Wallet} title="تعرفه و نوع ویزیت" description="پزشک، خدمت، نوع ویزیت، مدت و قیمت را در یک رکورد قابل رزرو به هم متصل کنید." complete={complete("offering")}>
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => { event.preventDefault(); if (!offeringDoctorId || !offeringServiceId || !offeringValuesValid) { setFeedback({ area: "offering", tone: "error", message: "مدت، فاصله و قیمت را با عدد معتبر وارد کنید." }); return; } void mutate("offering", () => createDoctorService(accessToken, { doctorId: offeringDoctorId, serviceId: offeringServiceId, visitMode, durationMinutes: durationNumber, bufferMinutes: bufferNumber, priceAmount: priceTomanNumber * 10, currency: "IRR", isActive: true, publicationStatus: "PUBLISHED" }), "تعرفه فعال و منتشر شد."); }}>
        <label className="text-sm font-bold">پزشک<select className={`${field} mt-1.5`} value={offeringDoctorId} onChange={(event) => setOfferingDoctorId(event.target.value)}><option value="">انتخاب پزشک</option>{publishedDoctors.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        <label className="text-sm font-bold">خدمت<select className={`${field} mt-1.5`} value={offeringServiceId} onChange={(event) => setOfferingServiceId(event.target.value)}><option value="">انتخاب خدمت</option>{publishedServices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-bold">نوع ویزیت<select className={`${field} mt-1.5`} value={visitMode} onChange={(event) => setVisitMode(event.target.value as "IN_PERSON" | "ONLINE")}><option value="IN_PERSON">حضوری</option><option value="ONLINE">آنلاین</option></select></label>
        <label className="text-sm font-bold">قیمت (تومان)<input className={`${field} mt-1.5`} type="number" min="0" step="1" value={priceToman} onChange={(event) => setPriceToman(event.target.value)} /></label>
        <label className="text-sm font-bold">مدت ویزیت (دقیقه)<input className={`${field} mt-1.5`} type="number" min="5" max="360" value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
        <label className="text-sm font-bold">فاصله بعد از ویزیت (دقیقه)<input className={`${field} mt-1.5`} type="number" min="0" max="120" value={buffer} onChange={(event) => setBuffer(event.target.value)} /></label>
        <button className={`${primaryButton} self-end md:col-span-2 xl:col-span-2`} disabled={!offeringDoctorId || !offeringServiceId || !offeringValuesValid || busyArea !== null}><BusyLabel busy={isBusy("offering")}>ثبت و انتشار تعرفه</BusyLabel></button>
      </form>
      {(!complete("doctor") || !complete("service")) && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">برای ثبت تعرفه، پزشک و خدمت باید فعال و منتشرشده باشند.</p>}
      <div className="mt-4 space-y-2">{data.doctorServices.map((item) => { const ready = item.isActive && item.publicationStatus === "PUBLISHED"; const parentsReady = publishedDoctors.some((doctor) => doctor.id === item.doctor.id) && publishedServices.some((service) => service.id === item.service.id); return <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">{item.doctor.name} · {item.service.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.visitMode === "ONLINE" ? "آنلاین" : "حضوری"} · {item.durationMinutes} دقیقه · {(item.priceAmount / 10).toLocaleString("fa-IR")} تومان</p></div><div className="flex items-center gap-2"><StatusPill published={item.publicationStatus === "PUBLISHED"} active={item.isActive} />{!ready && <button type="button" className={secondaryButton} disabled={!parentsReady || busyArea !== null} onClick={() => void mutate("offering", () => updateDoctorService(accessToken, item.id, { isActive: true, publicationStatus: "PUBLISHED" }), "تعرفه منتشر شد.")}>انتشار</button>}</div></div>; })}{data.doctorServices.length === 0 && <p className="text-sm text-muted-foreground">هنوز تعرفه‌ای ثبت نشده است.</p>}</div><AreaFeedback area="offering" feedback={feedback} />
    </Section>

    <Section id="settings-schedule" number={5} icon={Clock} title="ساعات کاری پزشک" description="برنامه هر نوع ویزیت جداست؛ روز هفته و بازه بدون تداخل ثبت می‌شود." complete={complete("schedule")}>
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={(event) => { event.preventDefault(); if (!scheduleDoctorId || start >= end) { setFeedback({ area: "schedule", tone: "error", message: "زمان پایان باید بعد از زمان شروع باشد." }); return; } void mutate("schedule", () => createAvailabilityRule(accessToken, { doctorId: scheduleDoctorId, visitMode: scheduleMode, isoWeekday: Number(weekday), startLocalTime: start, endLocalTime: end, isActive: true }), "ساعت کاری ثبت شد."); }}>
        <label className="text-sm font-bold xl:col-span-2">پزشک<select className={`${field} mt-1.5`} value={scheduleDoctorId} onChange={(event) => setScheduleDoctorId(event.target.value)}><option value="">انتخاب پزشک</option>{publishedDoctors.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        <label className="text-sm font-bold">نوع ویزیت<select className={`${field} mt-1.5`} value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as "IN_PERSON" | "ONLINE")}><option value="IN_PERSON">حضوری</option><option value="ONLINE">آنلاین</option></select></label>
        <label className="text-sm font-bold">روز<select className={`${field} mt-1.5`} value={weekday} onChange={(event) => setWeekday(event.target.value)}>{WEEKDAYS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
        <label className="text-sm font-bold">از<input className={`${field} mt-1.5`} type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label className="text-sm font-bold">تا<input className={`${field} mt-1.5`} type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        <button className={`${primaryButton} md:col-span-2 xl:col-span-6`} disabled={!scheduleDoctorId || !start || !end || busyArea !== null}><BusyLabel busy={isBusy("schedule")}>ثبت ساعت کاری</BusyLabel></button>
      </form>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{data.availabilityRules.map((item) => <div key={item.id} className="rounded-xl border border-border p-3 text-sm"><p className="font-bold">{doctorNames.get(item.doctorId) ?? "پزشک نامشخص"}</p><p className="mt-1 text-xs text-muted-foreground">{WEEKDAYS[item.isoWeekday - 1]} · {item.startLocalTime} تا {item.endLocalTime} · {item.visitMode === "ONLINE" ? "آنلاین" : "حضوری"}</p></div>)}{data.availabilityRules.length === 0 && <p className="text-sm text-muted-foreground">هنوز ساعت کاری ثبت نشده است.</p>}</div><AreaFeedback area="schedule" feedback={feedback} />
    </Section>

    <Section icon={CalendarDays} title="تعطیلی کلینیک و مرخصی پزشک" description="تعطیلی کلینیک و مرخصی پزشک بازه‌های مستقل دارند و دیگر مقادیر یکدیگر را تغییر نمی‌دهند.">
      <div className="grid gap-5 xl:grid-cols-2">
        <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); if (!closureLabel.trim() || !closureStart || !closureEnd || closureStart >= closureEnd) { setFeedback({ area: "closure", tone: "error", message: "عنوان و بازه معتبر تعطیلی را وارد کنید." }); return; } void mutate("closure", () => createClinicClosure(accessToken, { label: closureLabel.trim(), startsAt: new Date(closureStart).toISOString(), endsAt: new Date(closureEnd).toISOString(), isActive: true }), "تعطیلی کلینیک ثبت شد.", () => { setClosureLabel(""); setClosureStart(""); setClosureEnd(""); }); }}><h3 className="font-bold">تعطیلی کلینیک</h3><input className={field} value={closureLabel} onChange={(event) => setClosureLabel(event.target.value)} placeholder="عنوان تعطیلی" /><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold">شروع<input className={`${field} mt-1`} type="datetime-local" value={closureStart} onChange={(event) => setClosureStart(event.target.value)} /></label><label className="text-xs font-bold">پایان<input className={`${field} mt-1`} type="datetime-local" value={closureEnd} onChange={(event) => setClosureEnd(event.target.value)} /></label></div><button className={primaryButton} disabled={!closureLabel.trim() || !closureStart || !closureEnd || busyArea !== null}><BusyLabel busy={isBusy("closure")}>ثبت تعطیلی</BusyLabel></button><AreaFeedback area="closure" feedback={feedback} /></form>
        <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); if (!leaveDoctorId || !leaveStart || !leaveEnd || leaveStart >= leaveEnd) { setFeedback({ area: "leave", tone: "error", message: "پزشک و بازه معتبر مرخصی را وارد کنید." }); return; } void mutate("leave", () => createDoctorException(accessToken, { doctorId: leaveDoctorId, kind: "UNAVAILABLE", visitMode: null, label: (leaveLabel.trim() || null) as never, startsAt: new Date(leaveStart).toISOString(), endsAt: new Date(leaveEnd).toISOString(), isActive: true }), "مرخصی پزشک ثبت شد.", () => { setLeaveLabel(""); setLeaveStart(""); setLeaveEnd(""); }); }}><h3 className="font-bold">مرخصی پزشک</h3><select className={field} value={leaveDoctorId} onChange={(event) => setLeaveDoctorId(event.target.value)}><option value="">انتخاب پزشک</option>{publishedDoctors.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select><input className={field} value={leaveLabel} onChange={(event) => setLeaveLabel(event.target.value)} placeholder="توضیح اختیاری" /><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold">شروع<input className={`${field} mt-1`} type="datetime-local" value={leaveStart} onChange={(event) => setLeaveStart(event.target.value)} /></label><label className="text-xs font-bold">پایان<input className={`${field} mt-1`} type="datetime-local" value={leaveEnd} onChange={(event) => setLeaveEnd(event.target.value)} /></label></div><button className={primaryButton} disabled={!leaveDoctorId || !leaveStart || !leaveEnd || busyArea !== null}><BusyLabel busy={isBusy("leave")}>ثبت مرخصی</BusyLabel></button><AreaFeedback area="leave" feedback={feedback} /></form>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><div><h3 className="text-sm font-bold">تعطیلی‌های ثبت‌شده</h3><ul className="mt-2 space-y-2">{data.closures.map((item) => <li key={item.id} className="rounded-xl bg-secondary/50 p-3 text-sm">{item.label} · {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: data.clinic.timeZone }).format(new Date(item.startsAt))}</li>)}{data.closures.length === 0 && <li className="text-sm text-muted-foreground">تعطیلی ثبت نشده است.</li>}</ul></div><div><h3 className="text-sm font-bold">مرخصی‌های ثبت‌شده</h3><ul className="mt-2 space-y-2">{data.exceptions.map((item) => <li key={item.id} className="rounded-xl bg-secondary/50 p-3 text-sm">{doctorNames.get(item.doctorId) ?? "پزشک نامشخص"} · {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: data.clinic.timeZone }).format(new Date(item.startsAt))}</li>)}{data.exceptions.length === 0 && <li className="text-sm text-muted-foreground">مرخصی ثبت نشده است.</li>}</ul></div></div>
    </Section>
  </div>;
}

export function SettingsPage() {
  const { authentication } = useDashboardSession();
  const [state, setState] = useState<"loading" | DirectorySettingsState["status"]>("loading");
  const [data, setData] = useState<DirectorySettingsData | null>(null);
  const [refreshWarning, setRefreshWarning] = useState(false);

  const refresh = useCallback(async () => {
    const next = await loadDirectorySettings(apiClient, authentication.accessToken);
    if (next.status === "ready") { setData(next.data); setState("ready"); setRefreshWarning(false); return true; }
    if (data) { setRefreshWarning(true); return false; }
    setState(next.status); return false;
  }, [authentication.accessToken, data]);

  useEffect(() => {
    let active = true;
    void loadDirectorySettings(apiClient, authentication.accessToken).then((next) => {
      if (!active) return;
      if (next.status === "ready") { setData(next.data); setState("ready"); }
      else setState(next.status);
    });
    return () => { active = false; };
  }, [authentication.accessToken]);

  return <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6 lg:p-7">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-xl font-bold">تنظیمات کلینیک و رزرو</h1><p className="mt-1 text-sm text-muted-foreground">هر تغییر بعد از ذخیره دوباره از API خوانده می‌شود؛ وضعیت سبز یعنی داده روی سرور تأیید شده است.</p></div>{data && <button type="button" className={secondaryButton} onClick={() => void refresh()}><RefreshCw size={15} />تازه‌سازی</button>}</div>
    {refreshWarning && <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span>آخرین تغییر ذخیره شد، اما دریافت مجدد تنظیمات ناموفق بود. اطلاعات قبلی هنوز نمایش داده می‌شود.</span><button type="button" className={secondaryButton} onClick={() => void refresh()}>تلاش دوباره</button></div>}
    {state === "loading" ? <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">در حال دریافت تنظیمات…</p> : data ? <><SettingsForms data={data} accessToken={authentication.accessToken} refresh={refresh} /><details className="rounded-2xl border border-border bg-card"><summary className="cursor-pointer list-none p-5 font-bold">تنظیمات پیشرفته درگاه پرداخت</summary><div className="border-t border-border p-4"><PaymentProviderSettings accessToken={authentication.accessToken} /></div></details></> : <Notice state={state as Exclude<DirectorySettingsState["status"], "ready">} onRetry={() => { setState("loading"); void refresh(); }} />}
  </div>;
}
