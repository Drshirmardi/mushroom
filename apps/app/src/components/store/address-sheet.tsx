"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { BottomSheet } from "../shared/bottom-sheet";
import { AddressFormSheet } from "../profile/address-form-sheet";
import { Button } from "../ui/button";
import type { CommerceAddress } from "../../lib/commerce-catalog-api";

type Props = { authenticated: boolean; accessToken: string | null; addresses: CommerceAddress[]; selectedId?: string | null; onSelect: (address: CommerceAddress) => void; onAddresses: (addresses: CommerceAddress[]) => void; onLogin: () => void; onClose: () => void };

export function AddressSheet({ authenticated, accessToken, addresses, selectedId, onSelect, onAddresses, onLogin, onClose }: Props) {
  const [showForm, setShowForm] = useState(false);
  if (showForm && accessToken) return <AddressFormSheet accessToken={accessToken} onClose={() => setShowForm(false)} onCreated={created => { onAddresses([created, ...addresses]); onSelect(created); onClose(); }} />;
  return <BottomSheet ariaLabel="انتخاب آدرس" onClose={onClose}>
    <div className="store-address-sheet">
      <div className="store-sheet-header"><h2>انتخاب آدرس</h2><button type="button" aria-label="بستن" onClick={onClose} className="store-sheet-close"><X size={20} aria-hidden="true" /></button></div>
      {!authenticated ? <div className="store-address-guest"><p>برای مشاهده و مدیریت آدرس‌های تحویل وارد حساب شوید.</p><Button onClick={onLogin}>ورود و مدیریت آدرس‌ها</Button></div> : <>
        {!addresses.length && <p className="store-address-empty">هنوز آدرسی ثبت نشده است.</p>}
        <div className="store-address-list" role="group" aria-label="آدرس‌های شما">{addresses.map(item => <button key={item.id} type="button" aria-pressed={selectedId === item.id} onClick={() => { onSelect(item); onClose(); }} className={`store-address-option${selectedId === item.id ? " store-address-option--selected" : ""}`}>
          <span className="store-address-radio" aria-hidden="true">{selectedId === item.id && <Check size={14} />}</span><span className="store-address-text"><strong>{item.label} · {item.recipientName}</strong><span>{item.province}، {item.city}، {item.line1}</span></span>{item.isDefault && <span className="store-default-badge">پیش‌فرض</span>}
        </button>)}</div>
        <Button variant="secondary" className="store-full-button" onClick={() => setShowForm(true)}><Plus size={18} aria-hidden="true" />افزودن آدرس جدید</Button>
      </>}
    </div>
  </BottomSheet>;
}
