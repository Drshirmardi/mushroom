import { redirect } from 'next/navigation';
import { coupleStartHref } from '@/lib/couples-flow';

// Compatibility locator. The invitation form now opens inside the couples home.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ replaceRequestId?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  redirect(coupleStartHref(id, query.replaceRequestId));
}
