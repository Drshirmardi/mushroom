'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthSession } from '@/components/auth/session-gate';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';
import { PageHeader } from '@/components/shared/page-header';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { StoreIcon } from '@/components/store/store-icon';
import { loginUrl } from '@/lib/api';
import { patientErrorMessage } from '@/lib/patient-request';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listAuthSessions, revokeAuthSession } from '@/lib/security-api';

const date = (value: string) =>
  new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

export default function SecurityPage() {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const [page, setPage] = useState(1);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resource = usePatientResource(
    useCallback(() => listAuthSessions(token, page), [token, page]),
  );
  const busy = busyAction !== null;
  const currentSession = resource.data?.items.find((item) => item.current);
  const otherSessions = resource.data?.items.filter((item) => !item.current) ?? [];

  const revoke = async (id: string, current: boolean) => {
    if (busy || !window.confirm(current ? 'از نشست فعلی خارج شوید؟' : 'دسترسی این نشست قطع شود؟')) {
      return;
    }
    setBusyAction(id);
    setError(null);
    try {
      await revokeAuthSession(token, id);
      if (current) {
        window.location.replace(loginUrl);
        return;
      }
      await resource.reload();
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusyAction(null);
    }
  };

  const revokeOtherSessions = async () => {
    if (!resource.data || busy || resource.data.total <= Number(currentSession !== undefined))
      return;
    if (!window.confirm('دسترسی همهٔ نشست‌های دیگر قطع شود؟ نشست فعلی باز می‌ماند.')) return;

    setBusyAction('others');
    setError(null);
    try {
      const pages = Math.ceil(resource.data.total / resource.data.limit);
      const sessionPages = await Promise.all(
        Array.from({ length: pages }, async (_, index) => {
          const sessionPage = index + 1;
          return sessionPage === page
            ? resource.data!.items
            : (await listAuthSessions(token, sessionPage)).items;
        }),
      );
      const otherSessionIds = [
        ...new Set(
          sessionPages.flatMap((items) =>
            items.filter((session) => !session.current).map((session) => session.id),
          ),
        ),
      ];
      for (const id of otherSessionIds) await revokeAuthSession(token, id);
      await resource.reload();
    } catch (reason) {
      setError(patientErrorMessage(reason));
      await resource.reload();
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-[#f2f3f6]">
      <PageHeader title="امنیت و نشست‌های فعال" onBack={() => router.back()} />
      <div className="flex-1 space-y-6 bg-[#f2f3f6] px-4 py-5 pb-8">
        <PatientResourceState
          variant="settings"
          {...resource}
          retry={() => void resource.reload()}
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {currentSession && (
          <section aria-labelledby="current-session-heading" className="space-y-2">
            <h2
              id="current-session-heading"
              className="mr-4 text-xs font-semibold text-muted-foreground"
            >
              دستگاه فعلی
            </h2>
            <SessionCard
              title="نشست وب فعلی"
              lastUsedAt={currentSession.lastUsedAt}
              createdAt={currentSession.createdAt}
              expiresAt={currentSession.expiresAt}
              busy={busy}
              busyAction={busyAction === 'others'}
              disabled={
                !resource.data || resource.data.total <= Number(currentSession !== undefined)
              }
              actionLabel="غیرفعال کردن باقی دستگاه‌ها"
              onAction={() => void revokeOtherSessions()}
            />
            <p className="px-3 text-xs leading-5 text-muted-foreground">
              از همه دستگاه ها غیر دستگاه فعلی، خارج شوید.
            </p>
          </section>
        )}

        <section aria-labelledby="other-sessions-heading" className="mt-8 space-y-2">
          <h2
            id="other-sessions-heading"
            className="mr-4 text-xs font-semibold text-muted-foreground"
          >
            سایر دستگاه‌ها
          </h2>
          {otherSessions.map((session) => (
            <SessionCard
              key={session.id}
              title="نشست دیگر"
              lastUsedAt={session.lastUsedAt}
              createdAt={session.createdAt}
              expiresAt={session.expiresAt}
              busy={busy}
              actionInHeader
              actionLabel="قطع دسترسی این نشست"
              onAction={() => void revoke(session.id, false)}
            />
          ))}
          {resource.data?.total === 0 && (
            <p className="rounded-2xl border border-[#f2f3f6] bg-white p-4 text-sm text-muted-foreground">
              نشست فعالی ثبت نشده است.
            </p>
          )}
        </section>

        {resource.data && (
          <PatientPagination
            page={page}
            total={resource.data.total}
            pageSize={resource.data.limit}
            onChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

function SessionCard({
  title,
  lastUsedAt,
  createdAt,
  expiresAt,
  busy,
  busyAction = false,
  disabled = false,
  actionInHeader = false,
  actionLabel,
  onAction,
}: {
  title: string;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
  busy: boolean;
  busyAction?: boolean;
  disabled?: boolean;
  actionInHeader?: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article dir="rtl" className="rounded-2xl border-[0.5px] border-[#f2f3f6] bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="flex size-10 shrink-0 items-center justify-center self-start rounded-xl bg-[#deedff] p-2 text-primary">
            <StoreIcon name="tv" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-xs font-semibold leading-5 text-foreground">{title}</h3>
            {!actionInHeader && (
              <p className="text-xs leading-5 text-muted-foreground">
                آخرین استفاده: {date(lastUsedAt)}
              </p>
            )}
            <p className="text-xs leading-5 text-muted-foreground">شروع: {date(createdAt)}</p>
            <p className="text-xs leading-5 text-muted-foreground">نشست فعال تا: {date(expiresAt)}</p>
          </div>
        </div>
        {actionInHeader && (
          <button
            type="button"
            disabled={busy || disabled}
            onClick={onAction}
            aria-label={actionLabel}
            aria-busy={busyAction}
            className="flex size-10 shrink-0 items-center justify-center self-start p-2 text-[#f9441f] transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9441f] disabled:opacity-50"
          >
            {busyAction ? <HeartbeatLoader /> : <StoreIcon name="minusCircle" size={24} />}
          </button>
        )}
      </div>
      <div
        className={`mt-2 flex ${actionInHeader ? 'justify-start' : 'justify-end'} border-t-[0.5px] border-[#f2f3f6] pt-2`}
      >
        {actionInHeader ? (
          <p className="text-xs leading-5 text-muted-foreground">
            آخرین استفاده: {date(lastUsedAt)}
          </p>
        ) : (
          <button
            type="button"
            disabled={busy || disabled}
            onClick={onAction}
            aria-busy={busyAction}
            className="inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-sm font-medium text-[#f9441f] transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9441f] disabled:opacity-50"
          >
            {busyAction ? <HeartbeatLoader /> : <StoreIcon name="minusCircle" size={20} />}
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  );
}
