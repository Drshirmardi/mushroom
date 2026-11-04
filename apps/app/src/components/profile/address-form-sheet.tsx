"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";

import { useEffect, useState, type ChangeEvent } from "react";
import { User } from "lucide-react";
import { BottomSheet } from "../shared/bottom-sheet";
import { normalizeDigits } from "../../lib/wallet-money";
import { toP } from "../../lib/format";
import { loadSelfProfile } from "../../lib/onboarding/patient-onboarding";
import { commerceErrorMessage, createCommerceAddress, type CommerceAddress } from "../../lib/commerce-catalog-api";

type Props = {
  accessToken: string;
  onCreated: (address: CommerceAddress) => void;
  onClose: () => void;
};

const EMPTY = { label: "", recipientName: "", phone: "", province: "", city: "", line1: "", postalCode: "" };
type DraftKey = keyof typeof EMPTY;
const FIELDS: { key: DraftKey; label: string; required?: boolean; ltr?: boolean; inputMode?: "tel" | "numeric"; autoComplete?: string; placeholder?: string }[] = [
  { key: "label", label: "برچسب آدرس", required: true, autoComplete: "off", placeholder: "مثلاً خانه یا محل کار" },
  { key: "recipientName", label: "نام گیرنده", required: true, autoComplete: "name", placeholder: "مثلاً سامان رحیمی" },
  { key: "phone", label: "شماره تماس", required: true, ltr: true, inputMode: "tel", autoComplete: "tel", placeholder: "09123456789" },
  { key: "province", label: "استان", required: true, autoComplete: "address-level1", placeholder: "مثلاً تهران" },
  { key: "city", label: "شهر", required: true, autoComplete: "address-level2", placeholder: "مثلاً تهران" },
  { key: "line1", label: "نشانی کامل", required: true, autoComplete: "street-address", placeholder: "خیابان، کوچه، پلاک…" },
  { key: "postalCode", label: "کد پستی (اختیاری)", inputMode: "numeric", autoComplete: "postal-code", placeholder: "۱۰ رقمی" },
];

/** Iranian mobile: 09xxxxxxxxx or +989xxxxxxxxx. Empty is handled by required. */
function validatePhone(value: string): string | null {
  const trimmed = normalizeDigits(value).trim();
  if (trimmed === "") return null;
  return /^(0|\+98)9\d{9}$/u.test(trimmed) ? null : "شماره موبایل معتبر نیست؛ با ۰ یا ‎+98 شروع شود";
}

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25";
const inputErrorClass = "w-full rounded-lg border border-red-500 bg-white px-4 py-3 text-base outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/25";

