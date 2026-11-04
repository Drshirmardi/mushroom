import { PatientResourceState } from '@/components/shared/patient-resource-state';
import styles from './assessment-hub.module.css';

type Shape = 'invite' | 'card' | 'row';
function Placeholder({ shape }: { shape: Shape }) {
  return <div className={`${styles.placeholder} ${shape === 'row' ? styles.placeholderRow : styles.test}`} aria-hidden="true">
    <div className={styles.placeholderHead}><span className={`skeleton ${styles.placeholderIcon}`} /><div className={styles.placeholderLines}><span className={`skeleton ${styles.placeholderTitle}`} /><span className={`skeleton ${styles.placeholderLine}`} /></div>{shape === 'row' && <span className={`skeleton ${styles.placeholderAction}`} />}</div>
    {shape !== 'row' && <div className={styles.placeholderFoot}>{shape === 'invite' ? <span className={`skeleton ${styles.placeholderButton}`} /> : <><span className={`skeleton ${styles.placeholderAction}`} /><span className={`skeleton ${styles.placeholderAction}`} /></>}</div>}
  </div>;
}
export function AssessmentResourceState({ loading, error, retry, shape = 'card' }: { loading: boolean; error: string | null; retry: () => void; shape?: Shape }) {
  if (error) return <PatientResourceState loading={false} error={error} retry={retry} />;
  if (!loading) return null;
  return <div role="status" data-assessment-skeleton={shape}><span className="sr-only">در حال دریافت آزمون‌ها…</span><Placeholder shape={shape} /></div>;
}
export function AssessmentPageSkeleton() {
  return <main className={styles.hub} dir="rtl" role="status" data-assessment-skeleton="page"><span className="sr-only">در حال دریافت آزمون‌ها…</span><div aria-hidden="true" className={styles.stack}>
    <div className={styles.header}><span className={`skeleton ${styles.placeholderTitle}`} /><span className={`skeleton ${styles.placeholderIcon}`} /></div>
    <Placeholder shape="invite" /><Placeholder shape="row" /><span className={`skeleton ${styles.placeholderButton}`} /><Placeholder shape="card" /><Placeholder shape="card" />
  </div></main>;
}
