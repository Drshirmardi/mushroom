'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from 'lucide-react';

import type { components } from '@sabz-zendegi/api-client';

import { useAuthSession } from '@/components/auth/session-gate';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { PolicyAcceptance, GuidanceSafety } from '@/components/shared/policy-acceptance';
import { Button } from '@/components/ui/button';

import {
  getProgramOffering,
  acceptProgramConsent,
  createProgramPurchase,
} from '@/lib/digital-services-api';

import { usePatientResource } from '@/lib/use-patient-resource';
import { finishOperation, useOperationKey } from '@/lib/use-operation-key';
import { patientErrorMessage } from '@/lib/patient-request';
import { formatRialWithUnit } from '@/lib/wallet-money';
import { toP } from '@/lib/format';

type ProgramOffering = components['schemas']['PatientProgramOfferingDto'];

export default function ProgramOfferingPage() {
  const { id } = useParams<{ id: string }>();
  const { authentication } = useAuthSession();

  const resource = usePatientResource(
    useCallback(
      () => getProgramOffering(authentication.accessToken, id),
      [authentication.accessToken, id],
    ),
  );

  return (
    <main dir="rtl" className="flex min-h-full w-full flex-col bg-[#f8fafc] text-foreground">
      {/* Navigation */}
      <nav
        aria-label="مسیر صفحه"
        className="mx-auto flex w-full max-w-[720px] items-center justify-between px-5 pb-2 pt-5"
      >
        <Link
          href="/programs"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowRight size={19} aria-hidden="true" />
          <span>برنامه‌های سلامت</span>
        </Link>

        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-border/50"
        >
          <BookOpen size={19} strokeWidth={1.8} />
        </span>
      </nav>

      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col">
        <div className="px-5 pt-5">
          <PatientResourceState
            variant="detail"
            {...resource}
            retry={() => void resource.reload()}
          />
        </div>

        {resource.data && (
          <Purchase
            key={`${authentication.user.id}:${resource.data.publicationHash}`}
            program={resource.data}
            token={authentication.accessToken}
            userId={authentication.user.id}
          />
        )}
      </div>
    </main>
  );
}

