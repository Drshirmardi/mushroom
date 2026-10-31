"use client";
import { useParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { EducationalCoupleWorkspace } from '@/components/assessments/educational-couples';
export default function EducationalCouplePage() {
  const { id } = useParams<{ id: string }>(), { authentication } = useAuthSession();
  return <ServicePage title="ارزیابی آموزشی زوجین" description="هر نفر از حساب خودش رضایت می‌دهد و پاسخ‌های خودش را ثبت می‌کند." icon={Users} backHref="/assessment/couples" backLabel="ارزیابی‌های زوجین"><EducationalCoupleWorkspace token={authentication.accessToken} userId={authentication.user.id} id={id} /></ServicePage>;
}
