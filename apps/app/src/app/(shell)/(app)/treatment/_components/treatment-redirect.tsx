"use client";
import { RefreshIndicator } from "@/components/shared/heartbeat-loader";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TreatmentRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/treatment"); }, [router]);
  return <div className="p-4"><RefreshIndicator label="در حال بازگشت به برنامهٔ درمان…" /></div>;
}
