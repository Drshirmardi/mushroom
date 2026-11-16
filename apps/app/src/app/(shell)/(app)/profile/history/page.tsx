'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronDown, ChevronLeft, ClipboardList, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/components/auth/session-gate';
import { ClinicalHistoryApiError, getPatientClinicalHistory } from '@/lib/clinical-history-api';
import { clinicalDate, recentClinicalHistory } from '@/lib/clinical-history-view';
import { canGoBackInApp } from '@/lib/assessment-history';
import { usePatientResource } from '@/lib/use-patient-resource';
import { patientErrorMessage } from '@/lib/patient-request';
import styles from '@/components/profile/clinical-history.module.css';

export default function MedicalHistoryPage() {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const load = useCallback(async () => {
    try {
      const data = await getPatientClinicalHistory(authentication.accessToken);
      return { items: data.items, accessError: null };
    } catch (error) {
      // A revoked response replaces cached clinical data, including during a later retry.
      if (error instanceof ClinicalHistoryApiError && [401, 403, 404].includes(error.status)) {
        return { items: [], accessError: patientErrorMessage(error) };
      }
      throw error;
    }
  }, [authentication.accessToken]);
  const resource = usePatientResource(load);
  const error = resource.error ?? resource.data?.accessError ?? null;
  const items = resource.data ? recentClinicalHistory(resource.data.items) : [];
  return (
    <div dir="rtl">
      <PageHeader
        title="سوابق درمانی"
        onBack={() => (canGoBackInApp() ? router.back() : router.push('/profile'))}
        right={
          <Button
            variant="ghost"
            aria-label="تازه‌سازی سوابق"
            busy={resource.refreshing}
            disabled={resource.loading}
            onClick={() => void resource.refresh()}
          >
            <RefreshCw size={18} aria-hidden="true" />
          </Button>
        }
      />
      <div className={styles.content}>
        <p className={styles.intro}>
          خلاصهٔ ویزیت‌هایی که پزشک برای شما منتشر کرده است، اینجا نمایش داده می‌شود.
        </p>
        <Link href="/treatment" className={styles.treatment}>
          <ClipboardList size={22} aria-hidden="true" />
          <span>نسخه‌ها و برنامهٔ درمان من</span>
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <PatientResourceState
          {...resource}
          error={error}
          variant="list"
          retry={() => void resource.reload()}
        />
        {resource.data && !error && items.length === 0 && (
          <section className={styles.empty} aria-label="سوابق خالی">
            <Calendar size={28} aria-hidden="true" />
            <h2 className={styles.heading}>هنوز خلاصهٔ ویزیتی منتشر نشده است</h2>
            <p>پس از انتشار خلاصه توسط پزشک، می‌توانید آن را در این صفحه بخوانید.</p>
          </section>
        )}
        {items.length > 0 && (
          <section aria-labelledby="clinical-visits-heading">
            <h2 id="clinical-visits-heading" className={`${styles.heading} mb-3`}>
              ویزیت‌های ثبت‌شده
            </h2>
            <ul className={styles.list} aria-busy={resource.refreshing || undefined}>
              {items.map((item) => (
                <li key={item.encounterId}>
                  <article className={styles.card}>
                    <header>
                      <Calendar size={20} aria-hidden="true" />
                      <h3>
                        {Number.isFinite(Date.parse(item.completedAt)) ? (
                          <time dateTime={item.completedAt}>{clinicalDate(item.completedAt)}</time>
                        ) : (
                          clinicalDate(item.completedAt)
                        )}
                      </h3>
                    </header>
                    {item.patientSummary.length > 320 ? (
                      <details>
                        <summary>
                          <ChevronDown size={18} aria-hidden="true" />
                          مشاهدهٔ خلاصهٔ ویزیت
                        </summary>
                        <p className={styles.summary}>{item.patientSummary}</p>
                      </details>
                    ) : (
                      <p className={styles.summary}>
                        {item.patientSummary.trim() || 'خلاصه‌ای برای این ویزیت درج نشده است.'}
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
