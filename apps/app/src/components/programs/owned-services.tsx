'use client';
import { LoadingState } from "@/components/shared/skeletons";
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { getOwnedServices } from '@/lib/mezaj-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { OwnedServiceCard } from './service-card';
import { useAuthSession } from '@/components/auth/session-gate';

export function OwnedServices() {
  const { authentication } = useAuthSession();
  const [page, setPage] = useState(1);
  const resource = usePatientResource(useCallback(() => getOwnedServices(authentication.accessToken, page, 6), [authentication.accessToken, page]));
  if (!resource.loading && !resource.error && !resource.data?.total) return null;
  return <section className="mezaj-library" aria-label="خدمات من"><div className="mezaj-section-heading"><h2>خدمات من</h2><p>محتواهایی که تهیه کرده‌اید، همیشه از اینجا پیدا می‌شوند.</p></div>
    {resource.loading ? <LoadingState label="در حال دریافت خدمات شما…" variant="list" /> : resource.error ? <div role="alert" className="mezaj-state"><p>خدمات شما دریافت نشد.</p><button onClick={() => void resource.reload()}>تلاش دوباره</button></div> : <div className="mezaj-owned-grid">{resource.data?.items.map(item => <OwnedServiceCard key={item.accessGrantId} item={item} />)}</div>}
    {resource.data && resource.data.total > 6 && <nav className="mezaj-library-pagination" aria-label="صفحه‌های خدمات من"><button disabled={page === 1 || resource.loading} onClick={() => setPage(p => p - 1)}>قبلی</button><button disabled={page * 6 >= resource.data.total || resource.loading} onClick={() => setPage(p => p + 1)}>بعدی</button></nav>}<Link className="mezaj-library-all" href="/programs?view=mine">همهٔ خریدها و وضعیت دسترسی</Link>
  </section>;
}
