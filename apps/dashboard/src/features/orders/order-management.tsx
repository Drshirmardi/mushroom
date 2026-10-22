"use client";

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Package, RefreshCw, Truck, X } from 'lucide-react';
import { cancelCommerceOrder, commerceOrdersErrorMessage, completeBillingOrderRefund, failOrderBillingAttempt, getCommerceOrder, rejectCommerceRequest, requestBillingOrderRefund, requestManualRefund, requestOrderCancellation, requestOrderReturn, retryOrderBillingAttempt, transitionCommerceOrder, transitionManualRefund, updateCommerceTracking, type OrderDetail } from '@/lib/commerce-orders-api';
import { date, digits, money, nextLabels, nextStep, orderStatuses, paymentStatuses, refundableToman, rialMoney } from './order-display';

const input = 'min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';
type ActionKind = 'advance' | 'tracking' | 'cancel' | 'cancellation' | 'return' | 'reject-cancellation' | 'reject-return' | 'refund' | 'approve' | 'manual-execution' | 'complete' | 'reject-refund' | 'billing-complete' | 'billing-retry' | 'billing-failed';
type Action = { kind: ActionKind; target?: string; nonce: string };
const titles: Record<ActionKind, string> = { advance: 'تغییر مرحلهٔ سفارش', tracking: 'ثبت اطلاعات ارسال', cancel: 'لغو سفارش پرداخت‌نشده', cancellation: 'ثبت درخواست لغو', return: 'ثبت درخواست مرجوعی', 'reject-cancellation': 'رد درخواست لغو', 'reject-return': 'رد درخواست مرجوعی', refund: 'ثبت بازپرداخت', approve: 'تأیید درخواست بازپرداخت', 'manual-execution': 'شروع انتقال دستی', complete: 'ثبت تکمیل بازپرداخت', 'reject-refund': 'رد درخواست بازپرداخت', 'billing-complete': 'ثبت تکمیل انتقال', 'billing-retry': 'استعلام دوبارهٔ پرداخت', 'billing-failed': 'ثبت نتیجهٔ ناموفق پرداخت' };