/** Profile address creation sheet: profile styling, existing create endpoint. */
export function AddressFormSheet({ accessToken, onCreated, onClose }: Props) {
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null); const [phoneFocused, setPhoneFocused] = useState(false);
  const [accountPhone, setAccountPhone] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  useEffect(() => { void loadSelfProfile(accessToken).then((profile) => setAccountPhone(profile.phone ?? null)).catch(() => setAccountPhone(null)); }, [accessToken]);
  const dirty = Object.values(draft).some((value) => value.trim() !== "");
  const complete = [draft.label, draft.recipientName, draft.phone, draft.province, draft.city, draft.line1].every((value) => value.trim().length > 0);
  const requestClose = () => { if (dirty && !confirmingClose) setConfirmingClose(true); else onClose(); };
  const set = (key: DraftKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setDraft((current) => ({ ...current, [key]: next }));
    if (key === "phone" && phoneError) setPhoneError(validatePhone(next));
  };
  const save = async () => {
    const phoneMessage = validatePhone(draft.phone);
    if (phoneMessage) { setPhoneError(phoneMessage); setConfirmingClose(false); document.getElementById("profile-address-phone")?.focus(); return; }
    if (!complete || saving) return;
    setSaving(true); setError(null);
    try {
      const created = await createCommerceAddress(accessToken, {
        label: draft.label.trim(), recipientName: draft.recipientName.trim(), phone: normalizeDigits(draft.phone).trim(),
        province: draft.province.trim(), city: draft.city.trim(), line1: draft.line1.trim(),
        ...(draft.postalCode.trim() ? { postalCode: normalizeDigits(draft.postalCode).trim() } : {}),
      });
      onCreated(created);
    } catch (cause) { setError(commerceErrorMessage(cause)); } finally { setSaving(false); }
  };
  return <BottomSheet title={confirmingClose ? undefined : "آدرس جدید"} onClose={requestClose}>
    {confirmingClose ? (
      <div>
        <h2 className="mb-2 text-center text-base font-bold text-foreground">{complete ? "ذخیره شود یا خارج شوی؟" : "اطلاعات ناقص است"}</h2>
        <p className="text-center text-sm leading-6 text-muted-foreground">
          {complete
            ? "آدرس کامل شده و آماده ذخیره است."
            : "برای ذخیره، همه فیلدهای ضروری را کامل کن؛ در غیر این صورت نوشته‌هایت از بین می‌رود."}
        </p>
        {complete && <button type="button" disabled={saving} onClick={() => void save()} className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60" aria-busy={Boolean(saving)}>{saving ? <><HeartbeatLoader />{"در حال ذخیره…"}</> : "سیوش کن"}</button>}
        <div className="mt-2 space-y-2">
          {complete
            ? <button type="button" onClick={onClose} className="w-full rounded-2xl bg-muted py-3.5 text-sm font-bold text-foreground transition-colors active:bg-border">خارج شو بدون ذخیره</button>
            : <button type="button" onClick={() => setConfirmingClose(false)} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">برمی‌گردم کاملش کنم</button>}
          {!complete && <button type="button" onClick={onClose} className="w-full rounded-2xl py-3 text-sm font-bold text-muted-foreground transition-colors active:bg-muted">خارج شو بدون ذخیره</button>}
        </div>
      </div>
    ) : (
      <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-3">
        {FIELDS.map((field) => <div key={field.key}>
          <label htmlFor={`profile-address-${field.key}`} className="mb-1 block text-xs font-bold text-muted-foreground">{field.label}{field.required ? " *" : ""}</label>
          <input id={`profile-address-${field.key}`} name={field.key} required={field.required} aria-required={field.required} aria-invalid={field.key === "phone" && phoneError ? true : undefined} aria-describedby={field.key === "phone" && phoneError ? "profile-address-phone-error" : undefined} dir={field.ltr ? "ltr" : undefined} inputMode={field.inputMode} autoComplete={field.autoComplete} placeholder={field.placeholder} value={draft[field.key]} maxLength={field.key === "line1" ? 300 : field.key === "postalCode" ? 10 : field.key === "phone" ? 13 : 80} onChange={set(field.key)} onFocus={field.key === "phone" ? () => setPhoneFocused(true) : undefined} onBlur={field.key === "phone" ? () => setPhoneFocused(false) : undefined} className={`text-right ${field.key === "phone" && phoneError ? inputErrorClass : inputClass}`} />
          {field.key === "phone" && phoneFocused && !draft.phone && accountPhone && (
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setDraft((current) => ({ ...current, phone: accountPhone }))} className="mt-1.5 inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] font-bold text-primary transition-colors hover:bg-primary/10">
              <User size={13} aria-hidden="true" />شماره خودم: <span dir="ltr">{toP(accountPhone)}</span>
            </button>
          )}
          {field.key === "phone" && phoneError && <p id="profile-address-phone-error" role="alert" className="mt-1.5 text-[11px] font-bold text-red-600">{phoneError}</p>}
        </div>)}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60" aria-busy={Boolean(saving)}>{saving ? <><HeartbeatLoader />{"در حال ذخیره…"}</> : "ذخیره آدرس"}</button>
      </form>
    )}
  </BottomSheet>;
}
