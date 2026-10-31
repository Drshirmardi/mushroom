"use client";
export function mizajPercentages(scores: Record<string, number>, dimensions: { id: string }[]) {
  const total = dimensions.reduce((sum, item) => sum + Math.max(0, scores[item.id] || 0), 0);
  if (!total) return [];
  const raw = dimensions.map(item => Math.max(0, scores[item.id] || 0) / total * 1000);
  const units = raw.map(Math.floor);
  const order = raw.map((value, index) => ({ index, remainder: value - units[index] })).sort((a, b) => b.remainder - a.remainder);
  const rest = 1000 - units.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < rest; i++) units[order[i].index]++;
  return units;
}

export function MizajChart({ scores, dimensions }: { scores: Record<string, number>; dimensions: { id: string; title: string }[] }) {
  const colors = ['#0d9488', '#2563eb', '#d97706', '#a855f7'];
  const units = mizajPercentages(scores, dimensions);
  if (!units.length) return <p className="text-sm leading-7 text-muted-foreground">پاسخ مؤثر کافی برای نمایش درصد گرایش‌ها ثبت نشده است.</p>;
  let offset = 0;
  return <figure className="space-y-5 rounded-3xl border border-primary/15 bg-primary/5 p-5"><figcaption className="text-sm font-bold">ترکیب گرایش‌های شما</figcaption><svg viewBox="0 0 200 200" className="mx-auto w-full max-w-64" aria-hidden="true">{units.map((value, index) => { const start = offset; offset += value / 10; return <circle key={dimensions[index].id} cx="100" cy="100" r="76" fill="none" stroke={colors[index % colors.length]} strokeWidth="25" pathLength="100" strokeDasharray={`${value / 10} ${100 - value / 10}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" />; })}<text x="100" y="96" textAnchor="middle" fill="currentColor" fontSize="16">۱۱ پاسخ اصلی</text><text x="100" y="119" textAnchor="middle" fill="currentColor" fontSize="10">سهم پاسخ‌های مؤثر</text></svg><dl className="grid grid-cols-2 gap-3">{dimensions.map((item, index) => <div key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-xs"><dt className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="break-words">{item.title}</span></dt><dd className="font-bold">{(units[index] / 10).toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}٪</dd></div>)}</dl></figure>;
}
