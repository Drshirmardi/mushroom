import { PatientResourceState } from '@/components/shared/patient-resource-state';

type Shape = 'invite' | 'card' | 'row';

function Placeholder({ shape }: { shape: Shape }) {
  return (
    <div
      className={
        shape === 'row'
          ? 'pointer-events-none min-w-0 rounded-2xl border border-border/70 bg-white p-4'
          : 'pointer-events-none min-w-0 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:p-5'
      }
      aria-hidden="true"
    >
      <div className="flex items-center gap-3.5">
        <span className="skeleton size-11 shrink-0 rounded-2xl bg-border" />
        <div className="grid min-w-0 flex-1 gap-2.5">
          <span className="skeleton block h-4 w-48 max-w-full rounded-md bg-border" />
          <span className="skeleton block h-3 w-28 max-w-full rounded-md bg-border" />
        </div>
        {shape === 'row' && (
          <span className="skeleton block h-3.5 w-18 max-w-full shrink-0 rounded-md bg-border" />
        )}
      </div>
      {shape !== 'row' && (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/50 pt-3.5">
          {shape === 'invite' ? (
            <span className="skeleton block h-11 w-full rounded-xl bg-border" />
          ) : (
            <>
              <span className="skeleton block h-3.5 w-20 rounded-md bg-border" />
              <span className="skeleton block h-3.5 w-20 rounded-md bg-border" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AssessmentResourceState({
  loading,
  error,
  retry,
  shape = 'card',
}: {
  loading: boolean;
  error: string | null;
  retry: () => void;
  shape?: Shape;
}) {
  if (error) return <PatientResourceState loading={false} error={error} retry={retry} />;
  if (!loading) return null;
  return (
    <div role="status" data-assessment-skeleton={shape}>
      <span className="sr-only">در حال دریافت آزمون‌ها…</span>
      <Placeholder shape={shape} />
    </div>
  );
}

export function AssessmentPageSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-3xl min-w-0 px-4 py-5 text-foreground sm:px-6 sm:py-6"
      dir="rtl"
      role="status"
      data-assessment-skeleton="page"
    >
      <span className="sr-only">در حال دریافت آزمون‌ها…</span>
      <div aria-hidden="true" className="grid min-w-0 gap-4">
        <div className="my-3 flex items-center justify-between gap-4">
          <span className="skeleton block h-6 w-36 max-w-full rounded-lg bg-border" />
          <span className="skeleton size-11 shrink-0 rounded-2xl bg-border" />
        </div>
        <Placeholder shape="invite" />
        <Placeholder shape="row" />
        <span className="skeleton block h-12 w-full rounded-2xl bg-border" />
        <Placeholder shape="card" />
        <Placeholder shape="card" />
      </div>
    </main>
  );
}
