'use client';
import { AsyncButton } from '@/components/shared/async-button';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { LoadingState } from '@/components/shared/skeletons';
import Link from 'next/link';
import { EducationalCoupleOffers } from '@/components/assessments/educational-couples';
import { Suspense, useCallback, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { components } from '@sabz-zendegi/api-client';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { Users } from 'lucide-react';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PatientPagination } from '@/components/shared/patient-pagination';
import {
  getCoupleSession,
  createCoupleInvitation,
  withdrawCoupleLink,
  getCoupleOffering,
  createCoupleAssessment,
} from '@/lib/couples-api';
import { listAssessmentOfferings } from '@/lib/digital-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { useOperationKey } from '@/lib/use-operation-key';
import { patientErrorMessage } from '@/lib/patient-request';
import { formatRialWithUnit } from '@/lib/wallet-money';

function LinkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const [selected, setSelected] = useState(useSearchParams().get('publicationId') ?? '');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useOperationKey(`${authentication.user.id}:couple:${id}`);
  const session = usePatientResource(useCallback(() => getCoupleSession(token, id), [token, id]));
  const offerings = usePatientResource(
    useCallback(() => listAssessmentOfferings(token, page, 'COUPLES'), [token, page]),
  );
  const preview = usePatientResource(
    useCallback(
      () => (selected ? getCoupleOffering(token, selected) : Promise.resolve(null)),
      [token, selected],
    ),
  );
  const start = async () => {
    if (
      busy ||
      !preview.data?.available ||
      !preview.data.jointProtocolId ||
      !preview.data.jointProtocolHash ||
      session.data?.state !== 'LINKED'
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        coupleSessionId: id,
        publicationId: preview.data.publicationId,
        publicationHash: preview.data.publicationHash,
        jointProtocolId: preview.data.jointProtocolId,
        jointProtocolHash: preview.data.jointProtocolHash,
      };
      const assessment = await createCoupleAssessment(token, body, await key(body));
      router.push(`/assessment/couples/${assessment.id}`);
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await withdrawCoupleLink(token, id);
      setConfirmWithdraw(false);
      await session.reload();
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ServicePage
      title="مدیریت اتصال همراه"
      description="دعوت همراه و وضعیت اتصال حساب‌ها را مدیریت کنید؛ سپس ارزیابی را انتخاب کنید."
      icon={Users}
      backHref="/assessment/couples"
      backLabel="ارزیابی زوجین"
    >
      <div className="space-y-4">
        <PatientResourceState variant="detail" {...session} retry={() => void session.reload()} />
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-7 text-red-700"
          >
            {error}
          </p>
        )}
        {session.data && (
          <>
            <p className="rounded-2xl border border-border/80 bg-white p-4 text-sm font-medium text-foreground shadow-2xs">
              {session.data.state === 'LINKED'
                ? 'هر دو حساب با رضایت مستقل متصل شده‌اند.'
                : session.data.state === 'AWAITING_PARTNER'
                  ? 'در انتظار پذیرش مستقل همراه'
                  : 'رضایت این اتصال پس گرفته شده است.'}
            </p>
            {session.data.state === 'AWAITING_PARTNER' && (
              <InvitationForm
                key={`${authentication.user.id}:${id}`}
                token={token}
                sessionId={id}
              />
            )}
            {session.data.state === 'LINKED' && (
              <EducationalCoupleOffers
                token={token}
                userId={authentication.user.id}
                linkId={id}
              />
            )}
            {session.data.state === 'LINKED' && (
              <details
                open={selected ? true : undefined}
                className="rounded-3xl border border-border/80 bg-white p-4 shadow-xs"
              >
                <summary className="cursor-pointer p-1 text-sm font-bold text-foreground">
                  ارزیابی‌های قدیمی
                </summary>
                <section className="mt-3 space-y-3">
                  <h2 className="text-sm font-bold text-foreground">انتخاب ارزیابی مشترک</h2>
                  <PatientResourceState
                    variant="detail"
                    {...offerings}
                    retry={() => void offerings.reload()}
                  />
                  {offerings.data?.items
                    .filter((item) => item.kind === 'COUPLES')
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setSelected(item.id);
                          setError(null);
                        }}
                        className={`block w-full rounded-2xl border p-4 text-start text-sm font-bold transition ${
                          selected === item.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-white text-foreground hover:border-primary/40'
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  {offerings.data && (
                    <PatientPagination
                      page={page}
                      total={offerings.data.total}
                      onChange={setPage}
                    />
                  )}
                  {selected && (
                    <>
                      <PatientResourceState
                        variant="detail"
                        {...preview}
                        retry={() => void preview.reload()}
                      />
                      {preview.data && (
                        <div className="space-y-3 rounded-2xl border border-border/80 bg-background/50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-bold text-foreground">
                              {preview.data.title}
                            </h2>
                            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
                              {formatRialWithUnit(BigInt(preview.data.amountRial))}
                            </span>
                          </div>
                          <p className="text-xs leading-6 text-muted-foreground">
                            ثبت این مرحله فقط زمینهٔ ارزیابی همین دو نفر را ایجاد می‌کند. هر نفر
                            باید رضایت پردازش و اشتراک نتیجه را جداگانه ثبت کند.
                          </p>
                          {!preview.data.available && (
                            <p className="text-xs font-medium text-amber-800">
                              این ارزیابی فعلاً شرایط لازم برای مشارکت مشترک را ندارد.
                            </p>
                          )}
                          <AsyncButton
                            disabled={busy || !preview.data.available}
                            onClick={() => start()}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:opacity-40"
                          >
                            انتخاب ارزیابی و بررسی رضایت‌ها
                          </AsyncButton>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </details>
            )}
            {session.data.state !== 'CONSENT_REVOKED' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmWithdraw(true)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                پس‌گرفتن رضایت اتصال
              </button>
            )}
            <Link
              href="/assessment/couples"
              className="inline-flex text-sm font-bold text-primary hover:underline"
            >
              همهٔ ارزیابی‌ها و اتصال‌های من ←
            </Link>
          </>
        )}
      </div>
      {confirmWithdraw && (
        <BottomSheet
          title="پس‌گرفتن رضایت اتصال"
          onClose={() => {
            if (!busy) setConfirmWithdraw(false);
          }}
        >
          <div className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              رضایت اتصال به همراه پس گرفته شود؟ این کار دسترسی مشترک را متوقف می‌کند و سوابق یا
              پرداخت‌ها را حذف نمی‌کند.
            </p>
            <AsyncButton
              type="button"
              disabled={busy}
              onClick={() => withdraw()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              تأیید و پس‌گرفتن رضایت اتصال
            </AsyncButton>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmWithdraw(false)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground"
            >
              انصراف
            </button>
          </div>
        </BottomSheet>
      )}
    </ServicePage>
  );
}

function InvitationForm({ token, sessionId }: { token: string; sessionId: string }) {
  const [patientId, setPatientId] = useState('');
  const [phone, setPhone] = useState('');
  const [invitation, setInvitation] = useState<
    components['schemas']['CoupleInvitationResponseDto'] | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [confirmInvite, setConfirmInvite] = useState<'create' | 'replace' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const command = useRef<{ fingerprint: string; key: string } | null>(null);
  const runInvite = async (replacePrior: boolean) => {
    if (busy || !patientId.trim() || !phone.trim()) return;
    if (replacePrior) {
      command.current = null;
      setInvitation(null);
    }
    setBusy(true);
    setError(null);
    try {
      const body = { recipientPatientId: patientId.trim(), recipientPhone: phone.trim() };
      const fingerprint = JSON.stringify(body);
      if (!command.current || command.current.fingerprint !== fingerprint)
        command.current = { fingerprint, key: crypto.randomUUID() };
      const result = await createCoupleInvitation(token, sessionId, body, command.current.key);
      setInvitation((prior) =>
        result.invitationToken
          ? result
          : prior?.invitationId === result.invitationId
            ? prior
            : result,
      );
      setConfirmInvite(null);
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3.5 rounded-3xl border border-border/80 bg-white p-5 shadow-xs">
      <h2 className="text-base font-bold text-foreground">دعوت همراه ثبت‌نام‌شده</h2>
      <label className="block text-xs font-bold text-foreground">
        شناسهٔ بیمار همراه
        <input
          value={patientId}
          disabled={busy}
          onChange={(event) => setPatientId(event.target.value)}
          dir="ltr"
          className="mt-1.5 w-full rounded-2xl border border-border bg-white p-3 text-xs text-foreground outline-none focus:border-primary"
        />
      </label>
      <label className="block text-xs font-bold text-foreground">
        شمارهٔ همراه ثبت‌شده
        <input
          type="tel"
          value={phone}
          disabled={busy}
          onChange={(event) => setPhone(event.target.value)}
          dir="ltr"
          className="mt-1.5 w-full rounded-2xl border border-border bg-white p-3 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <p className="text-xs leading-6 text-muted-foreground">
        شناسه و شماره را خود همراه باید در اختیارتان بگذارد. کد دعوت فقط هنگام ایجاد اولیه نمایش
        داده می‌شود؛ آن را مستقیماً به فرد موردنظر برسانید.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-700"
        >
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy || !patientId.trim() || !phone.trim()}
        onClick={() => setConfirmInvite('create')}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:opacity-40"
      >
        ایجاد یا بازیابی وضعیت دعوت
      </button>
      {invitation && (
        <div role="status" className="space-y-3 rounded-2xl border border-border/70 bg-muted/40 p-4">
          {invitation.invitationToken ? (
            <>
              <label className="block text-xs font-bold text-foreground">
                کد محرمانهٔ دعوت
                <input
                  readOnly
                  value={invitation.invitationToken}
                  dir="ltr"
                  className="mt-1.5 w-full rounded-xl border border-border bg-white p-3 text-xs"
                />
              </label>
              <p className="text-xs leading-6 text-muted-foreground">
                همراه با حساب خودش در بخش زوجین، این کد را وارد و شرایط را بررسی کند. این کد در
                نشانی صفحه یا حافظهٔ دائمی ذخیره نمی‌شود.
              </p>
            </>
          ) : (
            <p className="text-sm leading-7 text-muted-foreground">
              دعوت قبلاً ثبت شده است و کد آن دوباره قابل دریافت نیست. اگر کد را ندارید، می‌توانید
              آگاهانه دعوت جایگزین ایجاد کنید.
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmInvite('replace')}
            className="text-xs font-bold text-primary hover:underline"
          >
            ایجاد دعوت جایگزین
          </button>
        </div>
      )}
      {confirmInvite && (
        <BottomSheet
          title={confirmInvite === 'replace' ? 'ایجاد دعوت جایگزین' : 'تأیید ایجاد دعوت'}
          onClose={() => {
            if (!busy) setConfirmInvite(null);
          }}
        >
          <div className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              {confirmInvite === 'replace'
                ? 'دعوت قبلی کنار گذاشته و دعوت تازه‌ای ساخته شود؟'
                : 'دعوت برای همین شناسه و شمارهٔ همراه ایجاد شود؟ دعوت قبلیِ در انتظار، در صورت وجود، جایگزین می‌شود.'}
            </p>
            <AsyncButton
              type="button"
              disabled={busy}
              onClick={() => runInvite(confirmInvite === 'replace')}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:opacity-50"
            >
              تأیید و ساخت دعوت
            </AsyncButton>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmInvite(null)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground"
            >
              انصراف
            </button>
          </div>
        </BottomSheet>
      )}
    </section>
  );
}
export default function CoupleLinkPage() {
  return (
    <Suspense fallback={<LoadingState variant="detail" className="p-4" />}>
      <LinkPage />
    </Suspense>
  );
}
