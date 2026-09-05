"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TreatmentRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/treatment"); }, [router]);
  return <p className="p-4 text-sm text-muted-foreground">در حال بازگشت به برنامهٔ درمان…</p>;
}
