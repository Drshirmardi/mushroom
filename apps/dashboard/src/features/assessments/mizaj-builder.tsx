"use client";

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TextField } from './assessment-builder';
import { QUESTION_TEXT_MAX_LENGTH, identifier, label, row, rows, text, type Row } from './assessment-authoring';
import { candidateKey, newFollowUp, tieCases } from './mizaj-authoring';

const field = 'min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm';
const tabs = [['main', 'سؤال‌های اصلی'], ['followups', 'رفع تساوی'], ['results', 'متن نتیجه‌ها'], ['rules', 'منطق آزمون']] as const;

export function MizajBuilder({ structure, onChange, disabled }: { structure: Row; onChange: (value: Row) => void; disabled: boolean }) {
  const [tab, setTab] = useState<typeof tabs[number][0]>('main');
  const [selected, setSelected] = useState(0);
  const [tested, setTested] = useState<Record<string, string>>({});
  const sections = rows(structure.sections);
  const scoring = row(structure.scoring);
  const dimensions = rows(scoring.dimensions);
  const questions = sections.flatMap((section, sectionIndex) => rows(section.questions).map((question, questionIndex) => ({ question, sectionIndex, questionIndex })));
  const current = questions[selected];
  const followUps = rows(structure.followUps);
  const names = (ids: string[]) => ids.map(id => text(dimensions.find(item => item.id === id)?.title) || id).join(' / ');
  const cases = tieCases(dimensions.map(item => text(item.id)));
  const pairCases = cases.filter(ids => ids.length === 2);
  const complete = (question: Row) => !!text(question.title).trim() && rows(question.options).every(option => text(option.title).trim());
  const configuredPairs = pairCases.filter(ids => followUps.some(item => candidateKey(item.tiedDimensions as string[]) === candidateKey(ids) && complete(item))).length;
  const patchQuestion = (patch: Row) => {
    if (!current) return;
    onChange({ ...structure, sections: sections.map((section, index) => index === current.sectionIndex ? { ...section, questions: rows(section.questions).map((question, q) => q === current.questionIndex ? { ...question, ...patch } : question) } : section) });
  };
  const patchFollowUp = (id: unknown, patch: Row) => onChange({ ...structure, followUps: followUps.map(item => item.id === id ? { ...item, ...patch } : item) });

  function createSequence(ids: string[], old: Row | undefined) {
    const nodes = ids.slice(0, -1).map((dimensionId, index) => ({ id: identifier('followup'), title: '', tiedDimensions: ids.slice(index), options: [{ id: identifier('option'), title: '', dimensionId }, { id: identifier('option'), title: '', dimensionId: index === ids.length - 2 ? ids[index + 1] : null }] }));
    onChange({ ...structure, scoring: { ...scoring, algorithmVersion: 2 }, followUps: [...followUps.filter(item => item !== old), { ...nodes[0], steps: nodes.slice(1) }] });
  }
  function renderCase(ids: string[]) {
    const question = followUps.find(item => candidateKey(item.tiedDimensions as string[]) === candidateKey(ids));
    return <details key={candidateKey(ids)} className="dashboard-card p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-semibold leading-7">{names(ids)}<span className="ms-3 text-xs font-normal text-muted-foreground">{question ? complete(question) ? 'متن سؤال کامل است' : 'متن سؤال نیازمند تکمیل است' : 'سؤال تعریف نشده'}</span></summary>
      <fieldset disabled={disabled} className="mt-4 space-y-4">
        <p className="text-xs leading-7 text-muted-foreground">فقط وقتی همین گرایش‌ها در رتبهٔ اول یا دوم برابر باشند، این سؤال انتخاب می‌شود. مسیر مرحله‌ای به‌محض تعیین گرایش همراه پایان می‌یابد.</p>
        {ids.length > 2 && <label className="block space-y-2 text-xs">اولین گرایش مورد بررسی<select className={field} value={tested[candidateKey(ids)] || ids[0]} onChange={event => setTested(value => ({ ...value, [candidateKey(ids)]: event.target.value }))}>{ids.map(id => <option key={id} value={id}>{names([id])}</option>)}</select></label>}
        {ids.length > 2 && <button type="button" className="dashboard-button" onClick={() => { if (!question || window.confirm('متن فعلی این حالت با مسیر جدید جایگزین شود؟')) createSequence([tested[candidateKey(ids)] || ids[0], ...ids.filter(id => id !== (tested[candidateKey(ids)] || ids[0]))], question); }}>ساخت مسیر مرحله‌ای تعیین گرایش همراه</button>}
        {question && Array.isArray(question.steps) && <div className="space-y-4">{[question, ...rows(question.steps)].map((step, index) => {
          const patch = (value: Row) => index === 0 ? patchFollowUp(question.id, value) : patchFollowUp(question.id, { steps: rows(question.steps).map((item, i) => i === index - 1 ? { ...item, ...value } : item) });
          return <section key={text(step.id)} className="space-y-3 rounded-xl border border-primary/30 p-4"><h4>سؤال {(index + 1).toLocaleString('fa-IR')} · {names(step.tiedDimensions as string[])}</h4><label className="block space-y-2 text-xs">گرایش پاسخ الف<select className={field} value={text(rows(step.options)[0]?.dimensionId)} onChange={event => {
            const all = [question, ...rows(question.steps)];
            const order = [...all.map(item => text(rows(item.options)[0]?.dimensionId)), text(rows(all[all.length - 1].options)[1]?.dimensionId)];
            const next = [...order.slice(0, index), event.target.value, ...order.slice(index).filter(id => id !== event.target.value)];
            const updated: Row[] = all.map((item, i) => ({ ...item, tiedDimensions: next.slice(i), options: rows(item.options).map((option, j) => ({ ...option, dimensionId: j === 0 ? next[i] : i === all.length - 1 ? next[i + 1] : null })) }));
            const { steps: _oldSteps, ...first } = updated[0];
            patchFollowUp(question.id, { ...first, steps: updated.slice(1) });
          }}>{(step.tiedDimensions as string[]).map(id => <option key={id} value={id}>{names([id])}</option>)}</select></label><TextField title="متن سؤال" value={step.title} multiline maxLength={QUESTION_TEXT_MAX_LENGTH} onChange={title => patch({ title })} />{rows(step.options).map((option, i, options) => <TextField key={text(option.id)} title={`${i === 0 ? 'الف' : 'ب'} · ${option.dimensionId ? names([text(option.dimensionId)]) + '؛ پایان' : 'حذف گرایش و سؤال بعد'}`} value={option.title} multiline maxLength={1500} onChange={title => patch({ options: options.map((item, j) => i === j ? { ...item, title } : item) })} />)}</section>;
        })}</div>}
        {!question ? <button type="button" className="dashboard-button" onClick={() => onChange({ ...structure, followUps: [...followUps, newFollowUp(ids)] })}><Plus size={15} />تعریف سؤال این حالت</button> : !Array.isArray(question.steps) && <>
          <TextField title="سؤال متمایزکننده" value={question.title} maxLength={QUESTION_TEXT_MAX_LENGTH} multiline onChange={title => patchFollowUp(question.id, { title })} />
          {rows(question.options).map((option, index, options) => <div key={text(option.id)} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_12rem_auto]">
            <TextField title={`پاسخ ${(index + 1).toLocaleString('fa-IR')}`} value={option.title} maxLength={1500} onChange={title => patchFollowUp(question.id, { options: options.map((item, i) => i === index ? { ...item, title } : item) })} />
            <label className="space-y-1.5 text-xs">این پاسخ کدام گرایش را مشخص می‌کند؟<select className={field} value={text(option.dimensionId)} onChange={event => patchFollowUp(question.id, { options: options.map((item, i) => i === index ? { ...item, dimensionId: event.target.value || null } : item) })}><option value="">تساوی را رفع نمی‌کند</option>{ids.map(id => <option key={id} value={id}>{names([id])}</option>)}</select></label>
            <button type="button" disabled={options.length <= 2} className="dashboard-icon self-end" aria-label={`حذف پاسخ ${index + 1}`} onClick={() => patchFollowUp(question.id, { options: options.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
          </div>)}
          <div className="flex flex-wrap gap-3"><button type="button" disabled={rows(question.options).length >= 5} className="dashboard-button" onClick={() => patchFollowUp(question.id, { options: [...rows(question.options), { id: identifier('option'), title: '', dimensionId: null }] })}><Plus size={15} />پاسخ دیگر</button><button type="button" className="dashboard-button text-destructive" onClick={() => { if (window.confirm('سؤال رفع تساوی این حالت حذف شود؟')) onChange({ ...structure, followUps: followUps.filter(item => item.id !== question.id) }); }}>حذف سؤال این حالت</button></div>
        </>}
      </fieldset>
    </details>;
  }

  return <div className="space-y-5">
    <section className="dashboard-card flex flex-wrap items-start justify-between gap-4 p-5"><div><h2 className="text-base font-bold">سازندهٔ آزمون مزاج</h2><p className="mt-2 max-w-2xl text-xs leading-7 text-muted-foreground">همهٔ ۱۱ سؤال اصلی پرسیده می‌شوند. فقط در صورت تساوی، یک سؤال مربوط به همان وضعیت انتخاب می‌شود؛ در مسیر مرحله‌ای حداکثر سه سؤال تکمیلی.</p></div><span className="dashboard-badge">پیش‌نویس · نیازمند بازبینی محتوا</span></section>
    <nav className="flex flex-wrap gap-2" aria-label="مراحل ساخت آزمون مزاج">{tabs.map(([id, title]) => <button type="button" key={id} aria-pressed={tab === id} className={`dashboard-button ${tab === id ? 'dashboard-button-primary' : ''}`} onClick={() => setTab(id)}>{title}</button>)}</nav>

    {tab === 'main' && <div className="grid items-start gap-5 lg:grid-cols-[15rem_1fr]">
      <aside className="dashboard-card space-y-1 p-3"><p className="px-3 py-2 text-xs text-muted-foreground">۱۱ سؤال اصلی · همه الزامی</p>{questions.map(({ question }, index) => <button type="button" key={text(question.id)} aria-pressed={selected === index} className={`min-h-11 w-full rounded-lg px-3 py-2 text-start text-xs leading-6 ${selected === index ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => setSelected(index)}><span className="me-2">{(index + 1).toLocaleString('fa-IR')}.</span>{label(question) || 'متن سؤال را وارد کنید'}</button>)}</aside>
      {current && <section className="dashboard-card space-y-5 p-5 sm:p-6"><h3 className="text-sm font-bold">سؤال {(selected + 1).toLocaleString('fa-IR')} از ۱۱</h3><fieldset disabled={disabled} className="space-y-5"><TextField title="متن سؤال" value={current.question.title} multiline maxLength={QUESTION_TEXT_MAX_LENGTH} onChange={title => patchQuestion({ title })} /><p className="text-xs leading-7 text-muted-foreground">ارتباط هر پاسخ را مستقل از جایگاه آن مشخص کنید. انتخاب «فقط اطلاعاتی» در نتیجه‌گیری دخالت نمی‌کند.</p>{rows(current.question.options).map((option, index, options) => <div key={text(option.id)} className="space-y-3 rounded-xl border border-border p-4"><TextField title={`پاسخ ${(index + 1).toLocaleString('fa-IR')}`} value={option.title} multiline maxLength={1500} onChange={title => patchQuestion({ options: options.map((item, i) => i === index ? { ...item, title } : item) })} /><label className="block space-y-2 text-xs">مزاج مرتبط با این پاسخ<select className={field} value={Object.keys(row(option.scores))[0] ?? ''} onChange={event => patchQuestion({ options: options.map((item, i) => i === index ? { ...item, scores: event.target.value ? { [event.target.value]: 1 } : {} } : item) })}><option value="">فقط اطلاعاتی؛ بدون تأثیر در نتیجه</option>{dimensions.map(item => <option key={text(item.id)} value={text(item.id)}>{text(item.title)}</option>)}</select></label></div>)}</fieldset><div className="flex justify-between gap-3"><button type="button" className="dashboard-button" disabled={selected === 0} onClick={() => setSelected(value => value - 1)}>سؤال قبلی</button><button type="button" className="dashboard-button" disabled={selected >= questions.length - 1} onClick={() => setSelected(value => value + 1)}>سؤال بعدی</button></div></section>}
    </div>}

    {tab === 'followups' && <div className="space-y-4"><section className="dashboard-card space-y-2 p-5"><h3 className="text-sm font-bold">مسیر سؤال‌ها برای هر وضعیت تساوی</h3><p className="text-xs leading-7 text-muted-foreground">{configuredPairs.toLocaleString('fa-IR')} از ۶ حالت تساوی دو گرایش تنظیم شده است. سؤال تعریف‌نشده باعث نمایش وضعیت «نیازمند تکمیل» در شبیه‌ساز می‌شود؛ سؤال جایگزین ساخته نمی‌شود.</p></section>{pairCases.map(renderCase)}<details className="dashboard-card p-5"><summary className="cursor-pointer text-sm font-semibold">تساوی هم‌زمان سه یا چهار گرایش</summary><p className="my-4 text-xs leading-7 text-muted-foreground">انتخاب خودکار دو مورد از میان سه گرایش برابر مجاز نیست. برای این حالت‌ها هم می‌توانید یک سؤال اختصاصی تعریف کنید؛ مسیر مرحله‌ای برای تعیین گرایش همراه قابل تعریف است.</p><div className="space-y-3">{cases.filter(ids => ids.length > 2).map(renderCase)}</div></details></div>}

    {tab === 'results' && <section className="dashboard-card space-y-4 p-5"><h3 className="text-sm font-bold">متن نتیجهٔ قابل نمایش پس از رفع ابهام</h3><p className="text-xs leading-7 text-muted-foreground">گرایش اول و همراه فقط وقتی مشخص باشند نمایش داده می‌شوند. این متن‌ها هنوز تأیید محتوایی نشده‌اند.</p>{rows(structure.resultProfiles).map((profile, index, profiles) => {
      const update = (patch: Row) => onChange({ ...structure, resultProfiles: profiles.map((item, i) => i === index ? { ...item, ...patch } : item) });
      return <details key={text(profile.id)} className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm leading-7">{names([text(profile.primary)])}{profile.secondary ? `، همراه با ${names([text(profile.secondary)])}` : '؛ بدون گرایش همراه'}<span className="ms-2 text-xs text-muted-foreground">{text(profile.title)}</span></summary><fieldset disabled={disabled} className="mt-4 space-y-4"><TextField title="عنوان نتیجه" value={profile.title} maxLength={200} onChange={title => update({ title })} /><TextField title="توضیح نتیجه" value={profile.summary} multiline maxLength={2000} onChange={summary => update({ summary })} /><TextField title="نقاط قوت؛ هر خط یک مورد، حداکثر پنج مورد" value={Array.isArray(profile.strengths) ? profile.strengths.join('\n') : ''} multiline onChange={value => update({ strengths: value.split('\n') })} /><TextField title="نکات قابل توجه؛ هر خط یک مورد، حداکثر پنج مورد" value={Array.isArray(profile.attentionPoints) ? profile.attentionPoints.join('\n') : ''} multiline onChange={value => update({ attentionPoints: value.split('\n') })} /><TextField title="گام بعد" value={profile.nextStep} multiline maxLength={1000} onChange={nextStep => update({ nextStep })} /></fieldset></details>;
    })}</section>}

    {tab === 'rules' && <section className="dashboard-card space-y-5 p-5"><h3 className="text-sm font-bold">قواعد ثابت این نسخه</h3><ol className="list-inside list-decimal space-y-3 text-sm leading-8"><li>ابتدا تمام ۱۱ سؤال اصلی پاسخ داده می‌شوند.</li><li>هر پاسخ مرتبط، یک شاهد برای همان گرایش است؛ پاسخ اطلاعاتی شمارش نمی‌شود.</li><li>در تساوی اول، همان گرایش‌های برابر بررسی می‌شوند؛ اگر اول مشخص و دوم برابر باشد، سؤال برای تساوی دوم انتخاب می‌شود.</li><li>در مسیر مرحله‌ای، سؤال بعد بر اساس پاسخ قبلی و گرایش‌های باقی‌مانده انتخاب می‌شود.</li><li>پاسخ تکمیلی فقط ترتیب گرایش‌های برابر را مشخص می‌کند؛ شمارش پاسخ‌های اصلی را تغییر نمی‌دهد.</li><li>اگر سؤال مناسب موجود نباشد یا ابهام باقی بماند، نتیجه نامشخص می‌ماند؛ مسیر مرحله‌ای باید تا پاسخ قطعی کامل باشد.</li></ol><fieldset disabled={disabled} className="space-y-4"><label className="block max-w-md space-y-2 text-xs">حداقل پاسخ مرتبط برای نتیجه‌گیری<input type="number" min={1} max={11} step={1} className={field} value={Number(scoring.minInformativeAnswers) || ''} onChange={event => onChange({ ...structure, scoring: { ...scoring, minInformativeAnswers: event.target.valueAsNumber } })} /></label>{dimensions.map((item, index) => <TextField key={text(item.id)} title="نام گرایش" value={item.title} maxLength={100} onChange={title => onChange({ ...structure, scoring: { ...scoring, dimensions: dimensions.map((dimension, i) => i === index ? { ...dimension, title } : dimension) } })} />)}</fieldset><p className="text-xs leading-7 text-muted-foreground">این قواعد فنی، دقت تشخیصی را ثابت نمی‌کنند. همهٔ ۱۱ سؤال حفظ شده‌اند؛ نگاشت پاسخ‌ها و سؤال رفع تساوی باید بازبینی شوند. مدیر پس از تکمیل سؤال‌ها، نگاشت پاسخ‌ها و متن نتیجه‌ها، همین نسخه را منتشر می‌کند.</p></section>}
  </div>;
}
