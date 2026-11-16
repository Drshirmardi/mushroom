"use client";
import { Suspense, useCallback, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CirclePlay,
  ClipboardList,
  HeartHandshake,
  Leaf,
  Mail,
} from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listAssessmentHistory, listPublishedAssessments } from '@/lib/assessment-api';
import {
  listAssessmentOfferings,
  listAssessmentPurchases,
  listEducationalAssessmentOfferings,
} from '@/lib/digital-services-api';
import { listMarriageRequests } from '@/lib/marriage-api';
import { coupleStartHref } from '@/lib/couples-flow';
import { groupAssessmentCatalog } from '@/lib/assessment-catalog';
import { AssessmentResourceState, AssessmentPageSkeleton } from './assessment-loading';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { SegmentedTabs } from '@/components/shared/segmented-tabs';
import { formatRialWithUnit } from '@/lib/wallet-money';
import { billingStatusLabel } from '@/lib/wallet-labels';
import { toP } from '@/lib/format';

type Attempt = Awaited<ReturnType<typeof listAssessmentHistory>>['items'][number];

function attemptHref(item: Attempt) {
  const query = new URLSearchParams({ submissionId: item.id });
  if (item.marriageRequestId) query.set('marriageRequestId', item.marriageRequestId);
  return `/assessment/${item.state === 'COMPLETE' ? 'result' : 'resume'}?${query}`;
}

function Panel({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="grid min-w-0 gap-3 empty:hidden">
      {title && <h2 className="text-sm font-bold text-foreground sm:text-base">{title}</h2>}
      {children}
    </section>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={<AssessmentPageSkeleton />}>
      <AssessmentHub />
    </Suspense>
  );
}

