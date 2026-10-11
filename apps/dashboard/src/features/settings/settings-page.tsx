"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft, BriefcaseMedical, Building2, CalendarDays, Check, CheckCircle2,
  Clock, CreditCard, LoaderCircle, Pencil, Power, RefreshCw, Save, ShieldAlert,
  Stethoscope, Trash2, Wallet, X,
  MessageSquareText,
} from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { PaymentProviderSettings } from "@/features/settings/payment-provider-settings";
import { SmsSettings } from "@/features/settings/sms-settings";
import { settingsProgress } from "@/features/settings/settings-flow";
import { apiClient } from "@/lib/api";
import {
  createAvailabilityRule, createClinicClosure, createDoctor, createDoctorException,
  createDoctorService, createService, createSpecialty, deleteAvailabilityRule,
  deleteClinicClosure, deleteDoctor, deleteDoctorException, deleteDoctorService,
  deleteService, deleteSpecialty, directoryMutationMessage,
  loadDirectorySettings, type DirectorySettingsData, type DirectorySettingsState,
  updateAvailabilityRule, updateClinic, updateClinicClosure, updateDoctor,
  updateDoctorException, updateDoctorService, updateService, updateSpecialty,
} from "@/lib/directory-settings-api";

const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";
const WEEKDAYS = ["دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه", "یکشنبه"];

type Area = "clinic" | "specialty" | "doctor" | "service" | "offering" | "schedule" | "closure" | "leave";
type SettingsPanel = Exclude<Area, "closure" | "leave"> | "calendar" | "payment" | "sms";
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

