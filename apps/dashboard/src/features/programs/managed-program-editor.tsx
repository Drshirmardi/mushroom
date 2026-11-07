'use client';
import { useCallback, useState } from 'react';
import { approveDefinition, archiveManagedService, getManagedService, getServiceVersion, listServiceVersions, restoreManagedService, saveManagedDraft, submitManagedDraft, type ManagedService, type ProgramCategory, type WorkingDraft, type Definition } from '@/lib/program-services-api';
import { Publication } from './program-publication';
import { audienceLabels, ProgramModal, ResourceMessage, temperamentCodes, useProgramCommand, useProgramResource } from './program-management-shared';

export function ManagedProgramEditor({token,id,categories,doctor,onClose,onChanged}: {token:string;id:string;categories:ProgramCategory[];doctor:boolean;onClose:()=>void;onChanged:()=>void}) {
  const resource=useProgramResource(useCallback(()=>getManagedService(token,id),[token,id]));
  if(!resource.data) return <ProgramModal title="دریافت خدمت" onClose={onClose}><ResourceMessage error={resource.error} loading={resource.loading} retry={resource.refresh}/></ProgramModal>;
  return <Editor key={`${id}:${resource.data.revision}`} initial={resource.data} token={token} categories={categories} doctor={doctor} onClose={onClose} onChanged={onChanged} onReload={resource.refresh}/>;
}
function Editor({initial,token,categories,doctor,onClose,onChanged,onReload}: {initial:ManagedService;token:string;categories:ProgramCategory[];doctor:boolean;onClose:()=>void;onChanged:()=>void;onReload:()=>void}) {
  const [service,setService]=useState(initial), [form,setForm]=useState<WorkingDraft>({...initial.draft,audience:initial.draft.audience ?? initial.audience}), [categoryId,setCategoryId]=useState(initial.categoryId ?? '');
  const [dirty,setDirty]=useState(false), [tab,setTab]=useState('content'), [selected,setSelected]=useState(''), [reviewed,setReviewed]=useState(false), [localDefinition,setLocalDefinition]=useState<Definition|null>(null);
  const command=useProgramCommand();
  const [versionPage,setVersionPage]=useState(1);
  const versions=useProgramResource(useCallback(async()=>{
    const page=await listServiceVersions(token,initial.programKey,versionPage);
    if(initial.publishedDefinitionId && !page.items.some(v=>v.id===initial.publishedDefinitionId)) return {...page,items:[await getServiceVersion(token,initial.publishedDefinitionId),...page.items]};
    return page;
  },[token,initial.programKey,initial.publishedDefinitionId,versionPage]));
  const items=versions.data?.items.filter(v=>v.locale===service.locale) ?? [];
  const allVersions=localDefinition ? [localDefinition,...items.filter(v=>v.id!==localDefinition.id)] : items;
  const version=allVersions.find(v=>v.id===selected) ?? allVersions.find(v=>v.id===service.publishedDefinitionId) ?? allVersions[0];
  const change=(patch:Partial<WorkingDraft>)=>{setForm(v=>({...v,...patch}));setDirty(true);};
  const save=async()=>{
    const value=await saveManagedDraft(token,service.id,{expectedRevision:service.revision,categoryId:categoryId || null,draft:{...form,safety:{...form.safety,contraindications:(form.safety?.contraindications ?? []).map(v=>v.trim()).filter(Boolean)}}});
    setService(value);setForm(value.draft);setDirty(false);onChanged();return value;
  };
  const field=(name:'title'|'summary'|'body'|'eligibilityDescription',label:string,max:number,rows=1)=><label htmlFor={`service-${name}`}>{label}{rows===1 ? <input id={`service-${name}`} className="program-field" maxLength={max} value={form[name] ?? ''} onChange={e=>change({[name]:e.target.value})}/> : <textarea id={`service-${name}`} className="program-field" rows={rows} maxLength={max} value={form[name] ?? ''} onChange={e=>change({[name]:e.target.value})}/>}</label>;
  const safetyField=(name:'intendedAudience'|'limitations'|'seekProfessionalCare',label:string,max:number)=><label htmlFor={`safety-${name}`}>{label}<textarea id={`safety-${name}`} className="program-field" rows={3} maxLength={max} value={form.safety?.[name] ?? ''} onChange={e=>change({safety:{...form.safety,[name]:e.target.value}})}/></label>;
  return <ProgramModal title={form.title || 'ویرایش خدمت'} onClose={onClose} busy={command.busy} dirty={dirty}>
    <nav className="program-section-nav" aria-label="بخش‌های ویرایش خدمت">{[['content','محتوا و مخاطب'],['review','بررسی و نسخه‌ها'],['price','قیمت و تخفیف']].map(([value,label])=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</nav>
    {command.notice && <p className="program-notice" role="status">{command.notice}</p>}
    {service.archivedAt && <p className="program-notice">این خدمت آرشیو است. محتوای منتشرشده همچنان برای خریداران قبلی قابل دسترسی است.</p>}
    <div hidden={tab!=='content'}>
      <form onSubmit={e=>{e.preventDefault();void command.run(save,'پیش‌نویس ذخیره شد.');}}><fieldset disabled={command.busy} className="program-editor-form">
        <section className="program-form-section"><h3>معرفی خدمت</h3>{field('title','نام خدمت',240)}{field('summary','معرفی پیش از خرید',2000,3)}
          <div className="program-form-grid"><label htmlFor="service-category">دسته‌بندی<select id="service-category" className="program-field" value={categoryId} onChange={e=>{setCategoryId(e.target.value);change({category:categories.find(c=>c.id===e.target.value)?.name ?? ''});}}><option value="">بدون دسته‌بندی</option>{categories.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label htmlFor="service-audience">مخاطب<select id="service-audience" className="program-field" value={form.audience ?? 'REVIEW_REQUIRED'} onChange={e=>change({audience:e.target.value as WorkingDraft['audience']})}>{Object.entries(audienceLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><small>مخاطب روی پیشنهادها اثر دارد و خرید را محدود نمی‌کند.</small></label></div>
        </section>
        <section className="program-form-section"><h3>محتوای خدمت</h3>{field('body','متن کامل پس از خرید',100000,12)}<p>خریداران قبلی پس از تأیید و انتشار نسخهٔ تازه، محتوای جدید را می‌بینند.</p></section>
        <section className="program-form-section"><h3>پیشنهاد بر اساس مزاج</h3><p>مزاج اول و دوم ترتیب دارند. برای مزاج تک‌بعدی، هر دو یکسان‌اند.</p><div className="program-pair-grid">{temperamentCodes.flatMap(([a,first])=>temperamentCodes.map(([b,second])=>{const pair=`${a}/${b}`;return <label key={pair}><input type="checkbox" checked={form.pairs?.includes(pair) ?? false} onChange={e=>change({pairs:e.target.checked?[...(form.pairs ?? []),pair]:(form.pairs ?? []).filter(p=>p!==pair)})}/><span>{first}<small>سپس {second}</small></span></label>;}))}</div></section>
        <section className="program-form-section"><h3>اطلاعات بازبینی پزشکی</h3><p>خالی‌بودن این بخش در پیش‌نویس مجاز است؛ ارسال برای تأیید به تکمیل آن نیاز دارد.</p>{field('eligibilityDescription','شرایط استفاده',4000,3)}<div className="program-form-grid">{safetyField('intendedAudience','شرح مخاطبان محتوا',1000)}{safetyField('limitations','محدودیت‌ها',4000)}{safetyField('seekProfessionalCare','راهنمای مراجعه به متخصص',2000)}<label htmlFor="service-contraindications">موارد منع استفاده، هر مورد در یک خط<textarea id="service-contraindications" className="program-field" rows={3} value={form.safety?.contraindications?.join('\n') ?? ''} onChange={e=>change({safety:{...form.safety,contraindications:e.target.value.split('\n')}})}/></label></div></section>
        <footer className="program-form-footer"><button type="submit" className="dashboard-button dashboard-button-primary">{command.busy?'در حال ذخیره…':'ذخیرهٔ پیش‌نویس'}</button><button type="button" className="dashboard-button" onClick={()=>void command.run(async()=>{const saved=dirty?await save():service;const next=await submitManagedDraft(token,saved.id,saved.revision);setLocalDefinition(next);setSelected(next.id);setReviewed(false);versions.refresh();setTab('review');},'نسخه برای بررسی پزشک ثبت شد.')}>ذخیره و ارسال برای بررسی</button></footer>
      </fieldset></form>
    </div>
    <section hidden={tab!=='review'} className="program-read-content"><h3>نسخه‌های ثبت‌شده</h3><ResourceMessage error={versions.error} loading={versions.loading} retry={versions.refresh}/>
      {!!allVersions.length && <label htmlFor="service-version">انتخاب نسخه<select id="service-version" className="program-field" value={version?.id ?? ''} onChange={e=>{setSelected(e.target.value);setReviewed(false);}}>{allVersions.map(v=><option key={v.id} value={v.id}>نسخهٔ {v.versionNumber.toLocaleString('fa-IR')} · {v.status==='APPROVED'?'تأییدشده':v.status==='DRAFT'?'منتظر بررسی':'لغوشده'}</option>)}</select></label>}
      {!versions.loading && !allVersions.length && <p>هنوز نسخه‌ای برای بازبینی ثبت نشده است. پیش‌نویس را کامل و برای بررسی ارسال کنید.</p>}
      {version && <><details><summary>مشاهدهٔ متن و ایمنی نسخهٔ انتخاب‌شده</summary><p className="program-full-body">{version.body}</p><h3>محدودیت‌ها</h3><p>{version.safety.limitations}</p><h3>مراجعه به متخصص</h3><p>{version.safety.seekProfessionalCare}</p><p>{version.safety.contraindications.join('، ')}</p></details>
      {doctor && version.status==='DRAFT' ? <><label className="program-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>متن و موارد ایمنی این نسخه را بررسی و تأیید می‌کنم.</label><button className="dashboard-button dashboard-button-primary" disabled={!reviewed || command.busy} onClick={()=>void command.run(async()=>{const value=await approveDefinition(token,version);setLocalDefinition(value);versions.refresh();setReviewed(false);},'نسخه با اختیار پزشک تأیید شد.')}>تأیید نسخه با اختیار پزشک</button></> : version.status==='DRAFT' && <p>تأیید این نسخه باید توسط پزشک دارای دسترسی انجام شود.</p>}</>}
      {(versions.data?.total ?? 0)>50 && <nav className="program-pagination" aria-label="صفحه‌های نسخه‌ها"><button className="dashboard-button" disabled={versionPage===1||versions.loading} onClick={()=>{setSelected('');setVersionPage(p=>p-1);}}>نسخه‌های جدیدتر</button><span>صفحهٔ {versionPage.toLocaleString('fa-IR')}</span><button className="dashboard-button" disabled={versionPage*50>=(versions.data?.total ?? 0)||versions.loading} onClick={()=>{setSelected('');setVersionPage(p=>p+1);}}>نسخه‌های قدیمی‌تر</button></nav>}
    </section>
    <section hidden={tab!=='price'}>{dirty ? <p className="program-notice">ابتدا تغییرات پیش‌نویس را ذخیره کنید.</p> : version ? <><p>انتشار برای نسخهٔ {version.versionNumber.toLocaleString('fa-IR')} انجام می‌شود. تنها نسخهٔ دارای تأیید معتبر قابل انتشار است.</p><Publication key={`${version.id}:${version.status}`} token={token} item={version} preset={service} onPublished={()=>{onChanged();onClose();}}/></> : <p className="program-empty">ابتدا یک نسخهٔ کامل برای بررسی پزشک ثبت کنید.</p>}</section>
    <footer className="program-editor-actions"><button className="dashboard-button" disabled={command.busy} onClick={()=>{if(!dirty || window.confirm('نوشته‌های ذخیره‌نشده با اطلاعات تازه جایگزین شوند؟')) onReload();}}>دریافت اطلاعات تازه</button>
      <button className="dashboard-button" disabled={command.busy} onClick={()=>{if(!window.confirm(service.archivedAt?'خدمت به فهرست مدیریت برگردد؟ فروش تا انتشار مجدد غیرفعال می‌ماند.':'خدمت از فروش و پیشنهادهای فعال خارج شود؟ دسترسی خریداران قبلی حفظ می‌شود.')) return;void command.run(async()=>{if(service.archivedAt) await restoreManagedService(token,service.id,service.revision);else await archiveManagedService(token,service.id,service.revision);onChanged();onClose();});}}>{service.archivedAt?'بازیابی از آرشیو':'آرشیو خدمت'}</button>
    </footer>
  </ProgramModal>;
}
