import { redirect } from 'next/navigation';
import { EducationalCoupleDirect } from '@/components/assessments/educational-couple-direct';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

/** Continue new invitations on the request page; preserve direct access to older saved contexts. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ marriageRequestId?: string }>;
}) {
  const { id } = await params;
  const { marriageRequestId } = await searchParams;
  if (marriageRequestId && uuid.test(marriageRequestId)) {
    redirect('/assessment/marriage/requests/' + marriageRequestId);
  }
  return <EducationalCoupleDirect id={id} />;
}
