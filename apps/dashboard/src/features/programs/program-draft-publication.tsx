'use client';
import { useState } from 'react';
import { applyDraftPublication, getManagedService, getPublicationSetup, previewDraftPublication, ProgramApiError, type DraftPublicationItem, type DraftPublicationResult, type ManagedService } from '@/lib/program-services-api';
import { formatRial, normalizeDigits } from '@/lib/wallet-money';
import { ProgramDiscountFields } from './program-discount-fields';
import { priceFromInput } from './program-price';
import { pricePreview, tehranInstant } from './program-schedule';
import { audienceLabels, temperamentCodes, ProgramModal, programError, useProgramCommand } from './program-management-shared';
import { ProgramMarkdown } from './program-markdown';
type Prepared=DraftPublicationResult & {previewId:string;body?:string};
export function ProgramDraftPublication({token,services,onClose,onChanged}:{token:string;services:ManagedService[];onClose:()=>void;onChanged:()=>void}){
  const [amount,setAmount]=useState(''),[percent,setPercent]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[items,setItems]=useState<Prepared[]>([]),[accepted,setAccepted]=useState(false),[results,setResults]=useState<Record<string,string>>({}),[progress,setProgress]=useState('');
  const command=useProgramCommand(),ready=items.filter(i=>i.ready),changed=()=>{setItems([]);setAccepted(false);setResults({});};
  const prepare=()=>void command.run(async()=>{
    const base=amount.trim()?priceFromInput(amount):null,pct=percent.trim()?Number(normalizeDigits(percent)):null;
    const from=pct&&start?tehranInstant(start):null,to=pct&&end?tehranInstant(end):null;
    if((amount.trim()&&base===null)||(pct!==null&&(!/^\d{1,3}$/.test(normalizeDigits(percent))||pct<0||pct>100))||(pct&&start&&!from)||(pct&&end&&!to)||(from&&to&&from>=to))throw new ProgramApiError(422,'PROGRAM_PRICING_INVALID');
    const requests:DraftPublicationItem[]=[],failures:Prepared[]=[],bodies:Record<string,string>={};
    setItems([]);setResults({});setAccepted(false);
    for(const selected of services){
      setProgress(`بررسی ${requests.length+failures.length+1} از ${services.length}`);
      try{
        const current=await getManagedService(token,selected.id);
        if(current.revision!==selected.revision||current.archivedAt)throw new ProgramApiError(409,'PROGRAM_SERVICE_CONFLICT');
        const latest=current.publishedDefinitionId?(await getPublicationSetup(token,current.publishedDefinitionId)).latestPublication:null;
        const price=base??current.baseAmountRial;if(price===null)throw new ProgramApiError(422,'PROGRAM_PRICING_INVALID');
        bodies[current.id]=current.draft.body??'';
        requests.push({serviceId:current.id,expectedRevision:current.revision,configuration:{amountRial:price,currency:'IRR',accessMode:latest?.accessMode??'PERPETUAL',accessDurationDays:latest?.accessDurationDays??null,quoteTtlSeconds:latest?.quoteTtlSeconds??1800,termsPolicyVersionId:latest?.accessMode==='DAYS'?latest.termsPolicyVersionId:undefined,retentionPolicyRef:latest?.retentionPolicyRef,discountPercent:pct??current.discountPercent,discountStartsAt:pct===null?current.discountStartsAt:from,discountEndsAt:pct===null?current.discountEndsAt:to}});
      }catch(error){failures.push({serviceId:selected.id,title:selected.draft.title??'خدمت',ready:false,code:programError(error),previewId:''});}
    }
    const prepared=[...failures];
    for(let i=0;i<requests.length;i+=10){const value=await previewDraftPublication(token,requests.slice(i,i+10));prepared.push(...value.items.map(item=>({...item,previewId:value.id,body:bodies[item.serviceId]})));}
    setItems(prepared);setProgress('');
  },'پیش‌نمایش آماده شد؛ متن، مشخصات و قیمت‌ها را پیش از انتشار بررسی کنید.');
  const apply=()=>void command.run(async()=>{
    for(const id of [...new Set(ready.map(i=>i.previewId))]){
      const value=await applyDraftPublication(token,id,ready.filter(i=>i.previewId===id).map(i=>i.serviceId));
      for(const item of value.items)setResults(current=>({...current,[item.serviceId]:item.published?'منتشر شد':'اطلاعات تغییر کرده یا پیش‌نیازها کامل نیست؛ پیش‌نمایش تازه بگیرید.'}));
    }
    onChanged();
  },'نتیجهٔ انتشار هر خدمت مشخص است. تلاش مجدد، انتشار ثبت‌شده را تکرار نمی‌کند.');
  return <ProgramModal title="انتشار گروهی پیش‌نویس‌ها" onClose={onClose} busy={command.busy} dirty={!!amount||!!percent||!!start||!!end}>
    <p>پیش‌نویس فعلی {services.length.toLocaleString('fa-IR')} خدمت بررسی می‌شود. ثبت نسخه و انتشار پس از تأیید شما انجام می‌شود.</p>
    <fieldset className="program-editor-form" disabled={command.busy}><label htmlFor="draft-bulk-price">قیمت پایهٔ مشترک، به تومان<input id="draft-bulk-price" className="program-field" inputMode="decimal" value={amount} maxLength={40} onChange={e=>{setAmount(e.target.value);changed();}}/><small>خالی یعنی حفظ قیمت هر خدمت.</small></label>
      <ProgramDiscountFields prefix="draft-bulk-discount" percent={percent} start={start} end={end} onPercent={v=>{setPercent(v);changed();}} onStart={v=>{setStart(v);changed();}} onEnd={v=>{setEnd(v);changed();}}/><p>درصد خالی یعنی حفظ تخفیف؛ صفر یعنی برداشتن آن.</p>
      <button className="dashboard-button" onClick={prepare}>بررسی و پیش‌نمایش گروه</button>
    </fieldset>
    {command.notice&&<p className="program-notice" role="status">{command.notice}</p>}{progress&&<p role="status">{progress}</p>}
    <div className="program-managed-list">{items.map(item=><article key={item.serviceId} className="program-import-item"><strong>{item.title||services.find(s=>s.id===item.serviceId)?.draft.title}</strong><p>{results[item.serviceId]??(item.ready?'آمادهٔ ثبت نسخه و انتشار':item.code==='PROGRAM_DRAFT_INCOMPLETE'?'نام، متن کامل یا دسته‌بندی مشخص نشده است.':item.code?.startsWith('PROGRAM_')?'اطلاعات تغییر کرده یا پیش‌نیاز انتشار کامل نیست.':item.code)}</p>{item.ready&&<p>{item.category} · {audienceLabels[item.audience as keyof typeof audienceLabels]??'مشترک'} · {item.contentChanged?'محتوای تازه نسبت به نسخهٔ منتشرشده':'محتوای منتشرشده حفظ می‌شود'}</p>}{item.ready&&<p>{item.pairs?.length?item.pairs.map(pair=>pair.split('/').map(code=>temperamentCodes.find(([value])=>value===code)?.[1]??code).join(' سپس ')).join('، '):'فقط فهرست عمومی؛ بدون پیشنهاد مزاجی'}</p>}{item.configuration&&<p>قیمت اصلی: {formatRial(BigInt(item.configuration.amountRial))} · قیمت اکنون: {formatRial(BigInt(pricePreview(item.configuration.amountRial,item.configuration.discountPercent??0,item.configuration.discountStartsAt,item.configuration.discountEndsAt)))}</p>}{item.ready&&<details><summary>بررسی متن نسخه و شرایط خرید</summary>{item.summary&&<p>{item.summary}</p>}<ProgramMarkdown body={item.body ?? ''} /><ProgramMarkdown body={item.termsBody ?? ''} /></details>}</article>)}</div>
    {!!ready.length&&<><label className="program-check"><input type="checkbox" checked={accepted} disabled={command.busy} onChange={e=>setAccepted(e.target.checked)}/>نسخهٔ فعلی محتوا، قیمت‌ها، تخفیف‌ها و شرایط خرید را بررسی کرده‌ام.</label><button className="dashboard-button dashboard-button-primary" disabled={!accepted||command.busy} onClick={apply}>ثبت نسخه و انتشار {ready.length.toLocaleString('fa-IR')} خدمت</button></>}
  </ProgramModal>;
}
