'use client';

import { Users } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { EducationalCoupleWorkspace } from './educational-couples';

/** Read-only compatibility surface for older educational couple records without a marriage request. */
export function EducationalCoupleDirect({ id }: { id: string }) {
  const { authentication } = useAuthSession();
  return (
    <ServicePage
      title="تست دو نفره"
      description="هر نفر با حساب خودش شرایط رو تأیید می‌کنه و تست رو ادامه می‌ده."
      icon={Users}
      backHref="/assessment/couples?history=1"
      backLabel="تست‌های دو نفره"
    >
      <EducationalCoupleWorkspace token={authentication.accessToken} userId={authentication.user.id} id={id} />
    </ServicePage>
  );
}
