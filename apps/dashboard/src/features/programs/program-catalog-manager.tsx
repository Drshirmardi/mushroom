'use client';
import { useCallback, useState } from 'react';
import { applyProgramImport, getManagedService, type ManagedService, listProgramCatalog, previewProgramImport, type ImportApplyItem, type ImportItem, type ImportResult } from '@/lib/program-services-api';
import { audienceLabels, temperamentCodes, ResourceMessage, useProgramCommand, useProgramResource } from './program-management-shared';
import { formatRial } from '@/lib/wallet-money';
import { ProgramMarkdown } from './program-markdown';

const states:Record<string,string>={NEW:'جدید',CHANGED:'تغییر منبع',UNCHANGED:'بدون تغییر',CONFLICT:'نیازمند انتخاب',ARCHIVED:'آرشیوشده',INVALID:'نیازمند اصلاح منبع',APPLIED:'وارد شد',SKIPPED:'کنار گذاشته شد'};
const fieldLabels:Record<string,string>={title:'عنوان',summary:'معرفی',body:'متن کامل',safety:'اطلاعات ایمنی',eligibilityDescription:'شرایط استفاده',category:'دسته‌بندی',audience:'مخاطب',pairs:'مزاج اول و دوم'};
function displayMetadata(field:string,value:unknown){if(field==='audience')return audienceLabels[value as keyof typeof audienceLabels] ?? 'تعیین نشده';if(field==='pairs'&&Array.isArray(value))return value.length?value.map(pair=>String(pair).split('/').map(code=>temperamentCodes.find(([key])=>key===code)?.[1]??code).join(' سپس ')).join('، '):'بدون پیشنهاد مزاجی';return JSON.stringify(value,null,2);}
function ImportValue({field,value}:{field:string;value:unknown}){if(field==='body'&&typeof value==='string')return <ProgramMarkdown body={value}/>;return <pre className="program-full-body">{field!=='audience'&&typeof value==='string'?value:displayMetadata(field,value)}</pre>;}

