"use client";

import { useEffect, useRef, useState } from "react";
import { apiBaseUrl, sessionFetch } from "../../lib/api";

export function DoctorImageField({ id, imageUrl, token, refresh }: {
  id: string; imageUrl: string | null | undefined; token: string; refresh: () => Promise<boolean>;
}) {
  const [file, setFile] = useState<File>();
  const [localPreview, setLocalPreview] = useState<string>();
  const [savedPreview, setSavedPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const endpoint = `${apiBaseUrl}/v1/admin/doctors/${encodeURIComponent(id)}/image`;
  const managed = imageUrl?.startsWith("/v1/admin/doctors/");

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!managed) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void sessionFetch(endpoint, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (!response.ok) return;
        const body = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(body);
        setSavedPreview(objectUrl);
      }).catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [endpoint, managed, token, version]);

  async function changeImage(method: "PUT" | "DELETE") {
    if (busy || (method === "PUT" && !file)) return;
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const body = method === "PUT" ? new FormData() : undefined;
      if (body && file) body.append("file", file);
      const response = await sessionFetch(endpoint, { method, body, headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        setError(true);
        setMessage(response.status === 409 ? "پروفایل هم‌زمان تغییر کرده است. دوباره تلاش کنید."
          : [400, 413, 415, 422].includes(response.status) ? "تصویر معتبر نیست. فایل JPEG، PNG یا WebP تا ۵ مگابایت را انتخاب کنید."
          : "ذخیرهٔ عکس انجام نشد. دوباره تلاش کنید.");
        return;
      }
      setFile(undefined);
      if (input.current) input.current.value = "";
      setVersion(current => current + 1);
      const refreshed = await refresh();
      setMessage(refreshed ? (method === "PUT" ? "عکس پزشک ذخیره شد." : "عکس پزشک برداشته شد.")
        : "تغییر ذخیره شد. برای دیدن وضعیت جدید فهرست پزشکان را تازه کنید.");
    } catch {
      setError(true);
      setMessage("نتیجهٔ درخواست دریافت نشد. وضعیت عکس را تازه کنید.");
    } finally {
      setBusy(false);
    }
  }

  const preview = (file ? localPreview : undefined) || (managed ? savedPreview : imageUrl);
  return <fieldset className="space-y-3 rounded-xl border border-border p-4" disabled={busy}>
    <legend className="px-1 text-sm font-bold">عکس پزشک</legend>
    {preview && <img className="size-24 rounded-xl object-cover" src={preview} alt="پیش‌نمایش عکس پزشک" referrerPolicy="no-referrer" />}
    <label className="block text-sm">انتخاب فایل JPEG، PNG یا WebP تا ۵ مگابایت
      <input ref={input} className="mt-2 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const selected = event.target.files?.[0];
        const valid = selected && selected.size <= 5 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(selected.type);
        setFile(valid ? selected : undefined);
        setError(Boolean(selected && !valid));
        setMessage(selected && !valid ? "فرمت یا حجم عکس قابل قبول نیست." : "");
      }} />
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50" disabled={!file} onClick={() => void changeImage("PUT")}>{imageUrl ? "جایگزینی عکس" : "آپلود عکس"}</button>
      {imageUrl && <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => void changeImage("DELETE")}>برداشتن عکس</button>}
    </div>
    {busy && <p role="status" className="text-sm">در حال ذخیره…</p>}
    {message && <p role={error ? "alert" : "status"} className="text-sm">{message}</p>}
  </fieldset>;
}
