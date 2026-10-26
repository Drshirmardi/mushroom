"use client";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { clinicalRequest, prescriptionError } from "@/lib/prescription-treatment-api";

type Product = { skuId: string; code: string; title: string; variant: string | null; priceToman: string };
type Page = { items: Product[]; total: number; page: number; pageSize: number };
export function VisitProducts({ token, appointmentId }: { token: string; appointmentId: string }) {
  const [query, setQuery] = useState(""); const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null); const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState(""); const [attempt, setAttempt] = useState(0);
  const command = useRef<{ hash: string; id: string } | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ query: query.trim(), page: String(page) });
      void clinicalRequest<Page>(token, `/v1/admin/appointments/${encodeURIComponent(appointmentId)}/care/products?${params}`).then(value => { if (live) setData(value); }, cause => { if (live) { setError(prescriptionError(cause)); setData(null); } }).finally(() => { if (live) setLoading(false); });
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [token, appointmentId, query, page, attempt]);
  const add = async (product: Product) => {
    if (busy) return;
    const quantity = quantities[product.skuId] ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) { setError("تعداد باید بین ۱ تا ۱۰۰ باشد."); return; }
    const hash = `${appointmentId}:${product.skuId}:${quantity}`;
    if (command.current?.hash !== hash) command.current = { hash, id: crypto.randomUUID() };
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await clinicalRequest<{ quantity: number }>(token, `/v1/admin/appointments/${encodeURIComponent(appointmentId)}/care/cart-items`, { skuId: product.skuId, quantity, commandId: command.current.id });
      if (alive.current) { command.current = null; setNotice(`${product.title} به سبد بیمار اضافه شد؛ تعداد این کالا در سبد: ${result.quantity.toLocaleString("fa-IR")}. خرید و پرداخت با بیمار است.`); }
    } catch (cause) { if (alive.current) setError(prescriptionError(cause)); }
    finally { if (alive.current) setBusy(false); }
  };
  return <div className="space-y-4 p-4 sm:p-5"><header><h2 className="text-lg font-bold">محصولات موردنیاز بیمار</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">محصول را انتخاب و به سبد بیمار اضافه کنید. کالاهای قبلی سبد حفظ می‌شوند؛ قیمت و موجودی هنگام خرید دوباره بررسی می‌شوند.</p></header>
    <label className="block text-sm">جست‌وجوی محصول یا کد کالا<input disabled={busy} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3" /></label>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{error}<button onClick={() => setAttempt(n => n + 1)} className="ms-2 underline">دریافت دوباره</button></p>}
    {notice && <p role="status" className="rounded-xl bg-primary/5 p-3 text-sm leading-6">{notice}</p>}
    {loading ? <p role="status" className="text-sm text-muted-foreground">در حال دریافت محصولات…</p> : <fieldset disabled={busy} className="grid gap-3 md:grid-cols-2 disabled:opacity-60">{data?.items.map(product => <article key={product.skuId} className="rounded-xl border border-border bg-card p-4"><div className="flex gap-2"><ShoppingBag size={19} className="shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><h3 className="font-semibold text-sm">{product.title}</h3>{product.variant && <p className="mt-1 text-sm text-muted-foreground">{product.variant}</p>}<p className="mt-2 text-sm">{BigInt(product.priceToman).toLocaleString("fa-IR")} تومان</p></div></div><div className="mt-4 flex flex-wrap items-end gap-2"><label className="text-xs">تعداد<input type="number" min={1} max={100} value={quantities[product.skuId] ?? 1} onChange={e => setQuantities(current => ({ ...current, [product.skuId]: Number(e.target.value) }))} className="ms-2 min-h-11 w-20 rounded-xl border border-border bg-background px-3" /></label><button onClick={() => void add(product)} className="min-h-11 flex-1 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">{busy ? "در حال ثبت…" : "افزودن به سبد بیمار"}</button></div></article>)}{data?.items.length === 0 && <p className="text-sm text-muted-foreground">محصول فعالی پیدا نشد.</p>}</fieldset>}
    {data && <div className="flex items-center gap-3 text-sm"><button disabled={busy || loading || page === 1} onClick={() => setPage(n => n - 1)} className="min-h-11 rounded-xl border border-border px-4 disabled:opacity-40">قبلی</button><span>صفحهٔ {page.toLocaleString("fa-IR")}</span><button disabled={busy || loading || page * data.pageSize >= data.total} onClick={() => setPage(n => n + 1)} className="min-h-11 rounded-xl border border-border px-4 disabled:opacity-40">بعدی</button></div>}
  </div>;
}
