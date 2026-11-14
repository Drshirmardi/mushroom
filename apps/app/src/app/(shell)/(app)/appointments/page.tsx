'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ArrowLeft, Plus } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import {
  ServicePage,
  ServiceSection,
  ServiceEmpty,
  ServiceTabs,
} from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { listPatientAppointments } from '@/lib/appointment-api';
import { appointmentStatusLabels } from '@/lib/appointment-labels';
import { usePatientResource } from '@/lib/use-patient-resource';

export default function AppointmentsPage() {
  const { authentication } = useAuthSession();
  const [view, setView] = useState<'current' | 'history'>('current');
  const resource = usePatientResource(
    useCallback(
      () => listPatientAppointments(authentication.accessToken),
      [authentication.accessToken],
    ),
  );
  const items = resource.data?.items.filter(
    (item) => ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(item.status) === (view === 'history'),
  );
  return (
    <ServicePage
      title="نوبت‌های من"
      description="زمان مشاوره، وضعیت رزرو و راه ورود به نوبت را اینجا پیگیری کنید."
      icon={CalendarDays}
      action={
        <button type="button" onClick={() => void resource.reload()} disabled={resource.loading}>
          به‌روزرسانی
        </button>
      }
    >
      <Link href="/appointments/book" className="service-primary w-full">
        <Plus size={19} aria-hidden="true" />
        رزرو نوبت جدید
      </Link>
      <ServiceTabs<'current' | 'history'>
        value={view}
        onChange={setView}
        options={[
          { value: 'current', label: 'جاری و آینده' },
          { value: 'history', label: 'سوابق نوبت‌ها' },
        ]}
      />
      <ServiceSection
        title={view === 'current' ? 'نوبت‌های پیش رو' : 'نوبت‌های گذشته'}
        description="برای جزئیات، شرایط گفتگو یا پیگیری مشاوره، نوبت موردنظر را باز کنید."
      >
        <PatientResourceState {...resource} retry={() => void resource.reload()} />
        {items?.length === 0 && (
          <ServiceEmpty
            icon={CalendarDays}
            title={view === 'current' ? 'نوبت جاری ندارید' : 'هنوز سابقهٔ نوبتی ندارید'}
            description={
              view === 'current'
                ? 'با انتخاب پزشک و زمان مناسب، اولین یا نوبت بعدی خود را رزرو کنید. نوبت‌های تمام‌شده را در «سوابق نوبت‌ها» می‌بینید.'
                : 'پس از پایان یا لغو نوبت، سابقه و جزئیات آن در این قسمت باقی می‌ماند.'
            }
            href="/appointments/book"
            action="انتخاب پزشک و زمان"
          />
        )}
        {items?.map((item) => (
          <Link
            key={item.id}
            href={`/appointments/${encodeURIComponent(item.id)}`}
            className="service-card"
          >
            <div className="service-card-top">
              <h3>
                {new Intl.DateTimeFormat('fa-IR', {
                  dateStyle: 'full',
                  timeZone: 'Asia/Tehran',
                }).format(new Date(item.startsAt))}
              </h3>
              <span
                className={`service-badge ${item.status === 'COMPLETED' ? 'service-badge--success' : ''}`}
              >
                {appointmentStatusLabels[item.status]}
              </span>
            </div>
            <p>
              ساعت{' '}
              {new Intl.DateTimeFormat('fa-IR', {
                timeStyle: 'short',
                timeZone: 'Asia/Tehran',
              }).format(new Date(item.startsAt))}
            </p>
            <span className="service-text-action">
              جزئیات و پیگیری نوبت
              <ArrowLeft size={17} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </ServiceSection>
    </ServicePage>
  );
}
