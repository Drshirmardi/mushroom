'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, Plus, X } from 'lucide-react';
import { useDashboardSession } from '@/components/auth/dashboard-session-gate';
import { listGuidanceContent } from '@/lib/assessment-api';
import { approveDefinition, createDefinition, getPresentation, listDefinitions, ProgramApiError, savePresentation, type Definition, type DefinitionInput, type Presentation } from '@/lib/program-services-api';
import './program-services.css';
import { Publication } from './program-publication';

const codes = [['damavi', 'دموی'], ['safravi', 'صفراوی'], ['balgami', 'بلغمی'], ['sodavi', 'سوداوی']] as const;
const iconOptions = [['book', 'کتاب'], ['compass', 'شناخت خود'], ['leaf', 'برگ'], ['sparkles', 'درخشش'], ['heart', 'قلب']];
const field = 'program-field';
function useResource<T>(load: () => Promise<T>) {
  const [snapshot, setSnapshot] = useState<{ load: typeof load; data: T | null; error: string } | null>(null), [version, refresh] = useState(0);
  useEffect(() => { let active = true; void load().then(value => { if (active) setSnapshot({ load, data: value, error: '' }); }, () => { if (active) setSnapshot({ load, data: null, error: 'دریافت اطلاعات انجام نشد. دوباره تلاش کنید.' }); }); return () => { active = false; }; }, [load, version]);
  return { data: snapshot?.load === load ? snapshot.data : null, error: snapshot?.load === load ? snapshot.error : '', refresh: () => refresh(v => v + 1) };
}
function useCommand() {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const lock = useRef(false), keys = useRef(new Map<string, string>());
  const key = (body: unknown) => { const fingerprint = JSON.stringify(body); if (!keys.current.has(fingerprint)) keys.current.set(fingerprint, crypto.randomUUID()); return keys.current.get(fingerprint)!; };
  const run = async <T,>(operation: () => Promise<T>) => { if (lock.current) return null; lock.current = true; setBusy(true); setNotice(''); try { const value = await operation(); setNotice('ذخیره شد.'); return value; } catch (e) { setNotice(e instanceof ProgramApiError && e.status === 409 ? 'نسخه یا تنظیمات تغییر کرده است. نوشته‌های شما حفظ شده؛ اطلاعات تازه را دریافت و دوباره بررسی کنید.' : e instanceof ProgramApiError && e.status === 403 ? 'برای این عملیات مجوز یا عضویت معتبر لازم است.' : 'عملیات انجام نشد. انتشار به منبع، بازبینی و شرایط خرید معتبر نیاز دارد.'); return null; } finally { lock.current = false; setBusy(false); } };
  return { busy, notice, key, run };
}
export function ProgramServicesPage() {
  const { authentication } = useDashboardSession();
  return <Workspace key={authentication.user.id} token={authentication.accessToken} doctor={authentication.user.roles.includes('DOCTOR')} manage={authentication.user.roles.includes('ADMIN')} />;
}
function Workspace({ token, doctor, manage }: { token: string; doctor: boolean; manage: boolean }) {
  const [page, setPage] = useState(1), [selection, setSelection] = useState<Definition | 'new' | null>(null);
  const list = useResource(useCallback(() => listDefinitions(token, page, doctor && !manage), [token, page, doctor, manage]));
  const scroll = useRef<HTMLDivElement>(null);
  const select = (value: Definition | 'new' | null) => { setSelection(value); scroll.current?.scrollTo({ top: 0 }); };
  const visible = list.data?.items.filter(item => item.kind === 'READY_EDUCATION') ?? [];
  return <div ref={scroll} className="program-workspace" dir="rtl" tabIndex={0} role="region" aria-label="فضای مدیریت خدمات">
    <div className="program-content">
      <header className="program-workspace-header">
        <div><span className="program-eyebrow">مدیریت خدمات آموزشی</span><h1>خدمات متنی مزاج</h1><p>از نوشتن محتوا تا پیشنهاد و فروش، همهٔ تنظیمات هر خدمت در یک جا.</p></div>
        {!selection && manage && <button className="dashboard-button dashboard-button-primary" onClick={() => select('new')}><Plus size={18} aria-hidden="true" />خدمت جدید</button>}
      </header>
      {selection ? <Editor key={selection === 'new' ? 'new' : selection.id} token={token} initial={selection === 'new' ? null : selection} doctor={doctor} manage={manage} onClose={() => { select(null); list.refresh(); }} onCreated={item => { select(item); list.refresh(); }} /> : <>
        <div className="program-list-heading"><h2>خدمت‌های شما</h2><p>برای ویرایش متن، تنظیم مزاج یا تعیین قیمت، خدمت را باز کنید.</p></div>
        {list.error ? <div role="alert" className="program-empty"><p>{list.error}</p><button className="dashboard-button" onClick={list.refresh}>تلاش دوباره</button></div> : !list.data ? <p role="status" className="program-empty">در حال دریافت خدمات…</p> : <>
          <div className="program-definition-grid">{visible.map(item => <button key={item.id} className="program-definition-card" onClick={() => select(item)}>
            <span className="program-card-top"><span className="program-card-icon"><BookOpen size={23} aria-hidden="true" /></span><span className="program-badge" data-status={item.status}>{item.status === 'APPROVED' ? 'تأییدشده' : item.status === 'DRAFT' ? 'پیش‌نویس' : 'لغوشده'}</span></span>
            <span className="program-card-version">نسخه {item.versionNumber.toLocaleString('fa-IR')}</span><h3>{item.title}</h3><p>{item.summary}</p><strong>مشاهده و مدیریت <ArrowLeft size={16} aria-hidden="true" /></strong>
          </button>)}</div>
          {!visible.length && <div className="program-empty"><BookOpen size={28} aria-hidden="true" /><h3>{list.data.total ? 'خدمت متنی در این صفحه نیست' : 'اولین خدمتتان را بسازید'}</h3><p>{list.data.total ? 'صفحه‌های دیگر را بررسی کنید.' : 'با یک عنوان، معرفی کوتاه و محتوای آموزشی شروع کنید؛ تنظیم مزاج و قیمت در مرحلهٔ بعد انجام می‌شود.'}</p></div>}
          <nav className="program-pagination" aria-label="صفحه‌های خدمات"><button className="dashboard-button" disabled={page === 1} onClick={() => { setPage(p => p - 1); scroll.current?.scrollTo({ top: 0 }); }}>قبلی</button><span>صفحه {page.toLocaleString('fa-IR')}</span><button className="dashboard-button" disabled={page * 12 >= list.data.total} onClick={() => { setPage(p => p + 1); scroll.current?.scrollTo({ top: 0 }); }}>بعدی</button></nav>
        </>}
      </>}
    </div>
  </div>;
}
function Editor({ token, initial, doctor, manage, onClose, onCreated }: { token: string; initial: Definition | null; doctor: boolean; manage: boolean; onClose: () => void; onCreated: (item: Definition) => void }) {
  const [item, setItem] = useState(initial), [editing, setEditing] = useState(!initial);
  const [sourcePage, setSourcePage] = useState(1);
  const [section, setSection] = useState('content');
  const [dirty, setDirty] = useState(false);
  const sources = useResource(useCallback(() => editing && manage ? listGuidanceContent(token, sourcePage) : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 50 }), [token, sourcePage, editing, manage]));
  const command = useCommand();
  const [form, setForm] = useState({ title: initial?.title ?? '', summary: initial?.summary ?? '', body: initial?.body ?? '', category: initial?.category ?? '', audience: initial?.safety.intendedAudience ?? '', limitations: initial?.safety.limitations ?? '', care: initial?.safety.seekProfessionalCare ?? '', contraindications: initial?.safety.contraindications.join('\n') ?? '', eligibility: initial?.eligibilityDescription ?? '' });
  const [references, setReferences] = useState(initial?.contentReferences ?? []);
  const generatedKey = useRef(`TEXT_${crypto.randomUUID().replaceAll('-', '').toUpperCase()}`);
  const submit = async (event: FormEvent) => { event.preventDefault(); const body: DefinitionInput = { programKey: initial?.programKey ?? generatedKey.current, locale: initial?.locale ?? 'fa-IR', kind: 'READY_EDUCATION', title: form.title, summary: form.summary, body: form.body, category: form.category, eligibilityDescription: form.eligibility, safety: { intendedAudience: form.audience, limitations: form.limitations, contraindications: form.contraindications.split('\n').map(s => s.trim()).filter(Boolean), seekProfessionalCare: form.care }, contentReferences: references }; const saved = await command.run(() => createDefinition(token, body, command.key(body))); if (saved) onCreated(saved); };
  const input = (name: keyof typeof form, label: string, maxLength: number, multiline = false) => <label key={name} htmlFor={`program-${name}`}>{label}<span className="program-required">ضروری</span>{multiline ? <textarea id={`program-${name}`} className={field} rows={3} required maxLength={maxLength} value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} /> : <input id={`program-${name}`} className={field} required maxLength={maxLength} value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} />}</label>;
  const close = () => { if (editing && dirty && !window.confirm('تغییرات متن هنوز ذخیره نشده‌اند. از ویرایش خارج می‌شوید؟')) return; onClose(); };
  return <section className="program-editor" aria-label="ویرایش خدمت">
    <header><div><span className="program-eyebrow">{item ? `نسخه ${item.versionNumber.toLocaleString('fa-IR')} · ${item.status === 'APPROVED' ? 'تأییدشده' : item.status === 'DRAFT' ? 'در انتظار بازبینی' : 'لغوشده'}` : 'ساخت خدمت'}</span><h2>{editing ? initial ? 'ویرایش در نسخهٔ تازه' : 'خدمت متنی جدید' : item?.title}</h2></div><button className="dashboard-button" disabled={command.busy} onClick={close}><X size={17} aria-hidden="true" />بستن</button></header>
    {item && manage && <nav className="program-section-nav" aria-label="بخش‌های مدیریت خدمت">{[['content','متن و محتوا'],['placement','مزاج و نمایش'],['price','قیمت و انتشار']].map(([value,label]) => <button type="button" key={value} aria-pressed={section === value} aria-controls={`program-panel-${value}`} onClick={() => setSection(value)}>{label}</button>)}</nav>}
    {command.notice && <p role="status" className="program-notice">{command.notice}</p>}
    <div id="program-panel-content" hidden={section !== 'content'}>
      {editing ? <form onSubmit={submit} onChange={() => setDirty(true)}><fieldset disabled={command.busy} className="program-editor-form">
        <section className="program-form-section"><div className="program-section-heading"><span>۱</span><div><h3>معرفی خدمت</h3><p>این اطلاعات قبل از خرید به کاربر نمایش داده می‌شوند.</p></div></div><div className="program-form-grid">{input('title','عنوان خدمت',240)}{input('category','دسته‌بندی',100)}</div>{input('summary','معرفی کوتاه پیش از خرید',2000,true)}</section>
        <section className="program-form-section"><div className="program-section-heading"><span>۲</span><div><h3>محتوای خریداری‌شده</h3><p>متن کامل فقط از مسیر دسترسی خریداری‌شده در اختیار کاربر قرار می‌گیرد.</p></div></div><label htmlFor="program-body">متن کامل پس از خرید<textarea id="program-body" className={field} required rows={12} maxLength={100000} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></label></section>
        <section className="program-form-section"><div className="program-section-heading"><span>۳</span><div><h3>مخاطب و حدود استفاده</h3><p>برای بازبینی محتوا، کاربرد و محدودیت‌های آن را روشن بنویسید.</p></div></div><div className="program-form-grid">{input('audience','این محتوا برای چه کسانی است؟',1000)}{input('eligibility','شرایط استفاده',4000,true)}{input('limitations','محدودیت‌های محتوای آموزشی',4000,true)}{input('care','راهنمای مراجعه به متخصص',2000,true)}</div><label htmlFor="program-contraindications">موارد منع استفاده <small>اختیاری؛ هر مورد در یک خط</small><textarea id="program-contraindications" className={field} rows={3} value={form.contraindications} onChange={e => setForm(f => ({ ...f, contraindications: e.target.value }))} /></label></section>
        <fieldset className="program-reference-picker"><legend>منابع آموزشی تأییدشدهٔ مرتبط</legend><p>منابعی را انتخاب کنید که پشتوانهٔ متن این خدمت هستند.</p>{references.length > 0 && <div className="program-selected-sources">{references.map((ref,index) => <button type="button" key={ref.id} className="dashboard-button" onClick={() => { setDirty(true); setReferences(items => items.filter(i => i.id !== ref.id)); }}>حذف منبع منتخب {(index + 1).toLocaleString('fa-IR')}</button>)}</div>}
          {sources.error ? <div role="alert"><p>{sources.error}</p><button type="button" className="dashboard-button" onClick={sources.refresh}>تلاش دوباره</button></div> : !sources.data ? <p role="status">در حال دریافت منابع…</p> : <div className="program-source-options">{sources.data.items.filter(s => s.status === 'APPROVED').map(source => <label key={source.id}><input type="checkbox" checked={references.some(r => r.id === source.id)} onChange={e => setReferences(items => e.target.checked ? [...items, { id: source.id, contentHash: source.contentHash }] : items.filter(r => r.id !== source.id))} />{source.title}</label>)}{!sources.data.items.some(s => s.status === 'APPROVED') && <p>در این صفحه منبع تأییدشده‌ای نیست. پیش از ذخیره، یک منبع آموزشی معتبر انتخاب کنید.</p>}</div>}
          <div className="program-pagination"><button type="button" className="dashboard-button" disabled={sourcePage === 1} onClick={() => setSourcePage(p => p - 1)}>منابع قبلی</button><button type="button" className="dashboard-button" disabled={!sources.data || sourcePage * sources.data.pageSize >= sources.data.total} onClick={() => setSourcePage(p => p + 1)}>منابع بعدی</button></div>
        </fieldset>
        <footer className="program-form-footer"><p>ذخیرهٔ پیش‌نویس، فروش را فعال نمی‌کند. بعد از بازبینی پزشک، مزاج و قیمت را تنظیم کنید.</p><button className="dashboard-button dashboard-button-primary" disabled={!references.length}>{command.busy ? 'در حال ذخیره…' : 'ذخیرهٔ پیش‌نویس نسخهٔ جدید'}</button></footer>
      </fieldset></form> : item && <div className="program-read-content"><div className="program-notice"><p>ویرایش متن، نسخهٔ تازه می‌سازد؛ دسترسی خریدهای قبلی حفظ می‌شود.</p></div><h3>معرفی خدمت</h3><p>{item.summary}</p><details className="program-content-preview"><summary>مشاهدهٔ متن و اطلاعات بازبینی</summary><p className="program-full-body">{item.body}</p><h3>محدودیت‌ها</h3><p>{item.safety.limitations}</p><h3>مراجعه به متخصص</h3><p>{item.safety.seekProfessionalCare}</p></details><div className="program-editor-actions">{manage && <button className="dashboard-button" onClick={() => setEditing(true)} disabled={command.busy}>ویرایش در نسخهٔ تازه</button>}{doctor && item.status === 'DRAFT' && <button className="dashboard-button dashboard-button-primary" disabled={command.busy} onClick={async () => { if (!window.confirm('متن، منابع و محدودیت‌ها را بررسی کرده‌اید و تأیید می‌کنید؟')) return; const approved = await command.run(() => approveDefinition(token, item)); if (approved) setItem(approved); }}>تأیید با اختیار پزشک</button>}</div></div>}
    </div>
    {item && manage && <><div id="program-panel-placement" hidden={section !== 'placement'}><Placement key={item.id} token={token} item={item} /></div><div id="program-panel-price" hidden={section !== 'price'}><Publication key={`publication:${item.id}:${item.status}`} token={token} item={item} /></div></>}
  </section>;
}
function Placement({ token, item }: { token: string; item: Definition }) {
  const [draft, setDraft] = useState<Presentation | null>(null);
  const [failure, setFailure] = useState(false); const command = useCommand();
  const load = useCallback(async () => { try { const value = await getPresentation(token, item.id); setDraft(current => current ?? value); setFailure(false); } catch { setFailure(true); } }, [token,item.id]);
  useEffect(() => { let active = true; void getPresentation(token, item.id).then(value => { if (active) { setDraft(current => current ?? value); setFailure(false); } }, () => { if (active) setFailure(true); }); return () => { active = false; }; }, [token, item.id]);
  const reload = async () => { const value = await command.run(() => getPresentation(token, item.id)); if (value) setDraft(value); };
  if (!draft) return <section><h3>پیشنهاد بر اساس مزاج</h3><p role={failure ? 'alert' : 'status'}>{failure ? 'تنظیمات دریافت نشد.' : 'در حال دریافت تنظیمات…'}</p>{failure && <button className="dashboard-button" onClick={() => void load()}>تلاش دوباره</button>}</section>;
  return <section className="program-placement"><h3>پیشنهاد برای کدام مزاج‌ها؟</h3><p>مزاج اول و دوم ترتیب دارند. برای مزاج تک‌بعدی، هر دو را یکسان انتخاب کنید.</p><fieldset disabled={command.busy}><div className="program-icon-field"><label htmlFor="program-icon">آیکون خدمت</label><select id="program-icon" className={field} value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value as Presentation['icon'] })}>{iconOptions.map(([value,title]) => <option value={value} key={value}>{title}</option>)}</select></div><div className="program-pair-grid">{codes.flatMap(([first,a]) => codes.map(([second,b]) => { const pair=`${first}/${second}`; return <label key={pair}><input type="checkbox" checked={draft.pairs.includes(pair)} onChange={e => setDraft({ ...draft, pairs: e.target.checked ? [...draft.pairs,pair] : draft.pairs.filter(p => p !== pair) })} /><span>اول {a}<small>دوم {b}</small></span></label>; }))}</div><label className="program-check"><input type="checkbox" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} />نمایش در پیشنهادهای نتیجه، پس از آماده‌شدن عرضه</label><button className="dashboard-button dashboard-button-primary" disabled={draft.enabled && !draft.pairs.length} onClick={async () => { const value = await command.run(() => savePresentation(token,item.id,{ expectedRevision:draft.revision,enabled:draft.enabled,icon:draft.icon as 'book' | 'compass' | 'leaf' | 'sparkles' | 'heart',pairs:draft.pairs })); if (value) setDraft(value); }}>ذخیرهٔ مزاج‌ها و آیکون</button><button className="dashboard-button" onClick={() => { if(window.confirm('انتخاب‌های ذخیره‌نشده کنار گذاشته و تنظیمات تازه دریافت شوند؟')) void reload(); }}>دریافت تنظیمات تازه</button></fieldset>{command.notice && <p role="status" className="program-notice">{command.notice}</p>}</section>;
}
