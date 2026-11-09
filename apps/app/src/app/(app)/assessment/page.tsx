"use client";
import { Suspense, useCallback, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, ClipboardList, HeartHandshake, Leaf, Mail, CirclePlay } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { usePatientResource } from '@/lib/use-patient-resource';
import { listAssessmentHistory, listPublishedAssessments } from '@/lib/assessment-api';
import { listAssessmentOfferings, listAssessmentPurchases, listEducationalAssessmentOfferings } from '@/lib/digital-services-api';
import { listMarriageRequests } from '@/lib/marriage-api';
import { groupAssessmentCatalog } from '@/lib/assessment-catalog';
import { AssessmentResourceState, AssessmentPageSkeleton } from './assessment-loading';
import { PatientPagination } from '@/components/shared/patient-pagination';
import { formatRialWithUnit } from '@/lib/wallet-money';
import { billingStatusLabel } from '@/lib/wallet-labels';
import { toP } from '@/lib/format';
import styles from './assessment-hub.module.css';

type Attempt = Awaited<ReturnType<typeof listAssessmentHistory>>['items'][number];
function attemptHref(item: Attempt) {
  const query = new URLSearchParams({ submissionId: item.id });
  if (item.marriageRequestId) query.set('marriageRequestId', item.marriageRequestId);
  return `/assessment/${item.state === 'COMPLETE' ? 'result' : 'resume'}?${query}`;
}
function Panel({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-label={label} className={styles.stack}>{children}</section>;
}
export default function AssessmentPage() {
  return <Suspense fallback={<AssessmentPageSkeleton />}><AssessmentHub /></Suspense>;
}
function AssessmentHub() {
  const { authentication } = useAuthSession(); const token = authentication.accessToken;
  const router = useRouter(), search = useSearchParams();
  const value = search.get('view'); const mine = ['mine','history','purchases'].includes(value ?? '');
  const section = search.get('section') ?? (value === 'purchases' ? 'purchases' : 'all');
  const invitations = usePatientResource(useCallback(() => listMarriageRequests(token,1,{status:'PENDING',direction:'RECEIVED'}),[token]));
  const ongoing = usePatientResource(useCallback(() => listAssessmentHistory(token,1,'IN_PROGRESS'),[token]));
  const invitation = invitations.data?.items[0], draft = ongoing.data?.items.find(item => item.resumeAvailable);
  const go = (view: string, selected?: string) => router.push(`/assessment?${new URLSearchParams({view,...(selected ? {section:selected} : {})})}`,{scroll:false});
  return <main className={styles.hub} dir="rtl">
    <Link href="/" className={styles.back}><ArrowRight size={18} aria-hidden="true" />خانه</Link>
    <header className={styles.header}><h1>آزمون‌ها</h1><span className={styles.icon}><ClipboardList size={24} aria-hidden="true" /></span></header>
    <Panel label="دعوت‌های منتظر شما"><AssessmentResourceState shape="invite" {...invitations} retry={() => void invitations.reload()} />
      {invitation && <article className={styles.invite}>
        <p className={styles.kicker}><Mail size={16} aria-hidden="true" />یک دعوت جدید دارید</p><h2>{invitation.service.title}</h2><p className={styles.muted}>منتظر پاسخ شما</p>
        <Link className={styles.primary} href={invitation.invitationPath}>بررسی دعوت</Link>
        {invitations.data!.total > 1 && <button type="button" className={styles.textAction} onClick={() => go('mine','incoming')}>{toP(invitations.data!.total - 1)} دعوت دیگر<ArrowLeft size={16} aria-hidden="true" /></button>}
      </article>}
    </Panel>
    <Panel label="آزمون‌های در جریان"><AssessmentResourceState shape="row" {...ongoing} retry={() => void ongoing.reload()} />
      {draft && <article className={styles.draft}><CirclePlay size={22} aria-hidden="true" /><div><h2>{draft.title}</h2><p className={styles.muted}>نیمه‌تمام</p></div><Link className={styles.textAction} href={attemptHref(draft)}>ادامه<ArrowLeft size={16} aria-hidden="true" /></Link></article>}
      {!!ongoing.data && ongoing.data.total > (draft ? 1 : 0) && <button className={styles.textAction} type="button" onClick={() => go('mine','ongoing')}>همهٔ آزمون‌های در جریان ({toP(ongoing.data.total)})</button>}
    </Panel>
    <div className={styles.tabs} onKeyDown={event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : mine ? 0 : 1; event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[index]?.focus(); go(index ? 'mine' : 'start'); }} role="tablist" aria-label="بخش آزمون‌ها"><button id="assessment-new-tab" role="tab" aria-selected={!mine} aria-controls="assessment-panel" onClick={() => go('start')}>آزمون جدید</button><button id="assessment-mine-tab" role="tab" aria-selected={mine} aria-controls="assessment-panel" onClick={() => go('mine')}>آزمون‌های من</button></div>
    <div id="assessment-panel" role="tabpanel" aria-labelledby={mine ? 'assessment-mine-tab' : 'assessment-new-tab'}>
      {mine ? <MyAssessments key={section} token={token} section={section} invitationId={invitation?.id} draftId={draft?.id} /> : <NewAssessments token={token} />}
    </div>
  </main>;
}
function NewAssessments({ token }: { token: string }) {
  const [individualPage,setIndividualPage] = useState(1),[marriagePage,setMarriagePage] = useState(1),[legacyPage,setLegacyPage] = useState(1);
  const individual = usePatientResource(useCallback(() => listEducationalAssessmentOfferings(token,individualPage),[token,individualPage]));
  const marriage = usePatientResource(useCallback(() => listEducationalAssessmentOfferings(token,marriagePage,'COUPLES','MARRIAGE'),[token,marriagePage]));
  const legacy = usePatientResource(useCallback(() => listAssessmentOfferings(token,legacyPage),[token,legacyPage]));
  const published = usePatientResource(useCallback(() => listPublishedAssessments(token),[token]));
  const hasData = !!(individual.data?.total || marriage.data?.total || legacy.data?.total || published.data?.items.length);
  return <div className={styles.stack}>
    {([{resource:individual,page:individualPage,set:setIndividualPage,label:'آزمون‌های فردی'}, {resource:marriage,page:marriagePage,set:setMarriagePage,label:'آزمون‌های دو نفره'}]).map(({resource,page,set,label}) => <Panel key={label} label={label}>
      <AssessmentResourceState {...resource} retry={() => void resource.reload()} />
      {resource.data?.items.filter((item,index,all) => all.findIndex(other => other.id === item.id) === index).map(item => <Link key={item.id} className={styles.test} href={item.servicePurpose === 'MARRIAGE' ? `/assessment/couples?newTestId=${encodeURIComponent(item.id)}` : `/assessment/educational/${item.id}`}>
        <div className={styles.testHead}><span className={styles.icon}>{item.kind === 'COUPLES' ? <HeartHandshake aria-hidden="true" size={22} /> : <Leaf aria-hidden="true" size={22} />}</span><h2>{item.title}</h2></div>
        <div className={styles.testFoot}><span>{item.priceMode === 'FREE' ? 'رایگان' : formatRialWithUnit(BigInt(item.amountRial ?? '0'))}{item.kind === 'COUPLES' && ' · دو نفر'}</span><span className={styles.textAction}>مشاهده آزمون<ArrowLeft size={16} aria-hidden="true" /></span></div>
      </Link>)}
      {resource.data && <PatientPagination page={page} total={resource.data.total} onChange={set} />}
    </Panel>)}
    <Panel label="سایر عرضه‌های آزمون"><AssessmentResourceState {...legacy} retry={() => void legacy.reload()} />
      {legacy.data?.items.map(item => <Link className={styles.test} key={item.id} href={item.kind === 'COUPLES' ? `/assessment/couples?publicationId=${item.id}` : `/assessment/offerings/${item.id}`}><div className={styles.testHead}><span className={styles.icon}>{item.kind === 'COUPLES' ? <HeartHandshake size={22} aria-hidden="true" /> : <Leaf size={22} aria-hidden="true" />}</span><h2>{item.title}</h2></div><div className={styles.testFoot}><span>{formatRialWithUnit(BigInt(item.amountRial))}</span><span className={styles.textAction}>مشاهده آزمون<ArrowLeft size={16} aria-hidden="true" /></span></div></Link>)}
      {legacy.data && <PatientPagination page={legacyPage} total={legacy.data.total} onChange={setLegacyPage} />}
    </Panel>
    <Panel label="نسخه‌های دیگر آزمون‌ها"><AssessmentResourceState shape="row" {...published} retry={() => void published.reload()} />
      {!!published.data?.items.length && <details className={styles.versions}><summary>سایر آزمون‌ها و نسخه‌ها</summary><div className={styles.stack}>{groupAssessmentCatalog(published.data.items).map(group => <details key={group.key} className={styles.test}><summary>{group.title}</summary>{group.versions.map(item => <div className={styles.testFoot} key={item.id}><span className={styles.muted}>نسخهٔ {toP(item.versionNumber)}</span><Link className={styles.textAction} href={`/assessment/${item.id}`}>شروع آزمون<ArrowLeft size={16} aria-hidden="true" /></Link></div>)}</details>)}</div></details>}
    </Panel>
    {!hasData && [individual,marriage,legacy,published].every(r=>!r.loading&&!r.error&&r.data) && <p className={styles.empty}>فعلاً آزمونی برای شروع در دسترس نیست.</p>}
  </div>;
}
function MyAssessments({token,section,invitationId,draftId}:{token:string;section:string;invitationId?:string;draftId?:string}) {
  const [requestPage,setRequestPage]=useState(1),[historyPage,setHistoryPage]=useState(1),[purchasePage,setPurchasePage]=useState(1);
  const requests=usePatientResource(useCallback(()=>listMarriageRequests(token,requestPage,section==='incoming'?{status:'PENDING',direction:'RECEIVED'}:{}),[token,requestPage,section]));
  const history=usePatientResource(useCallback(()=>listAssessmentHistory(token,historyPage,section==='ongoing'?'IN_PROGRESS':undefined),[token,historyPage,section]));
  const purchases=usePatientResource(useCallback(()=>listAssessmentPurchases(token,purchasePage),[token,purchasePage]));
  const statuses:Record<string,string>={PENDING:'منتظر پاسخ همراه',ACCEPTED:'دعوت پذیرفته شده',CANCELLED:'لغوشده',REPLACED:'جایگزین‌شده'};
  const groups=[<Panel key="invitations" label="دعوت‌ها"><AssessmentResourceState {...requests} retry={()=>void requests.reload()} />{requests.data?.items.filter(item=>item.id!==invitationId).map(item=><Link className={styles.record} key={item.id} href={item.invitationPath}><h2>{item.service.title}</h2><p className={styles.muted}>{item.isInitiator?'دعوت ارسالی':'دعوت دریافتی'} · {item.status==='PENDING'&&!item.isInitiator?'منتظر پاسخ شما':statuses[item.status]}</p>{item.isInitiator&&item.recipientPhoneMasked&&<p className={styles.muted}>همراه: <bdi dir="ltr">{item.recipientPhoneMasked}</bdi></p>}<div className={styles.testFoot}><time className={styles.muted}>{new Date(item.createdAt).toLocaleDateString('fa-IR',{timeZone:'Asia/Tehran'})}</time><span className={styles.textAction}>مشاهده دعوت<ArrowLeft size={16} aria-hidden="true" /></span></div></Link>)}{requests.data&&<PatientPagination page={requestPage} total={requests.data.total} onChange={setRequestPage} />}</Panel>,
    <Panel key="records" label="پاسخ‌ها و نتایج"><AssessmentResourceState {...history} retry={()=>void history.reload()} />{history.data?.items.filter(item=>item.id!==draftId).map(item=><article className={styles.record} key={item.id}><h2>{item.title}</h2><div className={styles.testFoot}><span className={styles.muted}>{item.state==='COMPLETE'?'نتیجه آماده است':item.resumeAvailable?'نیمه‌تمام':'قابل ادامه نیست'}</span>{(item.state==='COMPLETE'||item.resumeAvailable)&&<Link className={styles.textAction} href={attemptHref(item)}>{item.state==='COMPLETE'?'مشاهده نتیجه':'ادامه'}<ArrowLeft size={16} aria-hidden="true" /></Link>}</div><details className={styles.meta}><summary>جزئیات آزمون</summary>نسخهٔ {toP(item.versionNumber)} · تلاش {toP(item.attemptNumber)}</details></article>)}{history.data&&<PatientPagination page={historyPage} total={history.data.total} onChange={setHistoryPage} />}</Panel>,
    <Panel key="purchases" label="خریدها"><AssessmentResourceState {...purchases} retry={()=>void purchases.reload()} />{purchases.data?.items.map(item=><Link className={styles.record} key={item.id} href={`/assessment/purchases/${item.id}`}><h2>{item.title}</h2>{item.intent&&<p className={styles.muted}>{billingStatusLabel(item.intent.status)}</p>}<div className={styles.testFoot}><span>{formatRialWithUnit(BigInt(item.amountRial))}</span><span className={styles.textAction}>پرداخت و دسترسی<ArrowLeft size={16} aria-hidden="true" /></span></div></Link>)}{purchases.data&&<PatientPagination page={purchasePage} total={purchases.data.total} onChange={setPurchasePage} />}</Panel>];
  if(section==='purchases')groups.unshift(groups.splice(2,1)[0]);
  if(section==='ongoing')groups.unshift(groups.splice(1,1)[0]);
  const empty=[requests,history,purchases].every(r=>r.data?.total===0&&!r.loading&&!r.error);
  return <div className={styles.stack}>{groups}{empty&&!invitationId&&!draftId&&<p className={styles.empty}>هنوز آزمونی در سوابق شما نیست.</p>}<details className={styles.versions}><summary>سوابق دیگرِ دو نفره</summary><Link className={styles.textAction} href="/assessment/couples/legacy">مشاهده سوابق دو نفره<ArrowLeft size={16} aria-hidden="true" /></Link></details></div>;
}
