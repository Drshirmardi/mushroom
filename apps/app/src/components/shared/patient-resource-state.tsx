export function PatientResourceState({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  if (error) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={retry} className="mt-2 inline-flex min-h-11 items-center font-bold underline">دریافت دوباره</button></div>;
  if (loading) return <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت اطلاعات…</p>;
  return null;
}
