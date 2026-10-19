"use client";

import { useEffect, useRef, useState } from "react";
import { getMezajCollections, getMezajVersions, searchMezajProducts, saveMezajCollection, MezajConfigError, type MezajCollection, type MezajVersionPage, type MezajProductPage } from "../../lib/commerce-mezaj-api";

const names = { damavi: "دموی", safravi: "صفراوی", balgami: "بلغمی", sodavi: "سوداوی" };
const codes = Object.keys(names) as (keyof typeof names)[];
const field = "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";
const button = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50";
const message = (e: unknown) => e instanceof MezajConfigError && e.status === 409 ? "اطلاعات تغییر کرده یا این نتیجه به ترکیب دیگری وصل است؛ فهرست را بازخوانی و ارتباط‌ها را بررسی کنید." : e instanceof MezajConfigError && [400, 422].includes(e.status) ? "محصول، نتیجه یا اطلاعات انتخابی معتبر نیست؛ محصولات باید فعال باشند و هر نتیجه فقط به یک ترکیب وصل شود." : "دریافت یا ذخیرهٔ اطلاعات انجام نشد؛ دوباره تلاش کنید.";
const pairKey = (r: Pick<MezajCollection, "primary" | "secondary">) => `${r.primary}:${r.secondary}`;

export default function MezajCollectionsEditor({ accessToken, onBusy }: { accessToken: string; onBusy: (value: boolean) => void }) {
  const token = useRef(accessToken);
  useEffect(() => { token.current = accessToken; }, [accessToken]);
  const [rows, setRows] = useState<MezajCollection[] | null>(null);
  const [selected, setSelected] = useState("damavi:damavi");
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(false);
  useEffect(() => { let cancelled = false; void getMezajCollections(token.current).then(r => { if (!cancelled) setRows(r); }).catch(e => { if (!cancelled) setError(message(e)); }); return () => { cancelled = true; }; }, [retry]);
  const reload = () => { setDirty(false); setError(null); setRows(null); setRetry(v => v + 1); };
  const row = rows?.find(r => pairKey(r) === selected);
  return <section className="space-y-5" aria-label="پیشنهاد محصولات برای ۱۶ ترکیب مزاج">
    <div><h2 className="text-xl font-semibold">محصولات مرتبط با مزاج</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">مزاج اول و دوم مستقل‌اند؛ دموی ـ صفراوی با صفراوی ـ دموی یکی نیست. هر خانه، محصولات و نتیجه‌های آزمون مخصوص خود را دارد. تعیین این ارتباط‌ها باید بر پایهٔ نظر متخصص باشد؛ نام نتیجه به‌صورت خودکار تفسیر نمی‌شود.</p></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm">{error}<button className={button} onClick={reload}>بازخوانی</button></div>}
    {!rows && !error && <p role="status">در حال دریافت ترکیب‌ها…</p>}
    {rows && <><p className="text-xs leading-6 text-muted-foreground sm:hidden">برای دیدن همهٔ ترکیب‌ها، جدول را به طرفین بکشید.</p><div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" tabIndex={0} role="region" aria-label="جدول ۱۶ ترکیب مزاج"><table className="w-full min-w-[540px] border-separate border-spacing-2 text-center text-sm"><caption className="mb-3 text-right text-muted-foreground">ردیف: مزاج اول · ستون: مزاج دوم</caption><thead><tr><th scope="col">اول / دوم</th>{codes.map(c => <th key={c} scope="col">{names[c]}</th>)}</tr></thead><tbody>{codes.map(primary => <tr key={primary}><th scope="row">{names[primary]}</th>{codes.map(secondary => { const r = rows.find(item => item.primary === primary && item.secondary === secondary); const key = `${primary}:${secondary}`; return <td key={secondary}><button type="button" disabled={dirty || saving} aria-label={`مزاج اول ${names[primary]}، مزاج دوم ${names[secondary]}`} aria-pressed={selected === key} onClick={() => setSelected(key)} className={`${button} w-full ${selected === key ? "bg-primary text-primary-foreground" : "bg-card"}`}><span className="block">{new Intl.NumberFormat("fa-IR").format(r?.products.length ?? 0)} محصول</span><span className="text-xs">{r?.enabled ? "فعال" : "غیرفعال"}</span></button></td>; })}</tr>)}</tbody></table></div></>}
    {dirty && <p role="status" className="text-sm text-muted-foreground">برای رفتن به ترکیب دیگر، تغییرها را ذخیره یا لغو کنید.</p>}
    {notice && <p role="status" className="text-sm text-emerald-800">تنظیمات این ترکیب ذخیره شد.</p>}
    {row && <CollectionForm key={`${selected}:${row.revision}:${retry}`} row={row} token={accessToken} onDirty={value => { setDirty(value); if (value) setNotice(false); }} onBusy={value => { setSaving(value); onBusy(value); }} onSaved={next => { setRows(current => current?.map(r => pairKey(r) === pairKey(next) ? next : r) ?? []); setDirty(false); setNotice(true); }} onReload={reload} />}
  </section>;
}