export function OrderManagement({ id, token, onClose, onChanged }: { id: string; token: string; onClose: () => void; onChanged: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const heading = useId();
  const [order, setOrder] = useState<OrderDetail | null>(null); const [reading, setReading] = useState(true); const [loadError, setLoadError] = useState(''); const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<Action | null>(null); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [discard, setDiscard] = useState(false); const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState({ carrierName: '', trackingCode: '', trackingUrl: '', reason: '', amount: '', evidence: '' });
  useEffect(() => { if (discard) { const warning = dialog.current?.querySelector<HTMLElement>('[data-discard]'); warning?.scrollIntoView({ block: 'nearest' }); warning?.querySelector<HTMLButtonElement>('button')?.focus(); } }, [discard]);
  const keys = useRef(new Map<string, string>()); const actionForm = useRef<HTMLFormElement>(null);
  useEffect(() => { if (action) { actionForm.current?.scrollIntoView({ block: 'nearest' }); actionForm.current?.querySelector<HTMLElement>('input,textarea,button')?.focus({ preventScroll: true }); } }, [action]);
  useEffect(() => {
    const node = dialog.current; const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { node?.close(); document.body.style.overflow = overflow; if (opener?.isConnected) opener.focus(); };
  }, []);
  useEffect(() => {
    let active = true; setLoadError(''); setReading(true);
    void getCommerceOrder(token, id).then(value => { if (active) setOrder(value); }, reason => { if (active) setLoadError(commerceOrdersErrorMessage(reason)); }).finally(() => { if (active) setReading(false); });
    return () => { active = false; };
  }, [id, token, revision]);
  const close = () => { if (busy || lock.current) return; if (dirty) setDiscard(true); else onClose(); };
  const choose = (kind: ActionKind, target?: string) => {
    if (!order || busy || dirty) return;
    setAction({ kind, target: kind === 'advance' ? nextStep(order) ?? undefined : target, nonce: crypto.randomUUID() }); setError(''); setSuccess('');
    setForm({ carrierName: order.carrierName ?? '', trackingCode: order.trackingCode ?? '', trackingUrl: order.trackingUrl ?? '', reason: '', amount: refundableToman(order), evidence: '' });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!order || !action || lock.current || loadError || reading) return;
    const tracks = action.kind === 'tracking' || action.kind === 'advance' && action.target === 'SHIPPED';
    if (tracks && (!form.carrierName.trim() || !form.trackingCode.trim())) { setError('نام شرکت حمل و کد رهگیری را کامل کنید.'); return; }
    if (tracks && form.trackingUrl.trim()) {
      try { const url = new URL(form.trackingUrl.trim()); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); }
      catch { setError('نشانی رهگیری باید HTTPS معتبر و بدون نام کاربری یا رمز باشد.'); return; }
    }
    if (action.kind === 'refund' && order.refundRoute === 'SHARED' && !form.reason.trim()) { setError('دلیل بازپرداخت را وارد کنید.'); return; }
    if (['complete', 'billing-complete', 'billing-failed'].includes(action.kind) && !form.evidence.trim()) { setError('مرجع غیرحساس بررسی یا انتقال را وارد کنید.'); return; }
    lock.current = true; setBusy(true); setError('');
    const identity = JSON.stringify([action.nonce, form]); let key = keys.current.get(identity);
    try {
      const amount = digits(form.amount.trim());
      if (action.kind === 'refund' && (!/^[1-9][0-9]{0,18}$/.test(amount) || !key && BigInt(amount) > BigInt(refundableToman(order)))) throw new Error('INVALID_REFUND');
      if (!key) { key = crypto.randomUUID(); keys.current.set(identity, key); }
      if (action.kind === 'tracking' || action.kind === 'advance' && action.target === 'SHIPPED') {
        await updateCommerceTracking(token, id, { carrierName: form.carrierName.trim(), trackingCode: form.trackingCode.trim(), ...(form.trackingUrl.trim() ? { trackingUrl: form.trackingUrl.trim() } : {}) }, key + '-tracking');
      }
      if (action.kind === 'advance') await transitionCommerceOrder(token, id, action.target as NonNullable<ReturnType<typeof nextStep>>, key);
      if (action.kind === 'cancel') await cancelCommerceOrder(token, id, key);
      if (action.kind === 'cancellation') await requestOrderCancellation(token, id, form.reason.trim() || undefined, key);
      if (action.kind === 'return') await requestOrderReturn(token, id, form.reason.trim() || undefined, key);
      if (action.kind === 'reject-cancellation' || action.kind === 'reject-return') await rejectCommerceRequest(token, id, action.kind === 'reject-cancellation' ? 'cancellation' : 'return', key);
      if (action.kind === 'refund') {
        if (order.refundRoute === 'SHARED' && order.billing) await requestBillingOrderRefund(token, order.billing.id, amount, form.reason.trim(), key);
        else await requestManualRefund(token, id, amount, undefined, key);
      }
      if (['approve', 'manual-execution', 'complete', 'reject-refund'].includes(action.kind)) await transitionManualRefund(token, action.target!, action.kind === 'reject-refund' ? 'reject' : action.kind as 'approve' | 'manual-execution' | 'complete', form.evidence.trim() || undefined, key);
      if (action.kind === 'billing-complete') await completeBillingOrderRefund(token, action.target!, form.evidence.trim(), key);
      if (action.kind === 'billing-retry') await retryOrderBillingAttempt(token, action.target!, key);
      if (action.kind === 'billing-failed') await failOrderBillingAttempt(token, action.target!, form.evidence.trim(), key);
      setSuccess('درخواست روی سرور ثبت شد؛ آخرین وضعیت سفارش را بررسی کنید.'); setAction(null); setDirty(false); setDiscard(false); onChanged();
      try { setOrder(await getCommerceOrder(token, id)); setLoadError(''); } catch { setLoadError('عملیات ثبت شد، اما دریافت وضعیت تازه ناموفق بود. قبل از اقدام بعدی بازخوانی کنید.'); }
    } catch (reason) {
      setError(reason instanceof Error && reason.message === 'INVALID_REFUND' ? 'مبلغ باید عدد صحیح مثبت و حداکثر برابر ماندهٔ قابل بازپرداخت باشد.' : commerceOrdersErrorMessage(reason));
      // A timeout can follow a committed financial operation; retain this form's command key for retry.
      try { setOrder(await getCommerceOrder(token, id)); } catch { setLoadError('وضعیت تازه دریافت نشد؛ پیش از اقدام مجدد بازخوانی کنید.'); }
      onChanged();
    } finally { lock.current = false; setBusy(false); }
  };
  const setField = (field: keyof typeof form, value: string) => { setForm(current => ({ ...current, [field]: value })); setDirty(true); setError(''); };
  const next = order ? nextStep(order) : null;
  const canRequest = order && ['PAID', 'FULFILLMENT_PENDING', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED'].includes(order.status);
  const canRefund = order && BigInt(refundableToman(order)) > 0n && (order.refundRoute === 'SHARED' ? order.billing?.status === 'PAID' : ['CANCELLATION_REQUESTED', 'RETURN_REQUESTED', 'REFUND_PENDING'].includes(order.status));
  const needsTracking = action?.kind === 'tracking' || action?.kind === 'advance' && action.target === 'SHIPPED';
  const needsEvidence = action && ['complete', 'billing-complete', 'billing-failed'].includes(action.kind);
  const disabled = busy || reading || !!loadError || !!action;
  return <dialog ref={dialog} aria-labelledby={heading} aria-busy={busy} onCancel={event => { event.preventDefault(); close(); }} className="fixed inset-0 m-auto h-[calc(100dvh-1rem)] max-h-[64rem] w-[calc(100vw-1rem)] max-w-6xl overflow-hidden rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm">
    <div dir="rtl" className="flex h-full flex-col"><header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-6"><div><p className="text-xs text-muted-foreground">مدیریت سفارش</p><h2 id={heading} className="mt-1 font-bold">{order ? `سفارش ${order.orderNumber}` : 'در حال دریافت سفارش…'}</h2></div><button type="button" autoFocus disabled={busy} onClick={close} className="dashboard-icon" aria-label="بستن سفارش"><X size={20} /></button></header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {discard && <div data-discard role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="flex-1">اطلاعات فرم هنوز ثبت نشده‌اند. کنار گذاشته شوند؟</p><button className="dashboard-button" onClick={() => setDiscard(false)}>ادامهٔ ویرایش</button><button className="dashboard-button" onClick={onClose}>بستن و کنارگذاشتن</button></div>}
        {loadError && <div role="alert" className="rounded-2xl border border-amber-300 p-4 text-sm"><p>{loadError}</p><button disabled={busy} className="dashboard-button mt-3" onClick={() => setRevision(v => v + 1)}><RefreshCw size={15} />بازخوانی سفارش</button></div>}
        {success && <p role="status" className="rounded-2xl bg-primary/10 p-4 text-sm text-primary">{success}</p>}
        {!order && !loadError && <p role="status" className="p-5 text-sm text-muted-foreground">در حال دریافت اقلام، پرداخت و اطلاعات تحویل…</p>}
        {order && <>
          <section className="dashboard-card flex flex-wrap items-center justify-between gap-4 p-5"><div><span className="dashboard-badge">{orderStatuses[order.status] ?? order.status}</span><p className="mt-3 text-xs text-muted-foreground">{date(order.createdAt)} · {order.shippingMethod === 'PICKUP' ? 'تحویل حضوری' : 'ارسال با پیک / پست'}</p></div><div><p className="text-xs text-muted-foreground">مبلغ کل سفارش</p><p className="mt-2 text-xl font-bold">{money(order.totalAmountToman)}</p></div><Link href={`/patients/${order.patientId}`} className="dashboard-button">پروندهٔ خریدار<ArrowLeft size={15} /></Link></section>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-5"><section className="dashboard-card p-5"><h3 className="mb-4 flex items-center gap-2 font-bold"><Package size={18} />اقلام سفارش</h3><div className="divide-y divide-border">{order.lines.map(line => <article key={line.id} className="flex items-start justify-between gap-3 py-4"><div className="min-w-0"><p className="text-sm font-bold leading-7">{line.title}</p><p className="mt-1 text-xs text-muted-foreground"><bdi>{line.skuCode}</bdi> · {line.quantity.toLocaleString('fa-IR')} عدد × {money(line.unitPriceToman)}</p></div><strong className="shrink-0 text-sm">{money(line.lineTotalToman)}</strong></article>)}</div><dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">{[['جمع کالاها', order.subtotalAmountToman], ['مالیات', order.taxAmountToman], ['تخفیف', order.discountAmountToman], ['هزینهٔ ارسال', order.shippingAmountToman]].map(([title, value]) => <div key={title} className="flex justify-between gap-3"><dt className="text-muted-foreground">{title}</dt><dd>{money(value)}</dd></div>)}</dl></section>
              <section className="dashboard-card space-y-3 p-5"><h3 className="flex items-center gap-2 font-bold"><Truck size={18} />خریدار و تحویل</h3><p className="text-sm">{order.shippingAddress?.recipientName ?? 'خریدار'} · <bdi>{order.shippingAddress?.phone ?? order.patientPhone ?? 'تلفن ثبت نشده'}</bdi></p>{order.shippingAddress ? <p className="whitespace-pre-wrap text-sm leading-8 text-muted-foreground">{[order.shippingAddress.province, order.shippingAddress.city, order.shippingAddress.line1, order.shippingAddress.line2].filter(Boolean).join('، ')}{order.shippingAddress.postalCode && ` · کد پستی ${order.shippingAddress.postalCode}`}</p> : <p className="text-sm text-muted-foreground">{order.shippingMethod === 'PICKUP' ? 'این سفارش به‌صورت حضوری تحویل می‌شود.' : 'نشانی تحویل در سفارش ثبت نشده است.'}</p>}{order.trackingCode && <p className="text-sm">{order.carrierName} · کد رهگیری <bdi>{order.trackingCode}</bdi></p>}</section>
              <section className="dashboard-card space-y-3 p-5"><h3 className="font-bold">آخرین فعالیت‌های سفارش</h3>{!order.operations.length && <p className="text-xs text-muted-foreground">فعالیتی برای این سفارش ثبت نشده است.</p>}{order.operations.map(op => <div key={op.id} className="border-b border-border pb-3 last:border-0"><p className="text-sm">{activity(op.action)}</p><p className="mt-1 text-xs text-muted-foreground">{date(op.createdAt)}</p>{op.reason && <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{op.reason}</p>}</div>)}</section>
            </div>
            <div className="min-w-0 space-y-5"><section className="dashboard-card space-y-4 p-5"><h3 className="font-bold">کنترل سفارش</h3><div className="flex flex-wrap gap-2">{next && <button disabled={disabled} className="dashboard-button dashboard-button-primary" onClick={() => choose('advance')}>{nextLabels[next]}</button>}{order.shippingMethod === 'COURIER' && ['FULFILLMENT_PENDING', 'SHIPPED'].includes(order.status) && <button disabled={disabled} className="dashboard-button" onClick={() => choose('tracking')}>ویرایش رهگیری</button>}{order.status === 'PENDING_PAYMENT' && <button disabled={disabled} className="dashboard-button text-destructive" onClick={() => choose('cancel')}>لغو سفارش</button>}{canRequest && <><button disabled={disabled} className="dashboard-button" onClick={() => choose('cancellation')}>درخواست لغو</button><button disabled={disabled} className="dashboard-button" onClick={() => choose('return')}>درخواست مرجوعی</button></>}{order.status === 'CANCELLATION_REQUESTED' && <button disabled={disabled} className="dashboard-button" onClick={() => choose('reject-cancellation')}>رد درخواست لغو</button>}{order.status === 'RETURN_REQUESTED' && <button disabled={disabled} className="dashboard-button" onClick={() => choose('reject-return')}>رد درخواست مرجوعی</button>}{canRefund && <button disabled={disabled} className="dashboard-button" onClick={() => choose('refund')}>بازپرداخت</button>}</div>
                {action && <form ref={actionForm} onSubmit={event => void submit(event)} onChange={() => setDirty(true)} className="space-y-4 rounded-2xl border border-primary/25 bg-primary/5 p-4"><h4 className="text-sm font-bold">{action.kind === 'advance' && action.target ? nextLabels[action.target as keyof typeof nextLabels] : titles[action.kind]}</h4><fieldset disabled={busy} className="space-y-4">
                  {needsTracking && <><Field title="نام شرکت حمل" required maxLength={160} value={form.carrierName} onChange={v => setField('carrierName', v)} /><Field title="کد رهگیری" required maxLength={160} value={form.trackingCode} onChange={v => setField('trackingCode', v)} /><Field title="نشانی رهگیری HTTPS؛ اختیاری" type="url" maxLength={2048} value={form.trackingUrl} onChange={v => setField('trackingUrl', v)} /></>}
                  {action.kind === 'refund' && <><Field title="مبلغ بازپرداخت به تومان" required inputMode="numeric" maxLength={19} value={form.amount} onChange={v => setField('amount', digits(v))} /><p className="text-xs leading-7 text-muted-foreground">حداکثر قابل درخواست: {money(refundableToman(order))}. {order.billing?.method === 'WALLET' ? 'تأیید این فرم مبلغ را به کیف پول خریدار برمی‌گرداند.' : 'ثبت درخواست به معنی انجام انتقال بانکی نیست.'}</p></>}
                  {(action.kind === 'cancellation' || action.kind === 'return' || action.kind === 'refund' && order.refundRoute === 'SHARED') && <label className="block space-y-2 text-xs">{action.kind === 'refund' ? 'دلیل بازپرداخت' : 'یادداشت درخواست؛ اختیاری'}<textarea required={action.kind === 'refund'} maxLength={500} rows={3} className={input} value={form.reason} onChange={event => setField('reason', event.target.value)} /></label>}
                  {needsEvidence && <Field title="مرجع غیرحساس بررسی یا انتقال" required maxLength={500} value={form.evidence} onChange={v => setField('evidence', v)} />}
                  {!needsTracking && action.kind !== 'refund' && <p className="text-xs leading-7 text-muted-foreground">این اقدام برای همین سفارش ثبت می‌شود. پیش از تأیید، وضعیت و اطلاعات پرداخت را بررسی کنید.</p>}
                  {['refund', 'complete', 'billing-complete', 'billing-failed', 'cancel', 'reject-refund'].includes(action.kind) && <label className="flex items-start gap-2 text-xs leading-6"><input type="checkbox" required className="mt-1 size-4 shrink-0" />اطلاعات این اقدام و سفارش را بررسی کرده‌ام.</label>}
                  {error && <p role="alert" className="text-sm leading-7 text-destructive">{error}</p>}
                  <div className="flex flex-wrap gap-2"><button disabled={busy || reading || !!loadError} className="dashboard-button dashboard-button-primary" type="submit">{busy ? 'در حال ثبت…' : 'تأیید و ثبت'}<Check size={15} /></button><button type="button" disabled={busy} className="dashboard-button" onClick={() => { setAction(null); setDirty(false); setError(''); }}>کنارگذاشتن فرم</button></div>
                </fieldset></form>}
              </section>
              <section className="dashboard-card space-y-4 p-5"><h3 className="font-bold">پرداخت و بازپرداخت‌ها</h3><p className="text-sm">{paymentStatuses[order.payment?.status ?? order.billing?.status ?? ''] ?? 'پرداختی ثبت نشده'}{order.billing?.method && ` · ${order.billing.method === 'WALLET' ? 'کیف پول' : 'درگاه بانکی'}`}</p>{order.billing?.refunds.map(refund => <div key={refund.id} className="space-y-2 rounded-xl border border-border p-3"><p className="text-sm">{rialMoney(refund.amountRial)} · {paymentStatuses[refund.status] ?? refund.status}</p>{refund.completedAt && <p className="text-xs text-muted-foreground">{date(refund.completedAt)}</p>}{refund.status === 'MANUAL_REQUIRED' && <button disabled={disabled} className="dashboard-button" onClick={() => choose('billing-complete', refund.id)}>ثبت انتقال انجام‌شده</button>}</div>)}{order.payment?.refunds.map(refund => <div key={refund.id} className="space-y-2 rounded-xl border border-border p-3"><p className="text-sm">{money(refund.amountToman)} · {paymentStatuses[refund.status] ?? refund.status}</p><div className="flex flex-wrap gap-2">{refund.status === 'REQUESTED' && <><button disabled={disabled} className="dashboard-button" onClick={() => choose('approve', refund.id)}>تأیید درخواست</button><button disabled={disabled} className="dashboard-button" onClick={() => choose('reject-refund', refund.id)}>رد درخواست</button></>}{refund.status === 'APPROVED' && <button disabled={disabled} className="dashboard-button" onClick={() => choose('manual-execution', refund.id)}>شروع انتقال</button>}{refund.status === 'MANUAL_EXECUTION_PENDING' && <button disabled={disabled} className="dashboard-button" onClick={() => choose('complete', refund.id)}>ثبت انتقال انجام‌شده</button>}</div></div>)}{order.billing?.attempts.filter(attempt => ['VERIFYING', 'REQUIRES_RECONCILIATION'].includes(attempt.status)).map(attempt => <div key={attempt.id} className="space-y-3 rounded-xl border border-amber-300 p-3"><p className="text-xs">{paymentStatuses[attempt.status] ?? attempt.status} · {rialMoney(attempt.amountRial)}</p><div className="flex flex-wrap gap-2"><button disabled={disabled} className="dashboard-button" onClick={() => choose('billing-retry', attempt.id)}>استعلام دوباره</button>{attempt.status === 'REQUIRES_RECONCILIATION' && <button disabled={disabled} className="dashboard-button" onClick={() => choose('billing-failed', attempt.id)}>ثبت عدم تأیید با مرجع بررسی</button>}</div></div>)}</section>
            </div>
          </div>
        </>}
      </div>
    </div>
  </dialog>;
}

function Field({ title, value, onChange, ...props }: { title: string; value: string; onChange: (value: string) => void; required?: boolean; maxLength?: number; type?: string; inputMode?: 'numeric' }) {
  return <label className="block space-y-2 text-xs">{title}<input {...props} value={value} onChange={event => onChange(event.target.value)} className={input} /></label>;
}
function activity(action: string) {
  if (action === 'TRACKING') return 'اطلاعات رهگیری به‌روزرسانی شد';
  if (action === 'CANCEL_PENDING_PAYMENT') return 'سفارش پیش از پرداخت لغو شد';
  if (action.startsWith('FULFILLMENT_')) return `مرحلهٔ سفارش: ${orderStatuses[action.slice(12)] ?? 'به‌روزرسانی مرحله'}`;
  return orderStatuses[action] ?? 'عملیات سفارش ثبت شد';
}
