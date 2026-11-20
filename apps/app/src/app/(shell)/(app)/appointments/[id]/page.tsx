"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenText,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Video,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { DoctorPortrait } from "@/components/booking/doctor-portrait";
import { LoadingState } from "@/components/shared/skeletons";
import { ServicePage } from "@/components/shared/service-page";
import { appointmentStatusLabels } from "@/lib/appointment-labels";
import {
  appointmentErrorMessage,
  cancelPatientAppointment,
  getPatientAppointment,
  type PatientAppointment,
} from "@/lib/appointment-api";
import { getPatientDoctor, type PatientDoctorDetail } from "@/lib/directory-api";
import { formatPrice } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

const onlineStatuses = ["CONFIRMED", "CHECKED_IN", "QUEUED", "IN_PROGRESS", "COMPLETED"];

function statusStyle(status: PatientAppointment["status"]) {
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "CANCELLED" || status === "NO_SHOW") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "IN_PROGRESS" || status === "QUEUED" || status === "CHECKED_IN") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function AppointmentDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const navigateScreen = useScreenNavigation();
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const [appointment, setAppointment] = useState<PatientAppointment | null>(null);
  const [doctor, setDoctor] = useState<PatientDoctorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    void getPatientAppointment(token, id).then(setAppointment, (reason: unknown) => {
      setError(appointmentErrorMessage(reason));
    });
  }, [id, token]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    if (!appointment) {
      setDoctor(null);
      return;
    }
    let active = true;
    void getPatientDoctor(token, appointment.doctorId)
      .then((profile) => {
        if (active) setDoctor(profile);
      })
      .catch(() => {
        if (active) setDoctor(null);
      });
    return () => {
      active = false;
    };
  }, [appointment, token]);

  const cancel = async () => {
    if (!appointment || !confirm("آیا از لغو این نوبت مطمئن هستید؟")) return;
    setSaving(true);
    try {
      setAppointment(await cancelPatientAppointment(token, appointment.id));
    } catch (reason) {
      setError(appointmentErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const canChange = appointment?.status === "PENDING" || appointment?.status === "CONFIRMED";
  const offering = doctor?.offerings.find((item) => item.id === appointment?.doctorServiceId);
  const visitMode = appointment?.visitMode ?? offering?.visitMode;
  const appointmentDate = appointment
    ? new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "full",
        timeZone: "Asia/Tehran",
      }).format(new Date(appointment.startsAt))
    : "";
  const appointmentTime = appointment
    ? new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tehran",
      }).format(new Date(appointment.startsAt))
    : "";
  const appointmentEndTime = appointment
    ? new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tehran",
      }).format(new Date(appointment.endsAt))
    : "";

  return (
    <ServicePage
      title="جزئیات نوبت"
      description="اطلاعات و کارهای مربوط به این مشاوره را یک‌جا ببینید."
      icon={CalendarDays}
      backHref="/appointments"
      backLabel="نوبت‌های من"
      className="appointment-detail-page"
    >
      <div className="mx-auto grid w-full max-w-xl gap-4 pb-6">
        {!appointment && !error && <LoadingState label="در حال دریافت نوبت…" variant="detail" />}

        {error && (
          <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            <p>{error}</p>
            <button type="button" onClick={load} className="mt-3 font-bold text-primary">
              تلاش دوباره
            </button>
          </div>
        )}

        {appointment && (
          <>
            <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 shadow-[0_16px_45px_-32px_rgba(37,99,235,0.45)]">
              <div className="flex items-center justify-between gap-3 border-b border-blue-100/80 px-5 py-4 sm:px-6">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(appointment.status)}`}>
                  {appointment.status === "COMPLETED" || appointment.status === "IN_PROGRESS"
                    ? <CheckCircle2 size={15} aria-hidden="true" />
                    : appointment.status === "CANCELLED" || appointment.status === "NO_SHOW"
                      ? <XCircle size={15} aria-hidden="true" />
                      : <Clock3 size={15} aria-hidden="true" />}
                  {appointmentStatusLabels[appointment.status] ?? appointment.status}
                </span>
                <span className="text-xs font-semibold text-slate-500">نوبت درمانی</span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3.5">
                  <DoctorPortrait
                    name={doctor?.displayName ?? "پزشک"}
                    url={doctor?.profileImageUrl}
                    token={token}
                    className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white bg-blue-100 object-cover text-lg font-bold text-blue-700 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">پزشک شما</p>
                    <h2 className="mt-1 truncate text-lg font-extrabold text-slate-900">
                      {doctor?.displayName ?? "نوبت درمانی"}
                    </h2>
                    <p className="mt-1 truncate text-sm font-medium text-slate-600">
                      {offering?.service.name ?? "مشاورهٔ پزشکی"}
                    </p>
                  </div>
                  <span className="hidden size-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-blue-600 shadow-sm sm:grid" aria-hidden="true">
                    {visitMode === "IN_PERSON" ? <MapPin size={20} /> : <Video size={20} />}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700" aria-hidden="true">
                      <CalendarClock size={21} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{appointmentDate}</p>
                      <p className="mt-1 text-sm text-slate-600">ساعت {appointmentTime} تا {appointmentEndTime}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-blue-100 bg-white/75 p-3.5">
                    <div className="flex items-center gap-2 text-slate-500">
                      {visitMode === "IN_PERSON" ? <MapPin size={16} aria-hidden="true" /> : <Video size={16} aria-hidden="true" />}
                      <span className="text-xs">نوع ویزیت</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {visitMode === "IN_PERSON" ? "حضوری" : "آنلاین"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-white/75 p-3.5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <WalletCards size={16} aria-hidden="true" />
                      <span className="text-xs">هزینهٔ ثبت‌شده</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {formatPrice(appointment.priceAmount)} {appointment.currency === "IRR" ? "ریال" : appointment.currency === "TOMAN" ? "تومان" : appointment.currency}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-blue-100 pt-3 text-xs">
                  <span className="shrink-0 text-slate-500">کد پیگیری</span>
                  <span dir="ltr" className="break-all text-left font-semibold tracking-wide text-slate-700">{appointment.id}</span>
                </div>
              </div>
            </section>

            {visitMode === "ONLINE" && onlineStatuses.includes(appointment.status) && (
              <Link
                href={`/chat?appointmentId=${appointment.id}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_12px_24px_-16px_rgba(37,99,235,0.9)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex items-center gap-2.5"><MessageCircle size={19} aria-hidden="true" />ورود به گفتگوی این نوبت</span>
                <ArrowLeft size={18} aria-hidden="true" />
              </Link>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/treatment" className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-bold text-foreground shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700" aria-hidden="true"><BookOpenText size={19} /></span>
                <span>نسخه‌ها و دستورهای درمان</span>
                <ArrowLeft size={16} className="ms-auto shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            </div>

            {canChange && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancel}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <XCircle size={17} aria-hidden="true" />لغو نوبت
                </button>
                <button
                  type="button"
                  onClick={() => navigateScreen("BookStep2", { doctorServiceId: appointment.doctorServiceId, doctorId: appointment.doctorId, appointmentId: appointment.id })}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-800 transition hover:bg-blue-100"
                >
                  <CalendarDays size={17} aria-hidden="true" />تغییر زمان
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ServicePage>
  );
}
