"use client";

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { BottomSheet } from "../shared/bottom-sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { commerceErrorMessage, createCommerceAddress, type CommerceAddress } from "../../lib/commerce-catalog-api";

type Props = {
  authenticated: boolean;
  accessToken: string | null;
  addresses: CommerceAddress[];
  selectedId?: string | null;
  onSelect: (address: CommerceAddress) => void;
  onAddresses: (addresses: CommerceAddress[]) => void;
  onLogin: () => void;
  onClose: () => void;
};

const EMPTY_DRAFT = { recipientName: "", phone: "", province: "", city: "", line1: "" };

/** Storefront address picker: real address list, local selection, real creation. No update endpoint exists, so no edit affordance is rendered. */
export function AddressSheet({ authenticated, accessToken, addresses, selectedId, onSelect, onAddresses, onLogin, onClose }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const canSave = [draft.recipientName, draft.phone, draft.province, draft.city, draft.line1].every((value) => value.trim().length > 0);
  const save = async () => {
    if (!accessToken || !canSave) return;
    setSaving(true); setError(null);
    try {
      const created = await createCommerceAddress(accessToken, {
        label: "خانه",
        recipientName: draft.recipientName.trim(),
        phone: draft.phone.trim(),
        province: draft.province.trim(),
        city: draft.city.trim(),
        line1: draft.line1.trim(),
      });
      onAddresses([created, ...addresses]);
      setDraft(EMPTY_DRAFT); setShowForm(false);
      onSelect(created);
    } catch (cause) { setError(commerceErrorMessage(cause)); }
    finally { setSaving(false); }
  };
  return <BottomSheet onClose={onClose}>
    <div className="store-address-sheet">
      <div className="store-sheet-header">
        <h2>انتخاب آدرس</h2>
        <button type="button" aria-label="بستن" onClick={onClose} className="store-sheet-close"><X size={20} aria-hidden="true" /></button>
      </div>
      {!authenticated ? (
        <div className="store-address-guest">
          <p>برای مشاهده و مدیریت آدرس‌های تحویل وارد حساب شوید.</p>
          <Button onClick={onLogin}>ورود و ادامه</Button>
        </div>
      ) : (<>
        {!showForm && <>
          {addresses.length === 0 && <p className="store-address-empty">هنوز آدرسی ثبت نشده است.</p>}
        {addresses.length > 0 && <div role="radiogroup" aria-label="آدرس‌های شما" className="store-address-list">
          {addresses.map((item) => {
            const selected = selectedId === item.id;
            return <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => { onSelect(item); onClose(); }}
              className={`store-address-option${selected ? " store-address-option--selected" : ""}`}
            >
              <span className="store-address-radio" aria-hidden="true">{selected && <Check size={14} aria-hidden="true" />}</span>
              <span className="store-address-text">
                <strong>{item.label} · {item.recipientName}</strong>
                <span>{item.province}، {item.city}، {item.line1}</span>
              </span>
              {item.isDefault && <span className="store-default-badge">پیش‌فرض</span>}
            </button>;
          })}
        </div>}
        {!showForm && (
          <Button variant="secondary" className="store-full-button" onClick={() => { setError(null); setShowForm(true); }}>
            <Plus size={18} aria-hidden="true" />افزودن آدرس جدید
          </Button>
        )}
        </>}
        {showForm && (
          <div className="store-address-form">
            <h3>آدرس جدید</h3>
            <div className="store-field"><label htmlFor="store-new-name">نام گیرنده</label><Input id="store-new-name" autoFocus placeholder="مثلاً علی رضایی" value={draft.recipientName} onChange={(event) => setDraft({ ...draft, recipientName: event.target.value })} /></div>
            <div className="store-field"><label htmlFor="store-new-phone">شماره تماس</label><Input id="store-new-phone" placeholder="۰۹…" inputMode="tel" dir="ltr" style={{ textAlign: "right" }} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></div>
            <div className="store-field"><label htmlFor="store-new-province">استان</label><Input id="store-new-province" placeholder="مثلاً تهران" value={draft.province} onChange={(event) => setDraft({ ...draft, province: event.target.value })} /></div>
            <div className="store-field"><label htmlFor="store-new-city">شهر</label><Input id="store-new-city" placeholder="مثلاً تهران" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></div>
            <div className="store-field"><label htmlFor="store-new-line">نشانی</label><Input id="store-new-line" placeholder="خیابان، کوچه، پلاک…" value={draft.line1} onChange={(event) => setDraft({ ...draft, line1: event.target.value })} /></div>
            {error && <p role="alert" className="store-form-error">{error}</p>}
            <Button busy={saving} disabled={!canSave} className="store-full-button" onClick={() => void save()}>{saving ? "در حال ذخیره…" : "ذخیره آدرس"}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>انصراف و بازگشت به آدرس‌ها</Button>
          </div>
        )}
      </>)}
    </div>
  </BottomSheet>;
}