function CollectionForm({ row, token, onDirty, onBusy, onSaved, onReload }: { row: MezajCollection; token: string; onDirty: (v: boolean) => void; onBusy: (v: boolean) => void; onSaved: (r: MezajCollection) => void; onReload: () => void }) {
  const [products, setProducts] = useState(row.products);
  const [sources, setSources] = useState(row.sources);
  const [enabled, setEnabled] = useState(row.enabled);
  const [query, setQuery] = useState(""); const [productPage, setProductPage] = useState(1); const [productResponse, setProductResponse] = useState<{ query: string; page: number; data: MezajProductPage } | null>(null);
  const result = productResponse?.query === query.trim() && productResponse.page === productPage ? productResponse.data : null;
  const [versionResponse, setVersionResponse] = useState<MezajVersionPage | null>(null); const [versionPage, setVersionPage] = useState(1); const [versionId, setVersionId] = useState(""); const [bandId, setBandId] = useState("");
  const versions = versionResponse?.page === versionPage ? versionResponse : null;
  const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [conflicted, setConflicted] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { let cancelled = false; const timer = setTimeout(() => { void searchMezajProducts(token, query.trim(), productPage).then(r => { if (!cancelled) setProductResponse({ query: query.trim(), page: productPage, data: r }); }).catch(e => { if (!cancelled) setError(message(e)); }); }, 250); return () => { cancelled = true; clearTimeout(timer); }; }, [token, query, productPage, retry]);
  useEffect(() => { let cancelled = false; void getMezajVersions(token, versionPage).then(r => { if (!cancelled) setVersionResponse(r); }).catch(e => { if (!cancelled) setError(message(e)); }); return () => { cancelled = true; }; }, [token, versionPage, retry]);
  const change = () => { onDirty(true); };
  const version = versions?.items.find(v => v.id === versionId);
  const save = async () => {
    if (saving) return; setSaving(true); onBusy(true); setError(null);
    try { const next = await saveMezajCollection(token, row, { expectedRevision: row.revision, enabled, productIds: products.map(p => p.id), sources: sources.map(s => ({ assessmentVersionId: s.assessmentVersionId, resultBandId: s.resultBandId })) }); onSaved(next); }
    catch (e) { setConflicted(e instanceof MezajConfigError && e.status === 409); setError(message(e)); } finally { setSaving(false); onBusy(false); }
  };
  return <form className="space-y-5 rounded-2xl border border-border bg-card p-5" onSubmit={e => { e.preventDefault(); void save(); }}>
    <h3 className="font-semibold">مزاج اول {names[row.primary]}، مزاج دوم {names[row.secondary]}</h3>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}<button type="button" className={button} onClick={conflicted ? onReload : () => { setError(null); setRetry(v => v + 1); }}>{conflicted ? "بازخوانی تنظیمات این ترکیب" : "تلاش دوبارهٔ دریافت"}</button></p>}
    <fieldset disabled={saving} className="space-y-5 border-0 p-0">
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e => { setEnabled(e.target.checked); change(); }} />نمایش این پیشنهادها در فروشگاه</label>
      <section aria-label="اتصال نتیجهٔ آزمون" className="space-y-3"><h4 className="font-medium">۱. نتیجهٔ آزمون مرتبط</h4><p className="text-xs leading-6 text-muted-foreground">نسخه و نتیجهٔ دقیق را انتخاب کنید. نتیجهٔ یک نسخه فقط می‌تواند به یک ترکیب تعلق داشته باشد؛ برای نسخهٔ جدید آزمون، ارتباط تازه لازم است.</p>
        <label className="block text-sm">نسخهٔ آزمون<select className={field} value={versionId} onChange={e => { setVersionId(e.target.value); setBandId(""); }}><option value="">انتخاب نسخه</option>{versions?.items.map(v => <option key={v.id} value={v.id}>{v.title} · نسخهٔ {new Intl.NumberFormat("fa-IR").format(v.versionNumber)} · {v.locale}</option>)}</select></label>
        {versions && versions.total > 20 && <div className="flex gap-2"><button type="button" className={button} disabled={versionPage === 1} onClick={() => { setVersionId(""); setVersionPage(v => v - 1); }}>نسخه‌های قبلی</button><button type="button" className={button} disabled={versionPage * 20 >= versions.total} onClick={() => { setVersionId(""); setVersionPage(v => v + 1); }}>نسخه‌های بعدی</button></div>}
        {versions?.total === 0 && <p className="text-sm text-muted-foreground">هنوز نسخهٔ منتشرشده‌ای از آزمون مزاج وجود ندارد.</p>}
        <label className="block text-sm">نتیجه<select className={field} value={bandId} disabled={!version} onChange={e => setBandId(e.target.value)}><option value="">انتخاب نتیجه</option>{version?.resultBands.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
        <button type="button" className={button} disabled={!version || !bandId || sources.length >= 50 || sources.some(s => s.assessmentVersionId === versionId && s.resultBandId === bandId)} onClick={() => { if (!version) return; setSources(current => [...current, { assessmentVersionId: versionId, resultBandId: bandId, versionTitle: version.title, versionNumber: version.versionNumber, bandTitle: version.resultBands.find(b => b.id === bandId)?.title ?? bandId }]); change(); }}>افزودن ارتباط نتیجه</button>
        <ul className="space-y-2">{sources.map(s => <li key={`${s.assessmentVersionId}:${s.resultBandId}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm"><span>{s.bandTitle} · {s.versionTitle} · نسخهٔ {new Intl.NumberFormat("fa-IR").format(s.versionNumber)}</span><button type="button" className={button} aria-label={`حذف ارتباط ${s.bandTitle}`} onClick={() => { setSources(current => current.filter(x => x !== s)); change(); }}>حذف ارتباط</button></li>)}</ul>
      </section>
      <section className="space-y-3" aria-label="انتخاب محصولات"><h4 className="font-medium">۲. محصولات این ترکیب</h4><label className="block text-sm">جست‌وجوی محصول فعال<input className={field} maxLength={120} value={query} onChange={e => { setQuery(e.target.value); setProductPage(1); }} /></label>
        {!result && !error && <p role="status" className="text-sm">در حال دریافت محصولات…</p>}
        {result?.items.length === 0 && <p className="text-sm">محصول فعالی پیدا نشد.</p>}
        <div className="grid gap-2 md:grid-cols-2">{result?.items.map(p => <button type="button" key={p.id} className={`${button} text-right`} disabled={products.some(x => x.id === p.id) || products.length >= 20 || !p.skus.some(s => s.isActive)} onClick={() => { setProducts(current => [...current, { id: p.id, title: p.title }]); change(); }}>افزودن {p.title}</button>)}</div>
        {result && result.total > 20 && <div className="flex gap-2"><button type="button" className={button} disabled={productPage === 1} onClick={() => setProductPage(v => v - 1)}>محصولات قبلی</button><button type="button" className={button} disabled={productPage * 20 >= result.total} onClick={() => setProductPage(v => v + 1)}>محصولات بعدی</button></div>}
        <p className="text-xs text-muted-foreground">حداکثر ۲۰ محصول؛ ترتیب این فهرست در فروشگاه حفظ می‌شود.</p>
        <ol className="space-y-2">{products.map((p, i) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm"><span>{new Intl.NumberFormat("fa-IR").format(i + 1)}. {p.title}</span><div className="flex gap-2"><button type="button" className={button} disabled={i === 0} aria-label={`جابه‌جایی ${p.title} به بالا`} onClick={() => { setProducts(current => { const next = [...current]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next; }); change(); }}>بالاتر</button><button type="button" className={button} aria-label={`حذف محصول ${p.title}`} onClick={() => { setProducts(current => current.filter(x => x.id !== p.id)); change(); }}>حذف</button></div></li>)}</ol>
      </section>
      {enabled && (!products.length || !sources.length) && <p className="text-sm text-amber-800">برای فعال‌کردن، حداقل یک محصول و یک ارتباط نتیجه لازم است.</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" className={`${button} bg-primary text-primary-foreground`} disabled={enabled && (!products.length || !sources.length)}>{saving ? "در حال ذخیره…" : "ذخیرهٔ تنظیمات این ترکیب"}</button><button type="button" className={button} onClick={onReload}>لغو تغییرها و بازخوانی</button></div>
    </fieldset>
  </form>;
}
