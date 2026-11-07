'use client';
import { useCallback, useState } from 'react';
import { Archive, BookOpen, Plus } from 'lucide-react';
import { createManagedService, listManagedServices, listProgramCategories, type ManagedService } from '@/lib/program-services-api';
import { formatRial } from '@/lib/wallet-money';
import { ManagedProgramEditor } from './managed-program-editor';
import { ProgramCatalogManager } from './program-catalog-manager';
import { ProgramCategoryManager } from './program-category-manager';
import { ProgramBulkPublication } from './program-bulk-publication';
import { audienceLabels, ProgramModal, ResourceMessage, useProgramCommand, useProgramResource } from './program-management-shared';
import { pricePreview } from './program-schedule';
import './program-management.css';

export function ManagedProgramsWorkspace({token,doctor}: {token:string;doctor:boolean}) {
  const [tab,setTab]=useState('services'),[page,setPage]=useState(1),[search,setSearch]=useState(''),[state,setState]=useState<'ACTIVE'|'ARCHIVED'|'ALL'>('ACTIVE'),[categoryId,setCategoryId]=useState(''),[audience,setAudience]=useState<keyof typeof audienceLabels|''>('');
  const [editing,setEditing]=useState<string|null>(null),[creating,setCreating]=useState(false),[selected,setSelected]=useState<Record<string,ManagedService>>({}),[bulk,setBulk]=useState<{mode:'pricing'|'publish';services:ManagedService[]}|null>(null);
  const categories=useProgramResource(useCallback(()=>listProgramCategories(token),[token]));
  const services=useProgramResource(useCallback(()=>listManagedServices(token,{page,search:search||undefined,state,categoryId:categoryId||undefined,audience:audience||undefined}),[token,page,search,state,categoryId,audience]));
  const changed=()=>{services.refresh();categories.refresh();setSelected({});};
  const filter=(action:()=>void)=>{action();setPage(1);setSelected({});};
  const rows=services.data?.items ?? [];
  return <div className="program-workspace" dir="rtl" role="region" aria-label="مدیریت خدمات و کاتالوگ"><div className="program-content">
    <header className="program-workspace-header"><div><span className="program-eyebrow">خدمات آمادهٔ آموزشی</span><h1>خدمات و کاتالوگ</h1><p>از منابع موجود شروع کنید؛ محتوا، مخاطب و تعرفهٔ هر خدمت را در یک جا مدیریت کنید.</p></div><button className="dashboard-button dashboard-button-primary" onClick={()=>setCreating(true)}><Plus size={18} aria-hidden="true"/>خدمت جدید</button></header>
    <nav className="program-section-nav program-main-nav" aria-label="بخش‌های خدمات">{[['services','خدمات'],['catalog','کاتالوگ منابع'],['categories','دسته‌بندی‌ها']].map(([value,label])=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</nav>
    {tab==='services'&&<section><div className="program-toolbar program-filter-grid">
      <label htmlFor="services-search">جست‌وجوی خدمت<input id="services-search" className="program-field" type="search" value={search} onChange={e=>filter(()=>setSearch(e.target.value))}/></label>
      <label htmlFor="services-state">وضعیت<select id="services-state" className="program-field" value={state} onChange={e=>filter(()=>setState(e.target.value as typeof state))}><option value="ACTIVE">فهرست جاری</option><option value="ARCHIVED">آرشیو</option><option value="ALL">همه</option></select></label>
      <label htmlFor="services-category">دسته‌بندی<select id="services-category" className="program-field" value={categoryId} onChange={e=>filter(()=>setCategoryId(e.target.value))}><option value="">همهٔ دسته‌ها</option>{categories.data?.items.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label htmlFor="services-audience">مخاطب<select id="services-audience" className="program-field" value={audience} onChange={e=>filter(()=>setAudience(e.target.value as typeof audience))}><option value="">همهٔ مخاطبان</option>{Object.entries(audienceLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div><ResourceMessage loading={services.loading} error={services.error} retry={services.refresh}/>
      {!!rows.length&&<><div className="program-selection-bar"><label className="program-check"><input type="checkbox" checked={rows.every(row=>!!selected[row.id])} onChange={e=>setSelected(e.target.checked?Object.fromEntries(rows.map(row=>[row.id,row])):{})}/>انتخاب این صفحه</label><span>{Object.keys(selected).length.toLocaleString('fa-IR')} انتخاب</span><button className="dashboard-button" disabled={!Object.keys(selected).length} onClick={()=>setBulk({mode:'pricing',services:Object.values(selected)})}>قیمت و تخفیف گروهی</button><button className="dashboard-button" disabled={!Object.keys(selected).length} onClick={()=>setBulk({mode:'publish',services:Object.values(selected)})}>انتشار گروهی</button></div>
      <div className="program-managed-list">{rows.map(row=>{const base=row.baseAmountRial,final=base?pricePreview(base,row.discountPercent,row.discountStartsAt,row.discountEndsAt):null;return <article className="program-managed-row" key={row.id}><label className="program-check"><input type="checkbox" aria-label={`انتخاب ${row.draft.title || 'خدمت'}`} checked={!!selected[row.id]} onChange={e=>setSelected(current=>{const next={...current};if(e.target.checked)next[row.id]=row;else delete next[row.id];return next;})}/></label><span className="program-card-icon">{row.archivedAt?<Archive size={20} aria-hidden="true"/>:<BookOpen size={20} aria-hidden="true"/>}</span><button type="button" className="program-row-title" onClick={()=>setEditing(row.id)}><strong>{row.draft.title || 'خدمت بدون عنوان'}</strong><small>{categories.data?.items.find(c=>c.id===row.categoryId)?.name || 'بدون دسته‌بندی'} · {audienceLabels[row.audience]}</small></button><div className="program-row-price">{base===null?<span>قیمت تعیین نشده</span>:<>{final!==base&&<><del>{formatRial(BigInt(base!))}</del><span className="program-discount-badge">{row.discountPercent.toLocaleString('fa-IR')}٪ تخفیف</span></>}<strong>{final==='0'?'رایگان':formatRial(BigInt(final!))}</strong>{row.discountPercent>0&&final===base&&<small>تخفیف اکنون فعال نیست</small>}</>}</div><span className="program-badge">{row.archivedAt?'آرشیو':row.publishedDefinitionId?'منتشرشده':'پیش‌نویس'}</span><button className="dashboard-button" onClick={()=>setEditing(row.id)}>مدیریت</button></article>;})}</div></>}
      {!services.loading&&!services.error&&!rows.length&&<div className="program-empty"><BookOpen size={28} aria-hidden="true"/><h2>{state==='ARCHIVED'?'آرشیو خالی است':'خدمتی پیدا نشد'}</h2><p>برای شروع، موارد کاتالوگ را انتخاب و به‌صورت گروهی وارد کنید.</p><button className="dashboard-button" onClick={()=>setTab('catalog')}>رفتن به کاتالوگ منابع</button></div>}
      {services.data&&<nav className="program-pagination" aria-label="صفحه‌های خدمات"><button className="dashboard-button" disabled={page===1} onClick={()=>{setPage(p=>p-1);setSelected({});}}>قبلی</button><span>صفحهٔ {page.toLocaleString('fa-IR')} · {services.data.total.toLocaleString('fa-IR')} خدمت</span><button className="dashboard-button" disabled={page*20>=services.data.total} onClick={()=>{setPage(p=>p+1);setSelected({});}}>بعدی</button></nav>}
    </section>}
    {tab==='catalog'&&<ProgramCatalogManager token={token} onChanged={changed} onOpen={setEditing}/>}
    {tab==='categories'&&<><ResourceMessage error={categories.error} loading={categories.loading} retry={categories.refresh}/>{categories.data&&<ProgramCategoryManager token={token} items={categories.data.items} onChanged={changed}/>}</>}
    {editing&&<ManagedProgramEditor token={token} id={editing} categories={categories.data?.items ?? []} doctor={doctor} onClose={()=>setEditing(null)} onChanged={changed}/>}
    {creating&&<CreateService token={token} onClose={()=>setCreating(false)} onCreated={id=>{setCreating(false);setEditing(id);changed();}}/>}
    {bulk&&<ProgramBulkPublication token={token} services={bulk.services} mode={bulk.mode} onClose={()=>setBulk(null)} onChanged={changed}/>}
  </div></div>;
}
function CreateService({token,onClose,onCreated}: {token:string;onClose:()=>void;onCreated:(id:string)=>void}) {
  const [title,setTitle]=useState(''),[programKey]=useState(()=>`MANUAL_${crypto.randomUUID().replaceAll('-','').toUpperCase()}`),command=useProgramCommand();
  return <ProgramModal title="خدمت آمادهٔ جدید" onClose={onClose} busy={command.busy} dirty={!!title}><form onSubmit={e=>{e.preventDefault();void command.run(async()=>{const row=await createManagedService(token,{programKey,locale:'fa-IR',draft:{title:title.trim(),audience:'REVIEW_REQUIRED',pairs:[]}});onCreated(row.id);});}}><label htmlFor="new-service-title">نام خدمت<input id="new-service-title" className="program-field" required maxLength={240} value={title} onChange={e=>setTitle(e.target.value)}/></label><p>اطلاعات محتوا و ایمنی را می‌توانید در پیش‌نویس کامل کنید؛ ساخت خدمت، فروش را فعال نمی‌کند.</p><button className="dashboard-button dashboard-button-primary" disabled={!title.trim()||command.busy}>ساخت پیش‌نویس</button>{command.notice&&<p role="status" className="program-notice">{command.notice}</p>}</form></ProgramModal>;
}
