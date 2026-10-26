import { toP } from "@/lib/format";
export function PatientPagination({ page, total, onChange, pageSize = 20 }: { page: number; total: number; onChange: (page: number) => void; pageSize?: number }) {
  if (total <= pageSize && page === 1) return null;
  return <nav aria-label="صفحه‌بندی" className="flex items-center justify-between gap-3 text-sm"><button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-xl border border-border px-3 py-2 disabled:opacity-40">قبلی</button><span>صفحه {toP(page)}</span><button disabled={page * pageSize >= total} onClick={() => onChange(page + 1)} className="rounded-xl border border-border px-3 py-2 disabled:opacity-40">بعدی</button></nav>;
}