function Purchase({
  program,
  token,
  userId,
}: {
  program: ProgramOffering;
  token: string;
  userId: string;
}) {
  const router = useRouter();

  // Existing valid consent is already accepted.
  const [accepted, setAccepted] = useState(() => Boolean(program.termsConsent));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epoch] = useState(() => crypto.randomUUID());

  const key = useOperationKey(`${userId}:program:${program.id}`);

  const hasDiscount = program.discountPercent > 0;

  const price = formatRialWithUnit(BigInt(program.amountRial));

  const originalPrice = hasDiscount ? formatRialWithUnit(BigInt(program.baseAmountRial)) : null;

  const accessLabel =
    program.accessMode === 'PERPETUAL'
      ? 'بدون محدودیت زمانی'
      : program.accessDurationDays != null
        ? `${toP(program.accessDurationDays)} روز از فعال‌سازی`
        : 'مطابق شرایط برنامه';

  const buy = async () => {
    if (busy || !accepted) return;

    setBusy(true);
    setError(null);

    try {
      const consentBody = {
        policyVersionId: program.terms.id,
        contentHash: program.terms.contentHash,
        accepted: true as const,
      };

      const consent =
        program.termsConsent ??
        (await acceptProgramConsent(
          token,
          consentBody,
          await key({
            action: 'consent',
            ...consentBody,
            epoch,
          }),
        ));

      const body = {
        publicationId: program.id,
        publicationHash: program.publicationHash,
        termsConsentRecordId: consent.id,
      };

      const intent = await createProgramPurchase(
        token,
        body,
        await key({
          action: 'purchase',
          ...body,
        }),
      );

      await finishOperation(`${userId}:program:${program.id}`, {
        action: 'purchase',
        ...body,
      });

      router.push(`/profile/wallet/pay?intentId=${intent.id}`);
    } catch (reason) {
      setError(patientErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-7 px-5 pb-8 pt-2">
        {/* Program introduction */}
        <header className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <BookOpen size={14} aria-hidden="true" />
            برنامه آموزشی
          </span>

          <div className="space-y-3">
            <h1 className="text-[clamp(1.5rem,5.5vw,2rem)] font-extrabold leading-[1.65] tracking-tight text-foreground">
              {program.title}
            </h1>

            {program.summary && (
              <p className="whitespace-pre-line text-sm leading-8 text-muted-foreground">
                {program.summary}
              </p>
            )}
          </div>
        </header>

        {/* Main information */}
        <section aria-label="مشخصات برنامه" className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border/60 bg-white p-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays size={18} aria-hidden="true" />
            </div>

            <span className="text-xs text-muted-foreground">مدت دسترسی</span>

            <strong className="text-sm font-semibold leading-6 text-foreground">
              {accessLabel}
            </strong>
          </div>

          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border/60 bg-white p-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText size={18} aria-hidden="true" />
            </div>

            <span className="text-xs text-muted-foreground">نوع برنامه</span>

            <strong className="text-sm font-semibold leading-6 text-foreground">
              محتوای آموزشی
            </strong>
          </div>
        </section>

        {/* Price */}
        <section
          aria-label="قیمت برنامه"
          className="rounded-[24px] border border-border/70 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">هزینه دریافت برنامه</h2>

            {hasDiscount && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {toP(program.discountPercent)}٪ تخفیف
              </span>
            )}
          </div>

          {originalPrice && (
            <p className="mt-4 text-sm text-muted-foreground">
              <del>{originalPrice}</del>
            </p>
          )}

          <p className="mt-2 break-words text-[clamp(1.4rem,5vw,1.8rem)] font-extrabold leading-relaxed text-primary">
            {price}
          </p>

          <div className="mt-4 flex items-start gap-2 border-t border-border/70 pt-4">
            <ShieldCheck
              size={17}
              className="mt-1 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />

            <p className="text-xs leading-6 text-muted-foreground">
              این محصول آموزشی است؛ بازپرداخت عادی برای آن ارائه نمی‌شود.
            </p>
          </div>
        </section>

        {/* Eligibility */}
        {program.eligibilityDescription && (
          <section aria-labelledby="program-eligibility-title" className="space-y-3">
            <h2 id="program-eligibility-title" className="text-base font-bold text-foreground">
              این برنامه برای چه کسانی مناسب است؟
            </h2>

            <p className="whitespace-pre-line text-sm leading-8 text-muted-foreground">
              {program.eligibilityDescription}
            </p>
          </section>
        )}

        {/* Safety information - always visible */}
        <GuidanceSafety safety={program.safety} variant="program" />

        {/* Policy and acceptance */}
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">شرایط دریافت و استفاده</h2>

            <p className="text-xs leading-6 text-muted-foreground">
              پیش از ادامه، شرایط این نسخه از برنامه را بررسی کنید.
            </p>
          </div>

          <PolicyAcceptance
            policy={program.terms}
            accepted={accepted}
            onChange={setAccepted}
            disabled={busy}
            variant="compact"
            label="شرایط دریافت و استفاده از این برنامه را می‌پذیرم."
          />
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700"
          >
            {error}
          </div>
        )}

        {accepted && !busy && (
          <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 size={16} className="shrink-0 text-primary" aria-hidden="true" />
            شرایط دریافت برنامه پذیرفته شده است.
          </p>
        )}
      </div>

      {/* Sticky purchase bar */}
      <footer className="sticky bottom-0 z-20 mt-auto border-t border-border/70 bg-white/95 px-5 py-3 shadow-[0_-8px_30px_-20px_rgba(15,23,42,0.2)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">مبلغ قابل پرداخت</p>

            <p className="mt-0.5 break-words text-sm font-bold leading-6 text-foreground">
              {price}
            </p>
          </div>

          <Button
            type="button"
            busy={busy}
            disabled={!accepted || busy}
            onClick={() => void buy()}
            className="min-h-12 shrink-0 !rounded-2xl px-5"
          >
            {busy ? (
              'در حال ثبت…'
            ) : (
              <>
                ادامه به پرداخت
                <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
              </>
            )}
          </Button>
        </div>

        {!accepted && (
          <p className="mt-2 text-center text-[11px] leading-5 text-muted-foreground">
            برای ادامه، شرایط استفاده از برنامه را بپذیرید.
          </p>
        )}
      </footer>
    </div>
  );
}
