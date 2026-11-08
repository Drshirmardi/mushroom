'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, FileHeart } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import {
  ServicePage,
  ServiceSection,
  ServiceEmpty,
  ServiceTabs,
} from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import {
  listProgramOfferings,
  listProgramPurchases,
  listCustomOfferings,
  listCustomRequests,
} from '@/lib/digital-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { formatRial } from '@/lib/wallet-money';

type View = 'education' | 'custom' | 'mine';
export default function ProgramsPage() {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const [view, setView] = useState<View>('education');
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('view');
    if (value === 'education' || value === 'custom' || value === 'mine') setView(value);
  }, []);
  const changeView = (value: View) => {
    setView(value);
    const url = new URL(window.location.href);
    url.searchParams.set('view', value);
    window.history.replaceState(null, '', url);
  };
  const [page, setPage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);
  const [customPage, setCustomPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const programs = usePatientResource(
    useCallback(() => listProgramOfferings(token, page), [token, page]),
  );
  const purchases = usePatientResource(
    useCallback(() => listProgramPurchases(token, purchasePage), [token, purchasePage]),
  );
  const custom = usePatientResource(
    useCallback(() => listCustomOfferings(token, customPage), [token, customPage]),
  );
  const requests = usePatientResource(
    useCallback(() => listCustomRequests(token, requestPage), [token, requestPage]),
  );
  return (
    <ServicePage
      title="برنامه‌های سلامت"
      description="محتوای آموزشی آماده را ببینید یا برنامهٔ اختصاصی تحت نظر متخصص را پیگیری کنید."
      icon={BookOpen}
    >
      <ServiceTabs<View>
        value={view}
        onChange={changeView}
        options={[
          { value: 'education', label: 'آموزشی' },
          { value: 'custom', label: 'اختصاصی' },
          { value: 'mine', label: 'برنامه‌های من' },
        ]}
      />
      {view === 'education' && (
        <>
          <p className="service-note">
            برنامهٔ آموزشی برای آگاهی و یادگیری است. شرایط دسترسی، محتوا و هزینه را پیش از خرید
            بررسی کنید.
          </p>
          <ServiceSection
            title="برنامه‌های آموزشی"
            description="برنامه‌های منتشرشدهٔ کلینیک، با محتوای مشخص و دسترسی قابل پیگیری."
          >
            <PatientResourceState {...programs} retry={() => void programs.reload()} />
            {programs.data?.items.map((item) => (
              <Link key={item.id} href={`/programs/offerings/${item.id}`} className="service-card">
                <span className="service-badge">آموزشی</span>
                <h3 className="mt-2">{item.title}</h3>
                {item.summary && <p>{item.summary}</p>}
                <strong className="service-price">
                  {formatRial(BigInt(item.amountRial))} تومان
                </strong>
                <span className="service-text-action">
                  محتوا و شرایط دسترسی
                  <ArrowLeft size={17} aria-hidden="true" />
                </span>
              </Link>
            ))}
            {programs.data?.items.length === 0 && (
              <ServiceEmpty
                icon={BookOpen}
                title="برنامهٔ آموزشی تازه‌ای فعال نیست"
                description="پس از انتشار، برنامه‌های قابل دریافت اینجا دیده می‌شوند. اگر قبلاً برنامه‌ای گرفته‌اید، بخش «برنامه‌های من» را باز کنید."
              />
            )}
            {programs.data && (
              <PatientPagination page={page} total={programs.data.total} onChange={setPage} />
            )}
          </ServiceSection>
        </>
      )}
      {view === 'custom' && (
        <>
          <p className="service-note">
            ابتدا جزئیات خدمت را بخوانید، سپس درخواست خود را ثبت کنید. وضعیت بررسی و نسخه‌های
            منتشرشده از بخش «برنامه‌های من» قابل پیگیری‌اند.
          </p>
          <ServiceSection
            title="خدمات برنامهٔ اختصاصی"
            description="هر خدمت، شرایط پذیرش و مراحل دریافت خودش را دارد."
          >
            <PatientResourceState {...custom} retry={() => void custom.reload()} />
            {custom.data?.items.map((item) => (
              <Link
                key={item.id}
                href={`/programs/custom-offerings/${item.id}`}
                className="service-card"
              >
                <h3>{item.title}</h3>
                {item.summary && <p>{item.summary}</p>}
                <strong className="service-price">
                  {formatRial(BigInt(item.amountRial))} تومان
                </strong>
                <span className="service-text-action">
                  جزئیات و مراحل درخواست
                  <ArrowLeft size={17} aria-hidden="true" />
                </span>
              </Link>
            ))}
            {custom.data?.items.length === 0 && (
              <ServiceEmpty
                icon={FileHeart}
                title="خدمت اختصاصی تازه‌ای فعال نیست"
                description="درخواست‌های قبلی همچنان از بخش «برنامه‌های من» قابل پیگیری‌اند. برای دریافت مشاوره می‌توانید نوبت رزرو کنید."
                href="/appointments/book"
                action="رزرو مشاوره"
              />
            )}
            {custom.data && (
              <PatientPagination
                page={customPage}
                total={custom.data.total}
                onChange={setCustomPage}
              />
            )}
          </ServiceSection>
        </>
      )}
      {view === 'mine' && (
        <>
          <ServiceSection
            title="برنامه‌های خریداری‌شده"
            description="پرداخت، دسترسی و محتوای هر برنامه را از همین بخش ببینید."
          >
            <PatientResourceState {...purchases} retry={() => void purchases.reload()} />
            {purchases.data?.items.map((item) => (
              <Link key={item.id} href={`/programs/purchases/${item.id}`} className="service-card">
                <h3>{item.title}</h3>
                <span className="service-text-action">
                  بازکردن برنامه و بررسی دسترسی
                  <ArrowLeft size={17} aria-hidden="true" />
                </span>
              </Link>
            ))}
            {purchases.data?.items.length === 0 && (
              <ServiceEmpty
                title="هنوز برنامه‌ای خریداری نکرده‌اید"
                description="برنامه‌های شما پس از خرید اینجا قرار می‌گیرند. برای دیدن گزینه‌های موجود، بخش «آموزشی» را باز کنید."
              />
            )}
            {purchases.data && (
              <PatientPagination
                page={purchasePage}
                total={purchases.data.total}
                onChange={setPurchasePage}
              />
            )}
          </ServiceSection>
          <ServiceSection
            title="درخواست‌های اختصاصی"
            description="از ثبت درخواست تا بررسی متخصص و دریافت برنامه."
          >
            <PatientResourceState {...requests} retry={() => void requests.reload()} />
            {requests.data?.items.map((item) => (
              <Link key={item.id} href={`/programs/custom/${item.id}`} className="service-card">
                <h3>{item.title}</h3>
                <span className="service-text-action">
                  وضعیت درخواست و نسخه‌های برنامه
                  <ArrowLeft size={17} aria-hidden="true" />
                </span>
              </Link>
            ))}
            {requests.data?.items.length === 0 && (
              <ServiceEmpty
                title="درخواست اختصاصی ثبت نشده"
                description="برای آشنایی با خدمات و ثبت درخواست، بخش «اختصاصی» را بررسی کنید."
              />
            )}
            {requests.data && (
              <PatientPagination
                page={requestPage}
                total={requests.data.total}
                onChange={setRequestPage}
              />
            )}
          </ServiceSection>
        </>
      )}
    </ServicePage>
  );
}
