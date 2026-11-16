import type { ReactNode } from "react";
import { LoadingState, type SkeletonVariant } from "./skeletons";
import { RefreshIndicator } from "./heartbeat-loader";

export function PatientResourceState({ loading, refreshing = false, error, retry, skeleton, variant = "list" }: { loading: boolean; refreshing?: boolean; error: string | null; retry: () => void; skeleton?: ReactNode; variant?: SkeletonVariant }) {
  if (error) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={retry} className="mt-2 inline-flex min-h-11 items-center font-bold underline">دریافت دوباره</button></div>;
  if (loading) return <LoadingState variant={variant}>{skeleton}</LoadingState>;
  if (refreshing) return <RefreshIndicator />;
  return null;
}
