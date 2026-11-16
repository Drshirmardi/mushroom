'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ProgramApiError } from '@/lib/program-services-api';

export const audienceLabels = { SHARED: 'مشترک', FEMALE: 'خانم‌ها', MALE: 'آقایان', REVIEW_REQUIRED: 'نیازمند بررسی' } as const;
export const temperamentCodes = [['damavi','دموی'],['safravi','صفراوی'],['balgami','بلغمی'],['sodavi','سوداوی']] as const;
export function programError(error: unknown) {
  if (!(error instanceof ProgramApiError)) return 'ارتباط کامل نشد. اطلاعات شما حفظ شده است؛ دوباره تلاش کنید.';
  if (error.status === 409) return 'اطلاعات تغییر کرده است. نوشته‌های شما حفظ شده؛ اطلاعات تازه را دریافت و دوباره بررسی کنید.';
  if (error.status === 401) return 'نشست شما پایان یافته است. دوباره وارد شوید.';
  if (error.status === 403) return 'برای این کار، دسترسی معتبر همین کلینیک لازم است.';
  if (error.code === 'PROGRAM_DRAFT_INCOMPLETE') return 'برای ثبت نسخه، نام، متن کامل و دسته‌بندی را مشخص کنید.';
  if (error.code === 'PROGRAM_PRICING_INVALID') return 'قیمت، درصد یا بازهٔ زمانی تخفیف معتبر نیست.';
  if (error.status === 429) return 'درخواست‌ها زیاد شده‌اند؛ کمی بعد دوباره تلاش کنید.';
  if (error.status >= 500) return 'نتیجهٔ کامل دریافت نشد؛ بعضی موارد ممکن است ثبت شده باشند. تلاش دوباره، موارد ثبت‌شده را تکرار نمی‌کند.';
  return 'عملیات انجام نشد. اطلاعات واردشده و پیش‌نیازهای انتشار را بررسی کنید.';
}
export function useProgramResource<T>(load: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<{ load: typeof load; version: number; data?: T; error?: string }>();
  useEffect(() => { let active = true; void load().then(data => { if (active) setSnapshot({load,version,data}); }, error => { if (active) setSnapshot({load,version,error:programError(error)}); }); return () => { active = false; }; }, [load,version]);
  const current = snapshot?.load === load ? snapshot : undefined;
  const loading = !current || current.version !== version;
  return { data: current?.data, error: loading ? undefined : current.error, loading, refresh: () => setVersion(v => v+1) };
}
export function useProgramCommand() {
  const [busy,setBusy] = useState(false), [notice,setNotice] = useState(''); const lock = useRef(false);
  const run = async <T,>(operation: () => Promise<T>, message = 'انجام شد.') => {
    if (lock.current) return null;
    lock.current = true; setBusy(true); setNotice('');
    try { const value = await operation(); setNotice(message); return value; }
    catch(error) { setNotice(programError(error)); return null; }
    finally { lock.current = false; setBusy(false); }
  };
  return {busy,notice,setNotice,run};
}
export function ProgramModal({title,children,onClose,busy=false,dirty=false}: {title:string;children:ReactNode;onClose:()=>void;busy?:boolean;dirty?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog=ref.current, opener=document.activeElement instanceof HTMLElement ? document.activeElement : null; dialog?.showModal(); return () => {dialog?.close(); if(opener?.isConnected) opener.focus({preventScroll:true});}; },[]);
  const close=()=>{if(!busy && (!dirty || window.confirm('تغییرات ذخیره‌نشده کنار گذاشته شوند؟'))) onClose();};
  return <dialog ref={ref} className="program-dialog program-managed-dialog" aria-labelledby="program-modal-title" onCancel={e=>{e.preventDefault();close();}}>
    <header className="program-modal-header"><div><span className="program-eyebrow">مدیریت خدمات</span><h2 id="program-modal-title">{title}</h2></div><button autoFocus type="button" className="dashboard-button" disabled={busy} onClick={close}><X size={17} aria-hidden="true"/>بستن</button></header>
    <div className="program-modal-body">{children}</div>
  </dialog>;
}
export function ResourceMessage({error,loading,retry}: {error?:string;loading:boolean;retry:()=>void}) {
  return error ? <div role="alert" className="program-empty"><p>{error}</p><button className="dashboard-button" onClick={retry}>تلاش دوباره</button></div> : loading ? <p className="program-empty" role="status">در حال دریافت اطلاعات…</p> : null;
}