function AssessmentHub() {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const router = useRouter();
  const search = useSearchParams();
  const value = search.get('view');
  const mine = ['mine', 'history', 'purchases'].includes(value ?? '');
  const section = search.get('section') ?? (value === 'purchases' ? 'purchases' : 'all');

  const invitations = usePatientResource(
    useCallback(
      () => listMarriageRequests(token, 1, { status: 'PENDING', direction: 'RECEIVED' }),
      [token],
    ),
  );
  const ongoing = usePatientResource(
    useCallback(() => listAssessmentHistory(token, 1, 'IN_PROGRESS'), [token]),
  );

  const invitation = invitations.data?.items[0];
  const draft = ongoing.data?.items.find((item) => item.resumeAvailable);

  const go = (view: string, selected?: string) =>
    router.push(
      `/assessment?${new URLSearchParams({ view, ...(selected ? { section: selected } : {}) })}`,
      { scroll: false },
    );

  return (
    <main
      className="mx-auto w-full max-w-3xl min-w-0 px-4 py-5 text-foreground break-words sm:px-6 sm:py-6"
      dir="rtl"
    >
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
      >
        <ArrowRight size={18} aria-hidden="true" />
        خانه
      </Link>

      <header className="mt-2 mb-6 flex items-center justify-between gap-4 rounded-3xl border border-border/70 bg-gradient-to-l from-primary/8 via-primary/4 to-transparent p-4 sm:p-5">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">تست‌ها و ارزیابی‌ها</h1>
          <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
            تست‌های فردی، زوجین و پیش از ازدواج را از اینجا شروع یا پیگیری کنید.
          </p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary shadow-2xs">
          <ClipboardList size={24} aria-hidden="true" />
        </span>
      </header>

      <div className="space-y-3">
        <Panel label="دعوت‌های منتظر شما">
          <AssessmentResourceState
            shape="invite"
            {...invitations}
            retry={() => void invitations.reload()}
          />
          {invitation && (
            <article className="grid gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-2xs sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                  <Mail size={16} aria-hidden="true" />
                  یک دعوت جدید دارید
                </p>
                <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-primary shadow-2xs">
                  منتظر پاسخ شما
                </span>
              </div>
              <h2 className="text-base font-bold leading-7 text-foreground">
                {invitation.service.title}
              </h2>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  href={invitation.invitationPath}
                >
                  بررسی دعوت
                  <ArrowLeft size={16} aria-hidden="true" />
                </Link>
                {invitations.data!.total > 1 && (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
                    onClick={() => go('mine', 'incoming')}
                  >
                    {toP(invitations.data!.total - 1)} دعوت دیگر
                    <ArrowLeft size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>
          )}
        </Panel>

        <Panel label="تست‌های در جریان">
          <AssessmentResourceState
            shape="row"
            {...ongoing}
            retry={() => void ongoing.reload()}
          />
          {draft && (
            <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <CirclePlay size={22} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold text-foreground sm:text-base">
                    {draft.title}
                  </h2>
                  <p className="text-xs leading-6 text-amber-900/80">نیمه‌تمام · آماده ادامه</p>
                </div>
              </div>
              <Link
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-primary shadow-2xs ring-1 ring-border transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
                href={attemptHref(draft)}
              >
                ادامه
                <ArrowLeft size={16} aria-hidden="true" />
              </Link>
            </article>
          )}
          {!!ongoing.data && ongoing.data.total > (draft ? 1 : 0) && (
            <button
              className="inline-flex min-h-10 items-center justify-center gap-1.5 self-start text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
              type="button"
              onClick={() => go('mine', 'ongoing')}
            >
              همهٔ تست‌های در جریان ({toP(ongoing.data.total)})
              <ArrowLeft size={15} aria-hidden="true" />
            </button>
          )}
        </Panel>
      </div>

      <SegmentedTabs
        ariaLabel="بخش تست‌ها"
        value={mine ? 'mine' : 'start'}
        onChange={(next) => go(next)}
        className="my-5"
        options={[
          {
            value: 'start',
            id: 'assessment-new-tab',
            controls: 'assessment-panel',
            label: 'تست جدید',
          },
          {
            value: 'mine',
            id: 'assessment-mine-tab',
            controls: 'assessment-panel',
            label: 'تست‌های من',
          },
        ]}
      />

      <div
        id="assessment-panel"
        role="tabpanel"
        aria-labelledby={mine ? 'assessment-mine-tab' : 'assessment-new-tab'}
      >
        {mine ? (
          <MyAssessments
            key={section}
            token={token}
            section={section}
            invitationId={invitation?.id}
            draftId={draft?.id}
            incoming={invitations}
          />
        ) : (
          <NewAssessments token={token} />
        )}
      </div>
    </main>
  );
}

function NewAssessments({ token }: { token: string }) {
  const [individualPage, setIndividualPage] = useState(1);
  const [marriagePage, setMarriagePage] = useState(1);
  const [legacyPage, setLegacyPage] = useState(1);

  const individual = usePatientResource(
    useCallback(
      () => listEducationalAssessmentOfferings(token, individualPage),
      [token, individualPage],
    ),
  );
  const marriage = usePatientResource(
    useCallback(
      () => listEducationalAssessmentOfferings(token, marriagePage, 'COUPLES', 'MARRIAGE'),
      [token, marriagePage],
    ),
  );
  const legacy = usePatientResource(
    useCallback(() => listAssessmentOfferings(token, legacyPage), [token, legacyPage]),
  );
  const published = usePatientResource(
    useCallback(() => listPublishedAssessments(token), [token]),
  );

  const hasData = !!(
    individual.data?.total ||
    marriage.data?.total ||
    legacy.data?.total ||
    published.data?.items.length
  );

  return (
    <div className="grid min-w-0 gap-6">
      {[
        {
          resource: marriage,
          page: marriagePage,
          set: setMarriagePage,
          label: 'تست‌های دو نفره',
          title: 'تست‌های زوجین و ازدواج',
        },
        {
          resource: individual,
          page: individualPage,
          set: setIndividualPage,
          label: 'تست‌های فردی',
          title: 'تست‌های فردی',
        },
      ].map(({ resource, page, set, label, title }) => {
        const items =
          resource.data?.items.filter(
            (item, index, all) => all.findIndex((other) => other.id === item.id) === index,
          ) ?? [];
        const showTitle = resource.loading || Boolean(resource.error) || items.length > 0;
        return (
          <Panel key={label} label={label} title={showTitle ? title : undefined}>
            <AssessmentResourceState {...resource} retry={() => void resource.reload()} />
            {items.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => {
                  const isCouple = item.kind === 'COUPLES' || item.servicePurpose === 'MARRIAGE';
                  const href =
                    item.servicePurpose === 'MARRIAGE'
                      ? coupleStartHref(item.id)
                      : item.kind === 'COUPLES'
                        ? `/assessment/couples?publicationId=${encodeURIComponent(item.id)}`
                        : `/assessment/educational/${encodeURIComponent(item.id)}`;
                  return (
                    <Link
                      key={item.id}
                      className="group flex min-w-0 flex-col justify-between rounded-2xl border border-border/80 bg-white p-4 shadow-2xs transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      href={href}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                            isCouple
                              ? 'bg-primary/10 text-primary'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isCouple ? (
                            <HeartHandshake aria-hidden="true" size={22} />
                          ) : (
                            <Leaf aria-hidden="true" size={22} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="inline-flex items-center rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {isCouple ? 'دو نفره · حساب مستقل' : 'فردی'}
                          </span>
                          <h3 className="text-sm font-bold leading-7 text-foreground sm:text-base">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs sm:text-sm">
                        <span className="font-semibold text-foreground">
                          {item.priceMode === 'FREE'
                            ? 'رایگان'
                            : formatRialWithUnit(BigInt(item.amountRial ?? '0'))}
                          {item.kind === 'COUPLES' && ' · دو نفر'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-primary transition-transform group-hover:-translate-x-0.5">
                          مشاهده تست
                          <ArrowLeft size={16} aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {resource.data && (
              <PatientPagination page={page} total={resource.data.total} onChange={set} />
            )}
          </Panel>
        );
      })}

      <Panel
        label="سایر عرضه‌های تست"
        title={
          legacy.loading || legacy.error || (legacy.data?.items.length ?? 0) > 0
            ? 'سایر عرضه‌های تست'
            : undefined
        }
      >
        <AssessmentResourceState {...legacy} retry={() => void legacy.reload()} />
        {(legacy.data?.items.length ?? 0) > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {legacy.data?.items.map((item) => (
              <Link
                className="group flex min-w-0 flex-col justify-between rounded-2xl border border-border/80 bg-white p-4 shadow-2xs transition-all hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                key={item.id}
                href={
                  item.kind === 'COUPLES'
                    ? `/assessment/couples?publicationId=${encodeURIComponent(item.id)}`
                    : `/assessment/offerings/${encodeURIComponent(item.id)}`
                }
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    {item.kind === 'COUPLES' ? (
                      <HeartHandshake size={22} aria-hidden="true" />
                    ) : (
                      <Leaf size={22} aria-hidden="true" />
                    )}
                  </span>
                  <h3 className="text-sm font-bold leading-7 text-foreground sm:text-base">
                    {item.title}
                  </h3>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs sm:text-sm">
                  <span className="font-semibold text-foreground">
                    {formatRialWithUnit(BigInt(item.amountRial))}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-primary">
                    مشاهده تست
                    <ArrowLeft size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {legacy.data && (
          <PatientPagination
            page={legacyPage}
            total={legacy.data.total}
            onChange={setLegacyPage}
          />
        )}
      </Panel>

      <Panel label="نسخه‌های دیگر تست‌ها">
        <AssessmentResourceState
          shape="row"
          {...published}
          retry={() => void published.reload()}
        />
        {!!published.data?.items.length && (
          <details className="group rounded-2xl border border-border/70 bg-white px-4 py-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
              <span>سایر تست‌ها و نسخه‌ها</span>
              <ChevronDown
                size={17}
                aria-hidden="true"
                className="transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="grid gap-2.5 border-t border-border/60 py-3">
              {groupAssessmentCatalog(published.data.items).map((group) => (
                <details
                  key={group.key}
                  className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2"
                >
                  <summary className="cursor-pointer py-1.5 text-sm font-semibold text-foreground">
                    {group.title}
                  </summary>
                  <div className="mt-2 divide-y divide-border/60 border-t border-border/60">
                    {group.versions.map((item) => (
                      <div
                        className="flex items-center justify-between gap-2 py-2.5 text-xs sm:text-sm"
                        key={item.id}
                      >
                        <span className="text-muted-foreground">
                          نسخهٔ {toP(item.versionNumber)}
                        </span>
                        <Link
                          className="inline-flex min-h-9 items-center gap-1 font-bold text-primary hover:underline"
                          href={`/assessment/${item.id}`}
                        >
                          شروع تست
                          <ArrowLeft size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        )}
      </Panel>

      {!hasData &&
        [individual, marriage, legacy, published].every(
          (r) => !r.loading && !r.error && r.data,
        ) && (
          <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            فعلاً تستی برای شروع در دسترس نیست.
          </p>
        )}
    </div>
  );
}

function MyAssessments({
  token,
  section,
  invitationId,
  draftId,
  incoming,
}: {
  token: string;
  section: string;
  invitationId?: string;
  draftId?: string;
  incoming: ReturnType<typeof usePatientResource<Awaited<ReturnType<typeof listMarriageRequests>>>>;
}) {
  const [requestPage, setRequestPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);
  const reuseIncoming = section === 'incoming' && requestPage === 1;
  const history = usePatientResource(
    useCallback(
      () =>
        listAssessmentHistory(
          token,
          historyPage,
          section === 'ongoing' ? 'IN_PROGRESS' : undefined,
        ),
      [token, historyPage, section],
    ),
  );
  const purchases = usePatientResource(
    useCallback(() => listAssessmentPurchases(token, purchasePage), [token, purchasePage]),
  );
  const lists = (requests: typeof incoming, showRequestState: boolean) => {
  const statuses: Record<string, string> = {
    PENDING: 'منتظر پاسخ همراه',
    ACCEPTED: 'دعوت پذیرفته شده',
    CANCELLED: 'لغوشده',
    REPLACED: 'جایگزین‌شده',
  };

  const statusTone = (status: string, isInitiator: boolean) =>
    status === 'PENDING' && !isInitiator
      ? 'bg-primary/10 text-primary'
      : status === 'PENDING'
        ? 'bg-amber-50 text-amber-800'
        : status === 'ACCEPTED'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-muted text-muted-foreground';

  const requestItems =
    requests.data?.items.filter((item) => item.id !== invitationId) ?? [];
  const historyItems =
    history.data?.items.filter((item) => item.id !== draftId) ?? [];
  const purchaseItems = purchases.data?.items ?? [];

  const groups = [
    <Panel
      key="invitations"
      label="دعوت‌ها"
      title={
        (showRequestState && (requests.loading || requests.error)) || requestItems.length > 0
          ? 'دعوت‌های دو نفره'
          : undefined
      }
    >
      {showRequestState && (
        <AssessmentResourceState {...requests} retry={() => void requests.reload()} />
      )}
      {requestItems.map((item) => (
        <Link
          className="group block min-w-0 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
          key={item.id}
          href={item.invitationPath}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-7 text-foreground sm:text-base">
              {item.service.title}
            </h3>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(item.status, item.isInitiator)}`}
            >
              {item.status === 'PENDING' && !item.isInitiator
                ? 'منتظر پاسخ شما'
                : statuses[item.status]}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
            {item.isInitiator ? 'دعوت ارسالی' : 'دعوت دریافتی'}
            {item.isInitiator && item.recipientPhoneMasked && (
              <>
                {' · همراه: '}
                <bdi dir="ltr">{item.recipientPhoneMasked}</bdi>
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs sm:text-sm">
            <time className="text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString('fa-IR', {
                timeZone: 'Asia/Tehran',
              })}
            </time>
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              مشاهده دعوت
              <ArrowLeft size={16} aria-hidden="true" />
            </span>
          </div>
        </Link>
      ))}
      {requests.data && (
        <PatientPagination
          page={requestPage}
          total={requests.data.total}
          onChange={setRequestPage}
        />
      )}
    </Panel>,

    <Panel
      key="records"
      label="پاسخ‌ها و نتایج"
      title={
        history.loading || history.error || historyItems.length > 0
          ? 'پاسخ‌ها و نتایج'
          : undefined
      }
    >
      <AssessmentResourceState {...history} retry={() => void history.reload()} />
      {historyItems.map((item) => (
        <article
          className="min-w-0 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5"
          key={item.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-7 text-foreground sm:text-base">
              {item.title}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                item.state === 'COMPLETE'
                  ? 'bg-emerald-50 text-emerald-800'
                  : item.resumeAvailable
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {item.state === 'COMPLETE'
                ? 'نتیجه آماده است'
                : item.resumeAvailable
                  ? 'نیمه‌تمام'
                  : 'قابل ادامه نیست'}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs sm:text-sm">
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer py-1 font-medium hover:text-foreground">
                جزئیات تست
              </summary>
              <p className="mt-1">
                نسخهٔ {toP(item.versionNumber)} · تلاش {toP(item.attemptNumber)}
              </p>
            </details>
            {(item.state === 'COMPLETE' || item.resumeAvailable) && (
              <Link
                className="inline-flex min-h-9 items-center gap-1 font-bold text-primary hover:underline"
                href={attemptHref(item)}
              >
                {item.state === 'COMPLETE' ? 'مشاهده نتیجه' : 'ادامه'}
                <ArrowLeft size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        </article>
      ))}
      {history.data && (
        <PatientPagination
          page={historyPage}
          total={history.data.total}
          onChange={setHistoryPage}
        />
      )}
    </Panel>,

    <Panel
      key="purchases"
      label="خریدها"
      title={
        purchases.loading || purchases.error || purchaseItems.length > 0
          ? 'خریدها و دسترسی‌ها'
          : undefined
      }
    >
      <AssessmentResourceState {...purchases} retry={() => void purchases.reload()} />
      {purchaseItems.map((item) => (
        <Link
          className="group block min-w-0 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
          key={item.id}
          href={`/assessment/purchases/${item.id}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-7 text-foreground sm:text-base">
              {item.title}
            </h3>
            {item.intent && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {billingStatusLabel(item.intent.status)}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs sm:text-sm">
            <span className="font-semibold text-foreground">
              {formatRialWithUnit(BigInt(item.amountRial))}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              پرداخت و دسترسی
              <ArrowLeft size={16} aria-hidden="true" />
            </span>
          </div>
        </Link>
      ))}
      {purchases.data && (
        <PatientPagination
          page={purchasePage}
          total={purchases.data.total}
          onChange={setPurchasePage}
        />
      )}
    </Panel>,
  ];

  if (section === 'purchases') groups.unshift(groups.splice(2, 1)[0]);
  if (section === 'ongoing') groups.unshift(groups.splice(1, 1)[0]);

  const empty = [requests, history, purchases].every(
    (r) => r.data?.total === 0 && !r.loading && !r.error,
  );

  return (
    <div className="grid min-w-0 gap-5">
      {groups}
      {empty && !invitationId && !draftId && (
        <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          هنوز تستی در سوابق شما نیست.
        </p>
      )}
      <details className="group rounded-2xl border border-border/70 bg-white px-4 py-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span>سوابق دیگرِ دو نفره</span>
          <ChevronDown
            size={17}
            aria-hidden="true"
            className="transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-border/60 py-3">
          <Link
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            href="/assessment/couples/legacy"
          >
            مشاهده سوابق دو نفره
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </div>
      </details>
    </div>
  );
  };
  if (reuseIncoming) return lists(incoming, false);
  return (
    <MarriageRequestPage
      token={token}
      section={section}
      requestPage={requestPage}
      render={(requests) => lists(requests, true)}
    />
  );
}

function MarriageRequestPage({
  token,
  section,
  requestPage,
  render,
}: {
  token: string;
  section: string;
  requestPage: number;
  render: (
    requests: ReturnType<typeof usePatientResource<Awaited<ReturnType<typeof listMarriageRequests>>>>,
  ) => ReactNode;
}) {
  const requests = usePatientResource(
    useCallback(
      () =>
        listMarriageRequests(
          token,
          requestPage,
          section === 'incoming' ? { status: 'PENDING', direction: 'RECEIVED' } : {},
        ),
      [token, requestPage, section],
    ),
  );
  return render(requests);
}
