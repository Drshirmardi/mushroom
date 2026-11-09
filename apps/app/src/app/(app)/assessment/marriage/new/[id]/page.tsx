import { redirect } from 'next/navigation';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ replaceRequestId?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!uuid.test(id)) redirect('/assessment/couples');
  const url = '/assessment/couples?newTestId=' + encodeURIComponent(id);
  redirect(url + (query.replaceRequestId && uuid.test(query.replaceRequestId)
    ? '&replaceRequestId=' + encodeURIComponent(query.replaceRequestId)
    : ''));
}
