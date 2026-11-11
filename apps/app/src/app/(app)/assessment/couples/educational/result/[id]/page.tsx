'use client';
import { participationLoader } from '@/lib/participation-loader';
import { PatientRequestError } from '@/lib/patient-request';
import { currentInvitationContext } from '@/lib/marriage-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { HeartHandshake, Sparkles, Users } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { MizajResult } from '@/components/assessments/mizaj-result';
import { getEducationalCoupleResult } from '@/lib/couples-api';
import { usePatientResource } from '@/lib/use-patient-resource';

export default function EducationalCoupleResultPage() {
  const { id } = useParams<{ id: string }>();
  const { authentication } = useAuthSession();
  const scope = `${id}:${authentication.user.id}`;
  const [backHref, setBackHref] = useState('/assessment/couples/educational/' + id);
  const [activeTab, setActiveTab] = useState<'all' | 'self' | 'partner'>('all');

  useEffect(() => {
    const request = currentInvitationContext();
    if (request) setBackHref('/assessment/marriage/requests/' + request);
  }, [id]);

  const loader = useMemo(
    () =>
      participationLoader(async (token: string) => {
        try {
          return {
            allowed: true as const,
            result: await getEducationalCoupleResult(token, scope.split(':')[0]),
          };
        } catch (error) {
          if (error instanceof PatientRequestError && [401, 403, 404].includes(error.status))
            return { allowed: false as const };
          throw error;
        }
      }),
    [scope],
  );

  const resource = usePatientResource(
    useCallback(
      () => loader.load(authentication.accessToken),
      [loader, authentication.accessToken],
    ),
  );
  const denied = resource.data?.allowed === false;
  const result = resource.data?.allowed ? resource.data.result : null;
  const reload = resource.refresh;

  useEffect(() => {
    const update = () => {
      if (!denied && navigator.onLine && document.visibilityState === 'visible') void reload();
    };
    const timer = window.setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [reload, denied]);

  const visibleResults = useMemo(() => {
    if (!result) return [];
    if (activeTab === 'self') return result.results.filter((item) => item.isSelf);
    if (activeTab === 'partner') return result.results.filter((item) => !item.isSelf);
    return result.results;
  }, [result, activeTab]);

  return (
    <ServicePage
      title="نتیجه تست دو نفره"
      description="نتیجه هر نفر و توضیح مشترک این تست."
      icon={Users}
      backHref={backHref}
      backLabel="جزئیات تست"
    >
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <PatientResourceState variant="detail" {...resource} retry={() => void reload()} />
        {denied && (
          <div
            role="alert"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"
          >
            دسترسی به نتیجه مشترک تأیید نشد؛ وضعیت رضایت و حساب خود را بررسی کنید.
          </div>
        )}
        {result && (
          <>
            {result.jointText && (
              <section className="space-y-3 rounded-3xl border border-primary/25 bg-gradient-to-l from-primary/8 via-primary/4 to-white p-5 shadow-2xs sm:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <HeartHandshake size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <Sparkles size={13} aria-hidden="true" />
                      جمع‌بندی مشترک زوجین
                    </span>
                    <h2 className="text-base font-bold text-foreground sm:text-lg">
                      توضیح مشترک این ترکیب
                    </h2>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-8 text-foreground/90">
                  {result.jointText}
                </p>
              </section>
            )}

            {result.results.length > 1 && (
              <div
                role="group"
                aria-label="فیلتر نمایش نتیجه"
                className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border/70 bg-muted/60 p-1.5 lg:hidden"
              >
                {[
                  { id: 'all' as const, label: 'هر دو نفر' },
                  { id: 'self' as const, label: 'نتیجهٔ شما' },
                  { id: 'partner' as const, label: 'نفر دوم' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="min-h-10 rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all aria-pressed:bg-white aria-pressed:font-bold aria-pressed:text-foreground aria-pressed:shadow-xs"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              {visibleResults.map((item) => (
                <section
                  key={item.slot}
                  className={[
                    'min-w-0 space-y-3',
                    activeTab !== 'all' ? 'lg:col-span-2' : '',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-white px-4 py-2.5 shadow-2xs">
                    <h2 className="text-sm font-bold text-foreground sm:text-base">
                      {item.isSelf ? 'نتیجهٔ شما' : 'نتیجهٔ نفر دوم'}
                      {item.roleTitle ? ` · ${item.roleTitle}` : ''}
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        item.isSelf
                          ? 'bg-primary/10 text-primary'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {item.isSelf ? 'حساب شما' : 'حساب همراه'}
                    </span>
                  </div>
                  {item.resultSnapshot.algorithmId === 'DIMENSION_TIEBREAK' ? (
                    <MizajResult
                      snapshot={item.resultSnapshot}
                      subjectLabel={item.isSelf ? 'شما' : 'نفر دوم'}
                    />
                  ) : (
                    <p className="rounded-2xl border border-border/80 bg-white p-4 text-sm leading-7 text-foreground shadow-2xs">
                      {String(
                        (item.resultSnapshot.resultBand as { title?: string } | null)?.title ??
                          'نتیجهٔ قطعی ثبت نشده است',
                      )}
                    </p>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </ServicePage>
  );
}
