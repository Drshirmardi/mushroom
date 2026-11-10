import { Suspense } from 'react';
import { LoadingState } from '@/components/shared/skeletons';
import { CouplesHome } from '@/components/assessments/couples-home';

export default function CouplesPage() {
  return (
    <Suspense fallback={<main className="service-page p-4"><LoadingState variant="list" /></main>}>
      <CouplesHome />
    </Suspense>
  );
}
