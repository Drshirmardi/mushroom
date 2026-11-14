"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl, sessionFetch } from "@/lib/api";

export function DoctorPortrait({ name, url, token, eager = false, className }: {
  name: string; url?: string | null; token: string; eager?: boolean; className?: string;
}) {
  const [loaded, setLoaded] = useState<{ path: string; token: string; blob: string }>();
  const [failed, setFailed] = useState<string>();
  const managed = url?.startsWith("/v1/directory/doctors/");
  useEffect(() => {
    if (!url || !managed) return;
    const controller = new AbortController();
    let blob: string | undefined;
    void sessionFetch(new URL(url, apiBaseUrl), {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    }).then(async response => {
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) return;
      const image = await response.blob();
      if (controller.signal.aborted) return;
      blob = URL.createObjectURL(image);
      setLoaded({ path: url, token, blob });
    }).catch(() => {});
    return () => {
      controller.abort();
      if (blob) URL.revokeObjectURL(blob);
    };
  }, [managed, token, url]);

  const source = managed ? (loaded?.path === url && loaded?.token === token ? loaded.blob : undefined) : url;
  return source && source !== failed
    ? <img className={className} src={source} alt="" loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(source)} />
    : <span className={className} aria-hidden="true">{name.trim().split(/\s+/u).slice(0, 2).map(word => Array.from(word)[0]).join("")}</span>;
}