function SettingsDialog({ children, onClose, busy }: { children: ReactNode; onClose: () => void; busy: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !busy) { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title" onKeyDown={onKeyDown} className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-5xl sm:rounded-3xl sm:border sm:border-border">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div><p className="text-xs font-bold text-primary">ویرایش متمرکز</p><h2 id="settings-dialog-title" className="mt-1 text-lg font-bold">مدیریت تنظیمات</h2></div>
        <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="بستن پنجره تنظیمات" className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50"><X size={20} /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  </div>;
}

function OverviewCard({ icon: Icon, title, description, summary, ready, onClick }: { icon: ComponentType<{ size?: number }>; title: string; description: string; summary: string; ready?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex min-h-44 w-full flex-col rounded-2xl border border-border bg-card p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
    <span className={`grid h-11 w-11 place-items-center rounded-xl ${ready ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}>{ready ? <CheckCircle2 size={21} /> : <Icon size={21} />}</span>
    <span className="mt-4 font-bold">{title}</span>
    <span className="mt-1 text-xs leading-5 text-muted-foreground">{description}</span>
    <span className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs font-bold text-primary"><span>{summary}</span><ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /></span>
  </button>;
}

function RecordActions({ active, confirming, busy, onEdit, onToggle, onAskDelete, onCancelDelete, onDelete }: { active: boolean; confirming: boolean; busy: boolean; onEdit: () => void; onToggle: () => void; onAskDelete: () => void; onCancelDelete: () => void; onDelete: () => void }) {
  if (confirming) return <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-xs leading-5 text-red-800">از حذف این رکورد مطمئن هستید؟ اگر جای دیگری استفاده شده باشد، سرور حذف را متوقف می‌کند.</p><div className="mt-2 flex gap-2"><button type="button" className={dangerButton} disabled={busy} onClick={onDelete}><Trash2 size={14} />حذف قطعی</button><button type="button" className={secondaryButton} disabled={busy} onClick={onCancelDelete}>انصراف</button></div></div>;
  return <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={secondaryButton} disabled={busy} onClick={onEdit}><Pencil size={14} />ویرایش</button><button type="button" className={secondaryButton} disabled={busy} onClick={onToggle}><Power size={14} />{active ? "غیرفعال‌کردن" : "فعال‌کردن"}</button><button type="button" className={dangerButton} disabled={busy} onClick={onAskDelete}><Trash2 size={14} />حذف</button></div>;
}

const localDateTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function SettingsForms({ data, accessToken, refresh }: { data: DirectorySettingsData; accessToken: string; refresh: () => Promise<boolean> }) {
  const [activePanel, setActivePanel] = useState<SettingsPanel | null>(null);
  const [busyArea, setBusyArea] = useState<Area | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editing, setEditing] = useState<{ area: Area; id: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ area: Area; id: string } | null>(null);
  const [clinicName, setClinicName] = useState(data.clinic.name);
  const [clinicTimeZone, setClinicTimeZone] = useState(data.clinic.timeZone);
  const [specialtyName, setSpecialtyName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialtyIds, setDoctorSpecialtyIds] = useState<string[]>([]);
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
  const [leaveKind, setLeaveKind] = useState<"AVAILABLE" | "UNAVAILABLE">("UNAVAILABLE");
  const [leaveMode, setLeaveMode] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
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
  const isEditing = (area: Area, id?: string) => editing?.area === area && (id === undefined || editing.id === id);
  const isDeleting = (area: Area, id: string) => pendingDelete?.area === area && pendingDelete.id === id;
  const readyCount = progress.filter((item) => item.complete).length;

  const resetDrafts = () => {
    setClinicName(data.clinic.name); setClinicTimeZone(data.clinic.timeZone);
    setSpecialtyName(""); setDoctorName(""); setDoctorSpecialtyIds([]); setServiceName("");
    setOfferingDoctorId(""); setOfferingServiceId(""); setVisitMode("IN_PERSON"); setDuration("30"); setBuffer("0"); setPriceToman("0");
    setScheduleDoctorId(""); setScheduleMode("IN_PERSON"); setWeekday("6"); setStart("09:00"); setEnd("17:00");
    setClosureLabel(""); setClosureStart(""); setClosureEnd(""); setLeaveDoctorId(""); setLeaveKind("UNAVAILABLE"); setLeaveMode("IN_PERSON"); setLeaveLabel(""); setLeaveStart(""); setLeaveEnd("");
    setEditing(null); setPendingDelete(null); setFeedback(null);
  };
  const openPanel = (panel: SettingsPanel) => { resetDrafts(); setActivePanel(panel); };
  const closePanel = () => { if (busyArea === null) { resetDrafts(); setActivePanel(null); } };
  const cancelEdit = () => { resetDrafts(); };

  const mutate = async <T,>(area: Area, work: () => Promise<T>, success: string, onSuccess?: (result: T) => void) => {
    setBusyArea(area); setFeedback(null);
    try {
      const result = await work(); onSuccess?.(result);
      const refreshed = await refresh();
      setFeedback({ area, tone: "success", message: refreshed ? success : `${success}؛ تازه‌سازی صفحه ناموفق بود، دوباره تلاش کنید.` });
      return true;
    } catch (error) {
      setFeedback({ area, tone: "error", message: directoryMutationMessage(error) });
      return false;
    } finally { setBusyArea(null); }
  };

  const actions = (area: Area, id: string, active: boolean, onEdit: () => void, onToggle: () => void, onDelete: () => Promise<unknown>) => <RecordActions
    active={active} busy={busyArea !== null} confirming={isDeleting(area, id)} onEdit={onEdit} onToggle={onToggle}
    onAskDelete={() => setPendingDelete({ area, id })} onCancelDelete={() => setPendingDelete(null)}
    onDelete={() => void mutate(area, onDelete, "رکورد حذف شد.", () => { setPendingDelete(null); if (isEditing(area, id)) cancelEdit(); })}
  />;

  return <div className="space-y-7">
    <section className="overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold text-primary">نمای کلی کلینیک</p><h2 className="mt-2 text-xl font-bold sm:text-2xl">{data.clinic.name}</h2><p className="mt-2 text-sm text-muted-foreground">منطقه زمانی {data.clinic.timeZone} · اطلاعات از سرور دریافت شده است.</p></div><div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${readyCount === progress.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}><CheckCircle2 size={16} />{readyCount === progress.length ? "رزرو آماده است" : `${readyCount} از ${progress.length} پیش‌نیاز آماده است`}</div></div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[[data.doctors.length, "پزشک"], [data.services.length, "خدمت"], [data.doctorServices.length, "تعرفه"], [data.availabilityRules.length, "ساعت کاری"]].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/70 bg-background/80 p-4"><p className="text-2xl font-black">{value.toLocaleString("fa-IR")}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div>
      <div className="mt-5 flex flex-wrap gap-2">{progress.map((item) => <span key={item.id} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-bold ${item.complete ? "bg-emerald-100 text-emerald-800" : "bg-background text-muted-foreground ring-1 ring-border"}`}>{item.complete ? <Check size={14} /> : <Clock size={14} />}{item.label}</span>)}</div>
    </section>

    <section aria-labelledby="settings-categories-title"><div className="mb-4"><h2 id="settings-categories-title" className="text-lg font-bold">بخش‌های تنظیمات</h2><p className="mt-1 text-sm text-muted-foreground">هر بخش را برای مشاهده، ایجاد، ویرایش، فعال‌سازی یا حذف رکوردها باز کنید.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <OverviewCard icon={Building2} title="مشخصات کلینیک" description="نام کلینیک و منطقه زمانی نوبت‌ها" summary={data.clinic.timeZone} ready onClick={() => openPanel("clinic")} />
      <OverviewCard icon={Stethoscope} title="تخصص‌ها" description="مدیریت تخصص‌ها و وضعیت انتشار" summary={`${publishedSpecialties.length.toLocaleString("fa-IR")} تخصص آماده`} ready={complete("specialty")} onClick={() => openPanel("specialty")} />
      <OverviewCard icon={Stethoscope} title="پزشکان" description="پروفایل پزشک و تخصص‌های متصل" summary={`${publishedDoctors.length.toLocaleString("fa-IR")} پزشک آماده`} ready={complete("doctor")} onClick={() => openPanel("doctor")} />
      <OverviewCard icon={BriefcaseMedical} title="خدمات" description="مدیریت خدمات قابل رزرو" summary={`${publishedServices.length.toLocaleString("fa-IR")} خدمت آماده`} ready={complete("service")} onClick={() => openPanel("service")} />
      <OverviewCard icon={Wallet} title="تعرفه‌ها" description="قیمت، مدت و نوع ویزیت هر پزشک" summary={`${data.doctorServices.length.toLocaleString("fa-IR")} تعرفه`} ready={complete("offering")} onClick={() => openPanel("offering")} />
      <OverviewCard icon={Clock} title="ساعات کاری" description="برنامه هفتگی حضوری و آنلاین" summary={`${data.availabilityRules.length.toLocaleString("fa-IR")} بازه کاری`} ready={complete("schedule")} onClick={() => openPanel("schedule")} />
      <OverviewCard icon={CalendarDays} title="تعطیلی و استثناها" description="تعطیلی کلینیک، مرخصی و حضور اضافه پزشک" summary={`${(data.closures.length + data.exceptions.length).toLocaleString("fa-IR")} بازه ثبت‌شده`} onClick={() => openPanel("calendar")} />
      <OverviewCard icon={CreditCard} title="درگاه پرداخت" description="شناسه‌ها و کلید پذیرندگی سداد" summary="تنظیمات محرمانه" onClick={() => openPanel("payment")} />
      <OverviewCard icon={MessageSquareText} title="پیامک و کد یک‌بارمصرف" description="آداپتور ارسال، سیاست امنیتی و گزارش تحویل" summary="تنظیمات احراز هویت" onClick={() => openPanel("sms")} />
    </div></section>

    {activePanel && <SettingsDialog onClose={closePanel} busy={busyArea !== null}>
      {activePanel === "clinic" && <Section icon={Building2} title="مشخصات کلینیک" description="نام و منطقه زمانی مبنای نمایش نوبت‌ها و تقویم هستند."><form className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void mutate("clinic", () => updateClinic(accessToken, { name: clinicName.trim(), timeZone: clinicTimeZone.trim() }), "مشخصات کلینیک ذخیره شد."); }}><label className="text-sm font-bold">نام کلینیک<input className={`${field} mt-1.5`} value={clinicName} onChange={(event) => setClinicName(event.target.value)} /></label><label className="text-sm font-bold">منطقه زمانی<input className={`${field} mt-1.5`} value={clinicTimeZone} onChange={(event) => setClinicTimeZone(event.target.value)} placeholder="Asia/Tehran" dir="ltr" /></label><button className={`${primaryButton} self-end`} disabled={!clinicName.trim() || !clinicTimeZone.trim() || busyArea !== null}><BusyLabel busy={isBusy("clinic")}><Save size={16} />ذخیره</BusyLabel></button></form><AreaFeedback area="clinic" feedback={feedback} /></Section>}

      {activePanel === "specialty" && <Section number={1} icon={Stethoscope} title="تخصص‌ها" description="نام هر تخصص را می‌توانید اصلاح کنید، وضعیتش را تغییر دهید یا در صورت نداشتن وابستگی حذف کنید." complete={complete("specialty")}>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!specialtyName.trim()) return; const id = isEditing("specialty") ? editing!.id : null; void mutate("specialty", () => id ? updateSpecialty(accessToken, id, { name: specialtyName.trim() }) : createSpecialty(accessToken, { name: specialtyName.trim(), isActive: true, publicationStatus: "PUBLISHED" }), id ? "تخصص ویرایش شد." : "تخصص ایجاد و منتشر شد.", () => { setSpecialtyName(""); setEditing(null); }); }}><input className={field} value={specialtyName} onChange={(event) => setSpecialtyName(event.target.value)} placeholder="مثلاً طب سوزنی" aria-label="نام تخصص" /><button className={primaryButton} disabled={!specialtyName.trim() || busyArea !== null}><BusyLabel busy={isBusy("specialty")}>{isEditing("specialty") ? "ذخیره ویرایش" : "ایجاد تخصص"}</BusyLabel></button>{isEditing("specialty") && <button type="button" className={secondaryButton} onClick={cancelEdit}>انصراف</button>}</form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.specialties.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${isEditing("specialty", item.id) ? "border-primary bg-primary/5" : "border-border"}`}><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{item.name}</span><StatusPill published={item.publicationStatus === "PUBLISHED"} active={item.isActive} /></div>{actions("specialty", item.id, item.isActive, () => { setEditing({ area: "specialty", id: item.id }); setSpecialtyName(item.name); setFeedback(null); }, () => void mutate("specialty", () => updateSpecialty(accessToken, item.id, { isActive: !item.isActive, publicationStatus: !item.isActive ? "PUBLISHED" : "UNPUBLISHED" }), item.isActive ? "تخصص غیرفعال شد." : "تخصص فعال شد."), () => deleteSpecialty(accessToken, item.id))}</article>)}{data.specialties.length === 0 && <p className="text-sm text-muted-foreground">هنوز تخصصی ثبت نشده است.</p>}</div><AreaFeedback area="specialty" feedback={feedback} />
      </Section>}

      {activePanel === "doctor" && <Section number={2} icon={Stethoscope} title="پزشکان" description="نام و همه تخصص‌های هر پزشک را مدیریت کنید. غیرفعال‌کردن برای رکوردهای استفاده‌شده امن‌تر از حذف است." complete={complete("doctor")}>
        <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); if (!doctorName.trim() || doctorSpecialtyIds.length === 0) return; const id = isEditing("doctor") ? editing!.id : null; const body = { displayName: doctorName.trim(), specialtyIds: doctorSpecialtyIds, isActive: true, publicationStatus: "PUBLISHED" as const }; void mutate("doctor", () => id ? updateDoctor(accessToken, id, body) : createDoctor(accessToken, body), id ? "پروفایل پزشک ویرایش شد." : "پزشک ایجاد و منتشر شد.", (doctor) => { setDoctorName(""); setDoctorSpecialtyIds([]); setEditing(null); setOfferingDoctorId(doctor.id); setScheduleDoctorId(doctor.id); setLeaveDoctorId(doctor.id); }); }}><label className="block text-sm font-bold">نام نمایشی پزشک<input className={`${field} mt-1.5`} value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="دکتر ..." /></label><fieldset><legend className="text-sm font-bold">تخصص‌ها</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{publishedSpecialties.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={doctorSpecialtyIds.includes(item.id)} onChange={(event) => setDoctorSpecialtyIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />{item.name}</label>)}</div></fieldset><div className="flex gap-2"><button className={primaryButton} disabled={!doctorName.trim() || doctorSpecialtyIds.length === 0 || busyArea !== null}><BusyLabel busy={isBusy("doctor")}>{isEditing("doctor") ? "ذخیره ویرایش" : "ایجاد پزشک"}</BusyLabel></button>{isEditing("doctor") && <button type="button" className={secondaryButton} onClick={cancelEdit}>انصراف</button>}</div></form>
        {publishedSpecialties.length === 0 && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">ابتدا یک تخصص فعال و منتشرشده بسازید.</p>}
        <div className="mt-4 grid gap-3 xl:grid-cols-2">{data.doctors.map((doctor) => <article key={doctor.id} className={`rounded-xl border p-4 ${isEditing("doctor", doctor.id) ? "border-primary bg-primary/5" : "border-border"}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{doctor.displayName}</h3><p className="mt-1 text-xs text-muted-foreground">{doctor.specialties.map((item) => item.name).join("، ") || "بدون تخصص"}</p></div><StatusPill published={doctor.publicationStatus === "PUBLISHED"} active={doctor.isActive} /></div>{actions("doctor", doctor.id, doctor.isActive, () => { setEditing({ area: "doctor", id: doctor.id }); setDoctorName(doctor.displayName); setDoctorSpecialtyIds(doctor.specialties.filter((item) => publishedSpecialtyIds.has(item.id)).map((item) => item.id)); setFeedback(null); }, () => void mutate("doctor", () => updateDoctor(accessToken, doctor.id, { isActive: !doctor.isActive, publicationStatus: !doctor.isActive ? "PUBLISHED" : "UNPUBLISHED" }), doctor.isActive ? "پزشک غیرفعال شد." : "پزشک فعال شد."), () => deleteDoctor(accessToken, doctor.id))}</article>)}{data.doctors.length === 0 && <p className="text-sm text-muted-foreground">هنوز پزشکی ثبت نشده است.</p>}</div><AreaFeedback area="doctor" feedback={feedback} />
      </Section>}

      {activePanel === "service" && <Section number={3} icon={BriefcaseMedical} title="خدمات" description="خدمت را ویرایش، فعال یا غیرفعال کنید؛ حذف فقط وقتی ممکن است که تعرفه یا نوبتی به آن وابسته نباشد." complete={complete("service")}>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!serviceName.trim()) return; const id = isEditing("service") ? editing!.id : null; void mutate("service", () => id ? updateService(accessToken, id, { name: serviceName.trim() }) : createService(accessToken, { name: serviceName.trim(), isActive: true, publicationStatus: "PUBLISHED" }), id ? "خدمت ویرایش شد." : "خدمت ایجاد و منتشر شد.", (service) => { setServiceName(""); setEditing(null); setOfferingServiceId(service.id); }); }}><input className={field} value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="مثلاً جلسه طب سوزنی" aria-label="نام خدمت" /><button className={primaryButton} disabled={!serviceName.trim() || busyArea !== null}><BusyLabel busy={isBusy("service")}>{isEditing("service") ? "ذخیره ویرایش" : "ایجاد خدمت"}</BusyLabel></button>{isEditing("service") && <button type="button" className={secondaryButton} onClick={cancelEdit}>انصراف</button>}</form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.services.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${isEditing("service", item.id) ? "border-primary bg-primary/5" : "border-border"}`}><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{item.name}</span><StatusPill published={item.publicationStatus === "PUBLISHED"} active={item.isActive} /></div>{actions("service", item.id, item.isActive, () => { setEditing({ area: "service", id: item.id }); setServiceName(item.name); setFeedback(null); }, () => void mutate("service", () => updateService(accessToken, item.id, { isActive: !item.isActive, publicationStatus: !item.isActive ? "PUBLISHED" : "UNPUBLISHED" }), item.isActive ? "خدمت غیرفعال شد." : "خدمت فعال شد."), () => deleteService(accessToken, item.id))}</article>)}{data.services.length === 0 && <p className="text-sm text-muted-foreground">هنوز خدمتی ثبت نشده است.</p>}</div><AreaFeedback area="service" feedback={feedback} />
      </Section>}

      {activePanel === "offering" && <Section number={4} icon={Wallet} title="تعرفه و نوع ویزیت" description="همه جزئیات تعرفه‌های موجود قابل ویرایش است؛ مبلغ در رابط به تومان و در سرور به ریال ذخیره می‌شود." complete={complete("offering")}>
        <form className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => { event.preventDefault(); if (!offeringDoctorId || !offeringServiceId || !offeringValuesValid) { setFeedback({ area: "offering", tone: "error", message: "مدت، فاصله و قیمت را با عدد معتبر وارد کنید." }); return; } const id = isEditing("offering") ? editing!.id : null; const body = { doctorId: offeringDoctorId, serviceId: offeringServiceId, visitMode, durationMinutes: durationNumber, bufferMinutes: bufferNumber, priceAmount: priceTomanNumber * 10, currency: "IRR" as const, isActive: true, publicationStatus: "PUBLISHED" as const }; void mutate("offering", () => id ? updateDoctorService(accessToken, id, body) : createDoctorService(accessToken, body), id ? "تعرفه ویرایش شد." : "تعرفه فعال و منتشر شد.", () => { setEditing(null); setOfferingDoctorId(""); setOfferingServiceId(""); setVisitMode("IN_PERSON"); setDuration("30"); setBuffer("0"); setPriceToman("0"); }); }}>
          <label className="text-sm font-bold">پزشک<select className={`${field} mt-1.5`} value={offeringDoctorId} onChange={(event) => setOfferingDoctorId(event.target.value)}><option value="">انتخاب پزشک</option>{data.doctors.map((item) => <option key={item.id} value={item.id}>{item.displayName}{item.isActive ? "" : " (غیرفعال)"}</option>)}</select></label><label className="text-sm font-bold">خدمت<select className={`${field} mt-1.5`} value={offeringServiceId} onChange={(event) => setOfferingServiceId(event.target.value)}><option value="">انتخاب خدمت</option>{data.services.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " (غیرفعال)"}</option>)}</select></label><label className="text-sm font-bold">نوع ویزیت<select className={`${field} mt-1.5`} value={visitMode} onChange={(event) => setVisitMode(event.target.value as "IN_PERSON" | "ONLINE")}><option value="IN_PERSON">حضوری</option><option value="ONLINE">آنلاین</option></select></label><label className="text-sm font-bold">قیمت (تومان)<input className={`${field} mt-1.5`} type="number" min="0" step="1" value={priceToman} onChange={(event) => setPriceToman(event.target.value)} /></label><label className="text-sm font-bold">مدت ویزیت (دقیقه)<input className={`${field} mt-1.5`} type="number" min="5" max="360" value={duration} onChange={(event) => setDuration(event.target.value)} /></label><label className="text-sm font-bold">فاصله بعد از ویزیت<input className={`${field} mt-1.5`} type="number" min="0" max="120" value={buffer} onChange={(event) => setBuffer(event.target.value)} /></label><div className="flex gap-2 self-end md:col-span-2"><button className={`${primaryButton} flex-1`} disabled={!offeringDoctorId || !offeringServiceId || !offeringValuesValid || busyArea !== null}><BusyLabel busy={isBusy("offering")}>{isEditing("offering") ? "ذخیره ویرایش" : "ثبت تعرفه"}</BusyLabel></button>{isEditing("offering") && <button type="button" className={secondaryButton} onClick={cancelEdit}>انصراف</button>}</div>
        </form>
        <div className="mt-4 space-y-3">{data.doctorServices.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${isEditing("offering", item.id) ? "border-primary bg-primary/5" : "border-border"}`}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-bold">{item.doctor.name} · {item.service.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.visitMode === "ONLINE" ? "آنلاین" : "حضوری"} · {item.durationMinutes} دقیقه + {item.bufferMinutes} دقیقه فاصله · {(item.priceAmount / 10).toLocaleString("fa-IR")} تومان</p></div><StatusPill published={item.publicationStatus === "PUBLISHED"} active={item.isActive} /></div>{actions("offering", item.id, item.isActive, () => { setEditing({ area: "offering", id: item.id }); setOfferingDoctorId(item.doctor.id); setOfferingServiceId(item.service.id); setVisitMode(item.visitMode as "IN_PERSON" | "ONLINE"); setDuration(String(item.durationMinutes)); setBuffer(String(item.bufferMinutes)); setPriceToman(String(item.priceAmount / 10)); setFeedback(null); }, () => void mutate("offering", () => updateDoctorService(accessToken, item.id, { isActive: !item.isActive, publicationStatus: !item.isActive ? "PUBLISHED" : "UNPUBLISHED" }), item.isActive ? "تعرفه غیرفعال شد." : "تعرفه فعال شد."), () => deleteDoctorService(accessToken, item.id))}</article>)}{data.doctorServices.length === 0 && <p className="text-sm text-muted-foreground">هنوز تعرفه‌ای ثبت نشده است.</p>}</div><AreaFeedback area="offering" feedback={feedback} />
      </Section>}

      {activePanel === "schedule" && <Section number={5} icon={Clock} title="ساعات کاری پزشک" description="بازه‌های هفتگی را ویرایش، موقتاً غیرفعال یا حذف کنید." complete={complete("schedule")}>
        <form className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2 xl:grid-cols-6" onSubmit={(event) => { event.preventDefault(); if (!scheduleDoctorId || start >= end) { setFeedback({ area: "schedule", tone: "error", message: "زمان پایان باید بعد از زمان شروع باشد." }); return; } const id = isEditing("schedule") ? editing!.id : null; const body = { doctorId: scheduleDoctorId, visitMode: scheduleMode, isoWeekday: Number(weekday), startLocalTime: start, endLocalTime: end, isActive: true }; void mutate("schedule", () => id ? updateAvailabilityRule(accessToken, id, body) : createAvailabilityRule(accessToken, body), id ? "ساعت کاری ویرایش شد." : "ساعت کاری ثبت شد.", () => { setEditing(null); setScheduleDoctorId(""); }); }}><label className="text-sm font-bold xl:col-span-2">پزشک<select className={`${field} mt-1.5`} value={scheduleDoctorId} onChange={(event) => setScheduleDoctorId(event.target.value)}><option value="">انتخاب پزشک</option>{data.doctors.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><label className="text-sm font-bold">نوع ویزیت<select className={`${field} mt-1.5`} value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as "IN_PERSON" | "ONLINE")}><option value="IN_PERSON">حضوری</option><option value="ONLINE">آنلاین</option></select></label><label className="text-sm font-bold">روز<select className={`${field} mt-1.5`} value={weekday} onChange={(event) => setWeekday(event.target.value)}>{WEEKDAYS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label><label className="text-sm font-bold">از<input className={`${field} mt-1.5`} type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="text-sm font-bold">تا<input className={`${field} mt-1.5`} type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label><div className="flex gap-2 md:col-span-2 xl:col-span-6"><button className={`${primaryButton} flex-1`} disabled={!scheduleDoctorId || !start || !end || busyArea !== null}><BusyLabel busy={isBusy("schedule")}>{isEditing("schedule") ? "ذخیره ویرایش" : "ثبت ساعت کاری"}</BusyLabel></button>{isEditing("schedule") && <button type="button" className={secondaryButton} onClick={cancelEdit}>انصراف</button>}</div></form>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{data.availabilityRules.map((item) => <article key={item.id} className={`rounded-xl border p-3 text-sm ${isEditing("schedule", item.id) ? "border-primary bg-primary/5" : "border-border"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{doctorNames.get(item.doctorId) ?? "پزشک نامشخص"}</p><p className="mt-1 text-xs text-muted-foreground">{WEEKDAYS[item.isoWeekday - 1]} · {item.startLocalTime} تا {item.endLocalTime} · {item.visitMode === "ONLINE" ? "آنلاین" : "حضوری"}</p></div><StatusPill published active={item.isActive} /></div>{actions("schedule", item.id, item.isActive, () => { setEditing({ area: "schedule", id: item.id }); setScheduleDoctorId(item.doctorId); setScheduleMode(item.visitMode as "IN_PERSON" | "ONLINE"); setWeekday(String(item.isoWeekday)); setStart(item.startLocalTime); setEnd(item.endLocalTime); setFeedback(null); }, () => void mutate("schedule", () => updateAvailabilityRule(accessToken, item.id, { isActive: !item.isActive }), item.isActive ? "ساعت کاری غیرفعال شد." : "ساعت کاری فعال شد."), () => deleteAvailabilityRule(accessToken, item.id))}</article>)}{data.availabilityRules.length === 0 && <p className="text-sm text-muted-foreground">هنوز ساعت کاری ثبت نشده است.</p>}</div><AreaFeedback area="schedule" feedback={feedback} />
      </Section>}

      {activePanel === "calendar" && <Section icon={CalendarDays} title="تعطیلی کلینیک و استثناهای پزشک" description="تعطیلی‌ها، مرخصی‌ها و حضور اضافه را از همین صفحه ویرایش یا حذف کنید.">
        <div className="grid gap-5 xl:grid-cols-2">
          <div><form className="space-y-3 rounded-xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); if (!closureLabel.trim() || !closureStart || !closureEnd || closureStart >= closureEnd) { setFeedback({ area: "closure", tone: "error", message: "عنوان و بازه معتبر تعطیلی را وارد کنید." }); return; } const id = isEditing("closure") ? editing!.id : null; const body = { label: closureLabel.trim(), startsAt: new Date(closureStart).toISOString(), endsAt: new Date(closureEnd).toISOString(), isActive: true }; void mutate("closure", () => id ? updateClinicClosure(accessToken, id, body) : createClinicClosure(accessToken, body), id ? "تعطیلی ویرایش شد." : "تعطیلی ثبت شد.", () => { setEditing(null); setClosureLabel(""); setClosureStart(""); setClosureEnd(""); }); }}><h3 className="font-bold">تعطیلی کلینیک</h3><input className={field} value={closureLabel} onChange={(event) => setClosureLabel(event.target.value)} placeholder="عنوان تعطیلی" /><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold">شروع<input className={`${field} mt-1`} type="datetime-local" value={closureStart} onChange={(event) => setClosureStart(event.target.value)} /></label><label className="text-xs font-bold">پایان<input className={`${field} mt-1`} type="datetime-local" value={closureEnd} onChange={(event) => setClosureEnd(event.target.value)} /></label></div><div className="flex gap-2"><button className={primaryButton} disabled={!closureLabel.trim() || !closureStart || !closureEnd || busyArea !== null}><BusyLabel busy={isBusy("closure")}>{isEditing("closure") ? "ذخیره ویرایش" : "ثبت تعطیلی"}</BusyLabel></button>{isEditing("closure") && <button type="button" className={secondaryButton} onClick={cancelEdit}>انصراف</button>}</div></form><AreaFeedback area="closure" feedback={feedback} /></div>
          <div><form className="space-y-3 rounded-xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); if (!leaveDoctorId || !leaveStart || !leaveEnd || leaveStart >= leaveEnd) { setFeedback({ area: "leave", tone: "error", message: "پزشک و بازه معتبر را وارد کنید." }); return; } const id = isEditing("leave") ? editing!.id : null; const body = { doctorId: leaveDoctorId, kind: leaveKind, visitMode: leaveKind === "UNAVAILABLE" ? null : leaveMode, label: (leaveLabel.trim() || null) as never, startsAt: new Date(leaveStart).toISOString(), endsAt: new Date(leaveEnd).toISOString(), isActive: true }; void mutate("leave", () => id ? updateDoctorException(accessToken, id, body) : createDoctorException(accessToken, body), id ? "استثنای برنامه ویرایش شد." : "استثنای برنامه ثبت شد.", () => { setEditing(null); setLeaveLabel(""); setLeaveStart(""); setLeaveEnd(""); }); }}><h3 className="font-bold">استثنای برنامه پزشک</h3><select className={field} value={leaveDoctorId} onChange={(event) => setLeaveDoctorId(event.target.value)}><option value="">انتخاب پزشک</option>{data.doctors.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold">نوع<select className={`${field} mt-1`} value={leaveKind} onChange={(event) => setLeaveKind(event.target.value as "AVAILABLE" | "UNAVAILABLE")}><option value="UNAVAILABLE">مرخصی / عدم حضور</option><option value="AVAILABLE">حضور اضافه</option></select></label>{leaveKind === "AVAILABLE" && <label className="text-xs font-bold">نوع ویزیت<select className={`${field} mt-1`} value={leaveMode} onChange={(event) => setLeaveMode(event.target.value as "IN_PERSON" | "ONLINE")}><option value="IN_PERSON">حضوری</option><option value="ONLINE">آنلاین</option></select></label>}</div><input className={field} value={leaveLabel} onChange={(event) => setLeaveLabel(event.target.value)} placeholder="توضیح اختیاری" /><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold">شروع<input className={`${field} mt-1`} type="datetime-local" value={leaveStart} onChange={(event) => setLeaveStart(event.target.value)} /></label><label className="text-xs font-bold">پایان<input className={`${field} mt-1`} type="datetime-local" value={leaveEnd} onChange={(event) => setLeaveEnd(event.target.value)} /></label></div><div className="flex gap-2"><button className={primaryButton} disabled={!leaveDoctorId || !leaveStart || !leaveEnd || busyArea !== null}><BusyLabel busy={isBusy("leave")}>{isEditing("leave") ? "ذخیره ویرایش" : "ثبت استثنا"}</BusyLabel></button>{isEditing("leave") && <button type="button" className={secondaryButton} onClick={cancelEdit}>انصراف</button>}</div></form><AreaFeedback area="leave" feedback={feedback} /></div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><div><h3 className="text-sm font-bold">تعطیلی‌های ثبت‌شده</h3><div className="mt-2 space-y-3">{data.closures.map((item) => <article key={item.id} className={`rounded-xl border p-3 text-sm ${isEditing("closure", item.id) ? "border-primary bg-primary/5" : "border-border"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: data.clinic.timeZone }).format(new Date(item.startsAt))}</p></div><StatusPill published active={item.isActive} /></div>{actions("closure", item.id, item.isActive, () => { setEditing({ area: "closure", id: item.id }); setClosureLabel(item.label); setClosureStart(localDateTime(item.startsAt)); setClosureEnd(localDateTime(item.endsAt)); setFeedback(null); }, () => void mutate("closure", () => updateClinicClosure(accessToken, item.id, { isActive: !item.isActive }), item.isActive ? "تعطیلی غیرفعال شد." : "تعطیلی فعال شد."), () => deleteClinicClosure(accessToken, item.id))}</article>)}{data.closures.length === 0 && <p className="text-sm text-muted-foreground">تعطیلی ثبت نشده است.</p>}</div></div><div><h3 className="text-sm font-bold">استثناهای پزشکان</h3><div className="mt-2 space-y-3">{data.exceptions.map((item) => <article key={item.id} className={`rounded-xl border p-3 text-sm ${isEditing("leave", item.id) ? "border-primary bg-primary/5" : "border-border"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{doctorNames.get(item.doctorId) ?? "پزشک نامشخص"} · {item.kind === "AVAILABLE" ? "حضور اضافه" : "مرخصی"}</p><p className="mt-1 text-xs text-muted-foreground">{typeof item.label === "string" && item.label ? item.label : "بدون توضیح"} · {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: data.clinic.timeZone }).format(new Date(item.startsAt))}</p></div><StatusPill published active={item.isActive} /></div>{actions("leave", item.id, item.isActive, () => { setEditing({ area: "leave", id: item.id }); setLeaveDoctorId(item.doctorId); setLeaveKind(item.kind as "AVAILABLE" | "UNAVAILABLE"); setLeaveMode((item.visitMode || "IN_PERSON") as "IN_PERSON" | "ONLINE"); setLeaveLabel(typeof item.label === "string" ? item.label : ""); setLeaveStart(localDateTime(item.startsAt)); setLeaveEnd(localDateTime(item.endsAt)); setFeedback(null); }, () => void mutate("leave", () => updateDoctorException(accessToken, item.id, { isActive: !item.isActive }), item.isActive ? "استثنا غیرفعال شد." : "استثنا فعال شد."), () => deleteDoctorException(accessToken, item.id))}</article>)}{data.exceptions.length === 0 && <p className="text-sm text-muted-foreground">استثنایی ثبت نشده است.</p>}</div></div></div>
      </Section>}
      {activePanel === "payment" && <Section icon={CreditCard} title="تنظیمات درگاه پرداخت" description="اطلاعات پذیرندگی سداد را به‌صورت یک نسخه رمزنگاری‌شده ثبت یا جایگزین کنید."><PaymentProviderSettings accessToken={accessToken} /></Section>}
      {activePanel === "sms" && <Section icon={MessageSquareText} title="پیامک و کد یک‌بارمصرف" description="آداپتور واقعی، credentialهای write-only، سیاست OTP و گزارش ارسال‌ها را مدیریت کنید."><SmsSettings accessToken={accessToken} /></Section>}
    </SettingsDialog>}
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
    {state === "loading" ? <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">در حال دریافت تنظیمات…</p> : data ? <SettingsForms data={data} accessToken={authentication.accessToken} refresh={refresh} /> : <Notice state={state as Exclude<DirectorySettingsState["status"], "ready">} onRetry={() => { setState("loading"); void refresh(); }} />}
  </div>;
}
