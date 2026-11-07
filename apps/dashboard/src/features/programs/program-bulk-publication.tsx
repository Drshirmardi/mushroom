'use client';
import { useState } from 'react';
import { getManagedService, getPublicationSetup, getServiceVersion, listServiceVersions, previewProgramBatch, publishProgramBatch, ProgramApiError, type Commercial, type ManagedService, type Preview } from '@/lib/program-services-api';
import { formatRial, normalizeDigits } from '@/lib/wallet-money';
import { ProgramDiscountFields } from './program-discount-fields';
import { priceFromInput } from './program-price';
import { pricePreview, tehranInstant } from './program-schedule';
import { ProgramModal, programError, useProgramCommand } from './program-management-shared';

type Prepared = { service:ManagedService; configuration?:Commercial; preview?:Preview; error?:string; key:string };
export function ProgramBulkPublication({token,services,mode,onClose,onChanged}: {token:string;services:ManagedService[];mode:'publish'|'pricing';onClose:()=>void;onChanged:()=>void}) {
  const [amount,setAmount]=useState(''),[percent,setPercent]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[prepared,setPrepared]=useState<Prepared[]>([]),[accepted,setAccepted]=useState(false),[results,setResults]=useState<Record<string,string>>({}),[progress,setProgress]=useState('');
  const command=useProgramCommand(), ready=prepared.filter(p=>p.preview?.configurationReady&&p.preview.publicationHash);
  const changed=()=>{setPrepared([]);setAccepted(false);setResults({});};
  const prepare=()=>void command.run(async()=>{
    const base=amount.trim()?priceFromInput(amount):null,pct=percent.trim()?Number(normalizeDigits(percent)):null;
    const from=pct&&start?tehranInstant(start):null,to=pct&&end?tehranInstant(end):null;
    if((amount.trim()&&base===null)||(pct!==null&&(!/^\d{1,3}$/.test(normalizeDigits(percent))||!Number.isInteger(pct)||pct<0||pct>100))||(pct&&start&&!from)||(pct&&end&&!to)||(from&&to&&from>=to)) throw new ProgramApiError(422,'PROGRAM_PRICING_INVALID');
    setResults({});setAccepted(false);const items:Prepared[]=[];
    for(const selected of services){
      setProgress(`بررسی ${items.length+1} از ${services.length}`);
      try {
        const current=await getManagedService(token,selected.id);
        if(current.revision!==selected.revision || current.archivedAt) {items.push({service:selected,error:'خدمت تغییر کرده یا آرشیو شده است؛ فهرست را تازه کنید.',key:crypto.randomUUID()});continue;}
        const versions=await listServiceVersions(token,current.programKey), matches=versions.items.filter(v=>v.locale===current.locale);
        const definition=mode==='pricing'&&current.publishedDefinitionId?matches.find(v=>v.id===current.publishedDefinitionId) ?? await getServiceVersion(token,current.publishedDefinitionId):matches[0];
        if(!definition || definition.status!=='APPROVED' || !definition.usable){items.push({service:current,error:'نسخهٔ انتخاب‌شده هنوز تأیید معتبر پزشک ندارد.',key:crypto.randomUUID()});continue;}
        const setup=await getPublicationSetup(token,definition.id), latest=setup.latestPublication, price=base ?? current.baseAmountRial;
        if(price===null){items.push({service:current,error:'ابتدا قیمت این خدمت را مشخص کنید.',key:crypto.randomUUID()});continue;}
        const configuration:Commercial={programDefinitionId:definition.id,expectedServiceRevision:current.revision,amountRial:price,currency:'IRR',accessMode:latest?.accessMode ?? 'PERPETUAL',accessDurationDays:latest?.accessDurationDays ?? null,quoteTtlSeconds:latest?.quoteTtlSeconds ?? 1800,termsPolicyVersionId:latest?.accessMode==='DAYS'?latest.termsPolicyVersionId:undefined,retentionPolicyRef:latest?.retentionPolicyRef,discountPercent:pct ?? current.discountPercent,discountStartsAt:pct===null?current.discountStartsAt:from,discountEndsAt:pct===null?current.discountEndsAt:to};
        items.push({service:current,configuration,key:crypto.randomUUID()});
      } catch(error){items.push({service:selected,error:programError(error),key:crypto.randomUUID()});}
    }
    const candidates=items.filter(i=>i.configuration);
    for(let i=0;i<candidates.length;i+=10){const group=candidates.slice(i,i+10),value=await previewProgramBatch(token,group.map(p=>p.configuration!));for(const result of value.items){const item=group.find(p=>p.configuration!.programDefinitionId===result.programDefinitionId)!;item.preview=result.preview;if(result.code || !result.preview?.configurationReady)item.error='پیش‌نیاز انتشار کامل نیست یا اطلاعات تغییر کرده است.';}}
    setPrepared(items);setProgress('');
  },'پیش‌نمایش گروه آماده شد.');
  const apply=()=>void command.run(async()=>{
    for(let i=0;i<ready.length;i+=10){const group=ready.slice(i,i+10),value=await publishProgramBatch(token,group.map(p=>({key:p.key,configuration:{...p.configuration!,publicationHash:p.preview!.publicationHash!,expectedPublicationNumber:p.preview!.expectedPublicationNumber,reviewedTermsAndRetention:true}})));
      for(const result of value.items){const item=group.find(p=>p.configuration!.programDefinitionId===result.programDefinitionId)!;setResults(current=>({...current,[item.service.id]:result.publication?'منتشر شد':'اطلاعات یا تأیید تغییر کرده است؛ پیش‌نمایش تازه بگیرید.'}));}setProgress(`پردازش ${Math.min(i+10,ready.length)} از ${ready.length}`);
    }
    setProgress('');onChanged();
  },'عملیات گروهی انجام شد. نتیجهٔ هر خدمت را بررسی کنید.');
  return <ProgramModal title={mode==='pricing'?'قیمت و تخفیف گروهی':'انتشار گروهی'} onClose={onClose} busy={command.busy}>
    <p>{services.length.toLocaleString('fa-IR')} خدمت انتخاب شده است. فقط موارد دارای تأیید معتبر منتشر می‌شوند.</p>
    <fieldset disabled={command.busy} className="program-editor-form"><label htmlFor="bulk-price">قیمت پایهٔ مشترک، به تومان<input id="bulk-price" className="program-field" inputMode="decimal" value={amount} maxLength={40} onChange={e=>{setAmount(e.target.value);changed();}}/><small>خالی یعنی حفظ قیمت هر خدمت؛ صفر یعنی رایگان.</small></label>
      <ProgramDiscountFields prefix="bulk-discount" percent={percent} start={start} end={end} onPercent={v=>{setPercent(v);changed();}} onStart={v=>{setStart(v);changed();}} onEnd={v=>{setEnd(v);changed();}}/><p>درصد خالی یعنی حفظ تخفیف و زمان‌بندی هر خدمت. با صفر، تخفیف برداشته می‌شود.</p>
      <button className="dashboard-button" onClick={prepare}>بررسی و پیش‌نمایش گروه</button>
    </fieldset>
    {command.notice && <p className="program-notice" role="status">{command.notice}</p>}{progress&&<p role="status">{progress}</p>}
    {!!prepared.length&&<><div className="program-managed-list">{prepared.map(item=><article className="program-import-item" key={item.service.id}><strong>{item.service.draft.title ?? 'خدمت بدون عنوان'}</strong><p>{results[item.service.id] ?? item.error ?? 'آمادهٔ انتشار'}</p>{item.configuration&&<p>قیمت اصلی: {formatRial(BigInt(item.configuration.amountRial))} · قیمت اکنون: {formatRial(BigInt(pricePreview(item.configuration.amountRial,item.configuration.discountPercent ?? 0,item.configuration.discountStartsAt,item.configuration.discountEndsAt)))}</p>}{item.preview?.termsPolicy&&<details><summary>شرایط خرید این خدمت</summary><p className="program-full-body">{item.preview.termsPolicy.body}</p></details>}</article>)}</div>
    <label className="program-check"><input type="checkbox" checked={accepted} disabled={command.busy} onChange={e=>setAccepted(e.target.checked)}/>قیمت‌ها، تخفیف‌ها و شرایط خرید موارد آماده را بررسی کرده‌ام.</label>
    <button className="dashboard-button dashboard-button-primary" disabled={!accepted||command.busy||!ready.length} onClick={apply}>انتشار {ready.length.toLocaleString('fa-IR')} مورد آماده</button></>}
  </ProgramModal>;
}
