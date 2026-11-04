import type { ReactNode } from "react";

export type SkeletonVariant = "list" | "grid" | "card" | "detail" | "product" | "form" | "settings" | "payment" | "chat" | "profile" | "rows";

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton block rounded-xl bg-(--patient-soft) ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <SkeletonBox className="h-12 w-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonBox className="h-3 w-full" />
      <SkeletonBox className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden" aria-hidden="true">
      <SkeletonBox className="aspect-square w-full rounded-none" />
      <div className="p-3 space-y-2">
        <SkeletonBox className="h-3 w-4/5" />
        <SkeletonBox className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonProfileHeader() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <SkeletonBox className="h-[72px] w-[72px] rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-4 w-2/3" />
        <SkeletonBox className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function SkeletonRows({ settings = false }: { settings?: boolean }) {
  return <div className="divide-y divide-border rounded-2xl border border-border bg-white" aria-hidden="true">{[0, 1, 2].map(i => <div className="flex items-center gap-3 p-4" key={i}><div className="min-w-0 flex-1 space-y-3"><SkeletonBox className="h-4 w-2/3" /><SkeletonBox className="h-3 w-4/5" /></div><SkeletonBox className={settings ? "h-6 w-12 rounded-full" : "h-10 w-10"} /></div>)}</div>;
}

function SkeletonForm() {
  return <div className="space-y-5 rounded-2xl border border-border bg-white p-4" aria-hidden="true">{[0, 1, 2].map(i => <div className="space-y-2" key={i}><SkeletonBox className="h-3 w-1/3" /><SkeletonBox className="h-12 w-full" /></div>)}<SkeletonBox className="h-12 w-full" /></div>;
}

function SkeletonDetail({ product = false }: { product?: boolean }) {
  return <div className="space-y-4" aria-hidden="true">{product && <SkeletonBox className="aspect-square w-full rounded-2xl" />}<div className="space-y-4 rounded-2xl border border-border bg-white p-5"><SkeletonBox className="h-6 w-2/3" /><SkeletonBox className="h-4 w-full" /><SkeletonBox className="h-4 w-4/5" /><SkeletonBox className="h-4 w-full" /><SkeletonBox className="h-12 w-full" /></div></div>;
}

function SkeletonPayment() {
  return <div className="space-y-4" aria-hidden="true"><div className="space-y-4 rounded-2xl border border-border bg-white p-5"><SkeletonBox className="mx-auto h-12 w-12" /><SkeletonBox className="mx-auto h-5 w-2/3" /><SkeletonBox className="mx-auto h-8 w-1/2" /></div><SkeletonRows /><SkeletonBox className="h-12 w-full" /></div>;
}

function SkeletonChat() {
  return <div className="space-y-5 p-4" aria-hidden="true">{[0, 1, 2, 3].map(i => <div className={`w-3/4 space-y-3 rounded-2xl bg-white p-4 ${i % 2 ? "ms-auto" : "me-auto"}`} key={i}><SkeletonBox className="h-3 w-full" /><SkeletonBox className="h-3 w-2/3" /></div>)}</div>;
}

export function LoadingState({ label = "در حال دریافت اطلاعات…", variant = "list", children, className = "" }: { label?: string; variant?: SkeletonVariant; children?: ReactNode; className?: string }) {
  const content = children ?? (variant === "grid" ? <SkeletonGrid /> : variant === "card" ? <SkeletonCard /> : variant === "detail" || variant === "product" ? <SkeletonDetail product={variant === "product"} /> : variant === "form" ? <SkeletonForm /> : variant === "settings" || variant === "rows" ? <SkeletonRows settings={variant === "settings"} /> : variant === "payment" ? <SkeletonPayment /> : variant === "chat" ? <SkeletonChat /> : variant === "profile" ? <SkeletonProfileHeader /> : <SkeletonList />);
  return <div role="status" aria-live="polite" aria-busy="true" className={`loading-state ${className}`} data-loading-skeleton={variant}><span className="sr-only">{label}</span><div aria-hidden="true">{content}</div></div>;
}
