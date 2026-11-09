import { Suspense } from 'react';
import { CouplesHome } from '@/components/assessments/couples-home';

export default function CouplesPage() {
  return (
    <Suspense fallback={<main className="service-page"><p role="status">در حال دریافت تست‌ها…</p></main>}>
      <CouplesHome />
    </Suspense>
  );
}