type Item=ImportItem & {previewId:string};
export function ProgramCatalogManager({token,onChanged,onOpen,onPublish}: {token:string;onChanged:()=>void;onOpen:(id:string)=>void;onPublish:(services:ManagedService[])=>void}) {
  const list=useProgramResource(useCallback(()=>listProgramCatalog(token),[token])),command=useProgramCommand();
  const [query,setQuery]=useState(''),[selected,setSelected]=useState<string[]>([]),[preview,setPreview]=useState<Item[]>([]),[resolutions,setResolutions]=useState<Record<string,Record<string,'SOURCE'|'DASHBOARD'>>>({}),[results,setResults]=useState<Record<string,ImportResult>>({}),[progress,setProgress]=useState('');
  const visible=list.data?.items.filter(item=>`${item.title} ${item.category}`.includes(query)) ?? [];
  const eligible=preview.filter(item=>!['ARCHIVED','INVALID'].includes(item.state));
  const unresolved=eligible.some(item=>item.conflicts.some(field=>!resolutions[item.key]?.[field]));
  const prepare=()=>void command.run(async()=>{
    const items:Item[]=[];setPreview([]);setResults({});setResolutions({});
    for(let i=0;i<selected.length;i+=50){setProgress(`بررسی ${Math.min(i+50,selected.length).toLocaleString('fa-IR')} از ${selected.length.toLocaleString('fa-IR')} سند`);const value=await previewProgramImport(token,selected.slice(i,i+50));items.push(...value.items.map(item=>({...item,previewId:value.id})));}
    setPreview(items);setProgress('');
  },'پیش‌نمایش آماده است. تغییرات را بررسی کنید.');
  const apply=()=>void command.run(async()=>{
    let completed=0;
    for(const id of [...new Set(eligible.map(item=>item.previewId))]){
      const items=eligible.filter(item=>item.previewId===id);
      for(let i=0;i<items.length;i+=10){
        const body:ImportApplyItem[]=items.slice(i,i+10).map(item=>({key:item.key,resolutions:Object.entries(resolutions[item.key] ?? {}).map(([field,choice])=>({field:field as NonNullable<ImportApplyItem['resolutions']>[number]['field'],choice}))}));
        const value=await applyProgramImport(token,id,body);setResults(current=>({...current,...Object.fromEntries(value.items.map(item=>[item.key,item]))}));completed+=body.length;setProgress(`پردازش ${completed.toLocaleString('fa-IR')} از ${eligible.length.toLocaleString('fa-IR')} مورد`);
      }
    }
    setProgress('');onChanged();
  },'ورود انجام شد. نتیجهٔ هر مورد در فهرست مشخص است؛ موارد دارای تعارض به پیش‌نمایش تازه نیاز دارند.');
  return <section><div className="program-list-heading"><h2>کاتالوگ منابع</h2><p>اسناد ابتدا به پیش‌نویس وارد می‌شوند؛ فروش به ثبت نسخه و انتشار جداگانه نیاز دارد.</p></div><ResourceMessage loading={list.loading} error={list.error} retry={list.refresh}/>
    {list.data && <><div className="program-toolbar"><label htmlFor="catalog-search">جست‌وجوی منبع<input id="catalog-search" className="program-field" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="dashboard-button" disabled={command.busy} onClick={()=>{setSelected(visible.filter(i=>!i.invalidReason && i.catalogRole!=='REFERENCE').map(i=>i.key));setPreview([]);}}>انتخاب همهٔ نتایج</button><button className="dashboard-button" disabled={command.busy} onClick={()=>{setSelected([]);setPreview([]);}}>پاک‌کردن انتخاب</button><button className="dashboard-button dashboard-button-primary" disabled={!selected.length||command.busy} onClick={prepare}>پیش‌نمایش ورود ({selected.length.toLocaleString('fa-IR')})</button></div>
    <div className="program-managed-list">{visible.map(item=><label className="program-catalog-row" key={item.key}><input type="checkbox" disabled={command.busy||!!item.invalidReason||item.catalogRole==='REFERENCE'} checked={selected.includes(item.key)} onChange={e=>{setSelected(current=>e.target.checked?[...current,item.key]:current.filter(key=>key!==item.key));setPreview([]);}}/><span className="program-row-copy"><strong>{item.title}</strong><small>{item.category} · {audienceLabels[item.audience]} · {/^\d+$/.test(item.baseAmountRial)?formatRial(BigInt(item.baseAmountRial)):'قیمت نیازمند اصلاح'}</small>{item.invalidReason && <small>فایل منبع یا مشخصات آن نیازمند اصلاح است.</small>}</span><span className="program-badge">{item.catalogRole==='REFERENCE'?'سند مرجع؛ غیرقابل فروش':'خدمت آماده'}</span></label>)}</div></>}
    {command.notice && <p className="program-notice" role="status">{command.notice}</p>}{progress && <p role="status">{progress}</p>}
    {!!preview.length && <section className="program-import-preview"><h3>پیش‌نمایش تغییرات</h3><p>قیمت، تخفیف و آرشیو موجود در ورود معمولی تغییر نمی‌کنند. برای تعارض‌ها، منبع یا ویرایش داشبورد را انتخاب کنید.</p>
      {preview.map(item=>{const result=results[item.key];return <article className="program-import-item" key={item.key}><header><strong>{item.incoming?.title ?? item.current?.title ?? 'منبع در دسترس نیست'}</strong><span className="program-badge">{states[result?.state ?? item.state] ?? item.state}</span></header>{item.invalidReason && <p>فایل منبع یا مشخصات آن را بررسی و اصلاح کنید.</p>}{result?.code && <p>{result.code==='PROGRAM_ARCHIVED'?'این خدمت در آرشیو باقی ماند.':'اطلاعات تغییر کرده یا نیازمند اصلاح است؛ پیش‌نمایش تازه بگیرید.'}</p>}
      {item.conflicts.map(field=><div key={field}><label htmlFor={`resolve-${item.key}-${field}`}>{fieldLabels[field] ?? field}<select id={`resolve-${item.key}-${field}`} className="program-field" disabled={command.busy||!!result?.serviceId} value={resolutions[item.key]?.[field] ?? ''} onChange={e=>setResolutions(current=>({...current,[item.key]:{...current[item.key],[field]:e.target.value as 'SOURCE'|'DASHBOARD'}}))}><option value="">انتخاب کنید</option><option value="DASHBOARD">حفظ ویرایش داشبورد</option><option value="SOURCE">استفاده از منبع تازه</option></select></label><details><summary>مقایسهٔ دو مقدار</summary><h4>داشبورد</h4><ImportValue field={field} value={item.current?.[field as keyof NonNullable<Item['current']>]}/><h4>منبع</h4><ImportValue field={field} value={item.incoming?.[field as keyof NonNullable<Item['incoming']>]}/></details></div>)}
      {result?.serviceId && <button className="dashboard-button" onClick={()=>onOpen(result.serviceId!)}>باز کردن خدمت</button>}</article>;})}
      <button className="dashboard-button dashboard-button-primary" disabled={command.busy||unresolved||!eligible.length} onClick={apply}>{command.busy?'در حال پردازش…':'اعمال موارد معتبر'}</button><button className="dashboard-button" disabled={command.busy} onClick={prepare}>پیش‌نمایش تازه</button>
      {Object.values(results).some(r=>r.serviceId && ['APPLIED','UNCHANGED'].includes(r.state)) && <button className="dashboard-button dashboard-button-primary" disabled={command.busy} onClick={()=>void command.run(async()=>{const ids=[...new Set(Object.values(results).filter(r=>r.serviceId && ['APPLIED','UNCHANGED'].includes(r.state)).map(r=>r.serviceId!))];const services=[];for(const id of ids)services.push(await getManagedService(token,id));onPublish(services);})}>پیش‌نمایش انتشار خدمات واردشده</button>}
    </section>}
  </section>;
}
