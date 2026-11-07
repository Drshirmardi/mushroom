'use client';
export function ProgramDiscountFields({prefix,percent,start,end,onPercent,onStart,onEnd}: {prefix:string;percent:string;start:string;end:string;onPercent:(value:string)=>void;onStart:(value:string)=>void;onEnd:(value:string)=>void}) {
  return <div className="program-form-grid">
    <label htmlFor={`${prefix}-percent`}>درصد تخفیف<input id={`${prefix}-percent`} className="program-field" inputMode="numeric" maxLength={3} value={percent} onChange={e=>onPercent(e.target.value)}/><small>از صفر تا ۱۰۰؛ صفر یعنی بدون تخفیف.</small></label>
    <div className="program-form-grid">
      <label htmlFor={`${prefix}-start`}>شروع تخفیف، به وقت تهران<input id={`${prefix}-start`} className="program-field" type="datetime-local" value={start} onChange={e=>onStart(e.target.value)}/><small>خالی یعنی فعال‌سازی فوری پس از انتشار.</small></label>
      <label htmlFor={`${prefix}-end`}>پایان تخفیف، به وقت تهران<input id={`${prefix}-end`} className="program-field" type="datetime-local" value={end} onChange={e=>onEnd(e.target.value)}/><small>خالی یعنی تا زمان برداشتن تخفیف.</small></label>
    </div>
  </div>;
}
