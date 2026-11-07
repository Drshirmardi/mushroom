'use client';
import { useState } from 'react';
import { createProgramCategory, saveProgramCategory, type ProgramCategory } from '@/lib/program-services-api';
import { useProgramCommand } from './program-management-shared';

export function ProgramCategoryManager({token,items,onChanged}: {token:string;items:ProgramCategory[];onChanged:()=>void}) {
  const [name,setName]=useState(''), [key,setKey]=useState(()=>`CAT_${crypto.randomUUID().replaceAll('-','')}`), command=useProgramCommand();
  return <section><div className="program-list-heading"><h2>دسته‌بندی خدمات</h2><p>نام دسته را تغییر دهید یا خدمات آن را به دستهٔ دیگری منتقل کنید.</p></div>
    <form className="program-toolbar" onSubmit={e=>{e.preventDefault();void command.run(async()=>{await createProgramCategory(token,name.trim(),key);setName('');setKey(`CAT_${crypto.randomUUID().replaceAll('-','')}`);onChanged();},'دسته‌بندی ساخته شد.');}}><label htmlFor="program-new-category">دسته‌بندی تازه<input id="program-new-category" className="program-field" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><button className="dashboard-button dashboard-button-primary" disabled={command.busy || !name.trim()}>ایجاد دسته‌بندی</button></form>
    {command.notice && <p role="status" className="program-notice">{command.notice}</p>}
    <div className="program-managed-list">{items.map(item=><CategoryRow key={`${item.id}:${item.revision}`} item={item} items={items} token={token} onChanged={onChanged}/>)}</div>
    {!items.length && <p className="program-empty">هنوز دسته‌بندی‌ای ایجاد نشده است.</p>}
  </section>;
}
function CategoryRow({item,items,token,onChanged}: {item:ProgramCategory;items:ProgramCategory[];token:string;onChanged:()=>void}) {
  const [name,setName]=useState(item.name), [active,setActive]=useState(item.active), [target,setTarget]=useState(''), command=useProgramCommand();
  return <form className="program-category-row" onSubmit={e=>{e.preventDefault();void command.run(async()=>{await saveProgramCategory(token,item.id,{expectedRevision:item.revision,name:name.trim(),active,...(!active && target ? {reassignToId:target} : {})});onChanged();},'دسته‌بندی ذخیره شد.');}}>
    <label htmlFor={`category-${item.id}`}>نام دسته<input id={`category-${item.id}`} className="program-field" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label className="program-check"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>فعال</label>
    {!active && <label htmlFor={`target-${item.id}`}>انتقال خدمات به<select id={`target-${item.id}`} className="program-field" value={target} onChange={e=>setTarget(e.target.value)}><option value="">اگر دسته خدمت دارد، مقصد را انتخاب کنید</option>{items.filter(c=>c.id!==item.id&&c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    <button className="dashboard-button" disabled={command.busy || !name.trim()}>ذخیرهٔ دسته</button>{command.notice && <p role="status">{command.notice}</p>}
  </form>;
}
