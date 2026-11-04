"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Check, Hash, MapPin, Phone, Plus, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { AddressFormSheet } from "@/components/profile/address-form-sheet";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { commerceErrorMessage, getCommerceAddresses, updateCommerceAddress, type CommerceAddress } from "@/lib/commerce-catalog-api";

function AddressSkeleton() {
  return <div role="status" aria-busy="true" className="space-y-3"><span className="sr-only">در حال دریافت آدرس‌ها…</span>{[0, 1].map((row) => <div key={row} className="rounded-2xl border border-border bg-white p-4"><span className="block h-4 w-1/3 skeleton rounded bg-muted" /><span className="mt-2 block h-3 w-full skeleton rounded bg-muted" /><span className="mt-2 block h-3 w-2/3 skeleton rounded bg-muted" /></div>)}</div>;
}

function AddressCard({ address, onPick }: { address: CommerceAddress; onPick: (address: CommerceAddress) => void }) {
  return <button
    type="button"
    onClick={() => onPick(address)}
    aria-label={address.isDefault ? `آدرس ${address.label}، پیش‌فرض` : `انتخاب ${address.label} به‌عنوان پیش‌فرض`}
    className={`block w-full cursor-pointer rounded-2xl border p-4 text-right shadow-sm transition-all hover:bg-muted/40 active:scale-[0.99] ${address.isDefault ? "border-blue-200 bg-blue-50/50" : "border-border bg-white"}`}
  >
    <span className="flex items-center justify-between gap-2">
      <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-foreground">
        <span className="rounded-lg bg-blue-50 p-1.5 text-blue-700"><MapPin size={14} aria-hidden="true" /></span>
        <span className="truncate">{address.label}</span>
      </span>
      {address.isDefault && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white"><Check size={10} strokeWidth={3.5} aria-hidden="true" />پیش‌فرض</span>}
    </span>
    <span className="mt-3 flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><User size={12} aria-hidden="true" />{address.recipientName}</span>
      <span className="text-xs leading-5 text-muted-foreground">{address.province}، {address.city}، {address.line1}</span>
      <span dir="ltr" className="inline-flex items-center gap-1.5 self-start text-xs tabular-nums text-muted-foreground">{address.phone}<Phone size={12} aria-hidden="true" /></span>
      {Boolean(address.postalCode) && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Hash size={12} aria-hidden="true" /><span dir="ltr" className="tabular-nums">{String(address.postalCode)}</span></span>}
    </span>
    {!address.isDefault && <span className="mt-3 block border-t border-border pt-2.5 text-[11px] font-bold text-blue-700">انتخاب به‌عنوان پیش‌فرض</span>}
  </button>;
}

export default function ProfileAddressesPage() {
  const router = useRouter(); const { authentication } = useAuthSession();
  const [addresses, setAddresses] = useState<CommerceAddress[] | null>(null); const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false); const [confirming, setConfirming] = useState<CommerceAddress | null>(null);
  const [confirmingBusy, setConfirmingBusy] = useState(false); const [confirmError, setConfirmError] = useState<string | null>(null);
  const load = async () => {
    try { setAddresses(await getCommerceAddresses(authentication.accessToken)); }
    catch (cause) { setError(commerceErrorMessage(cause)); }
  };
  useEffect(() => { void load(); }, [authentication.accessToken]);
  useEffect(() => {
    if (!confirming) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirming(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);
  const handleCreated = (created: CommerceAddress) => {
    setAddresses((current) => current ? [created, ...current] : [created]);
    setSheetOpen(false);
  };
  const confirmDefault = async () => {
    if (!confirming || confirmingBusy) return;
    setConfirmingBusy(true); setConfirmError(null);
    try {
      await updateCommerceAddress(authentication.accessToken, confirming.id, { isDefault: true });
      await load();
      setConfirming(null);
    } catch (cause) { setConfirmError(commerceErrorMessage(cause)); } finally { setConfirmingBusy(false); }
  };
  return <div className="profile-scope"><PageHeader title="آدرس‌ها" onBack={() => router.back()} /><div className="space-y-3 px-4 pb-4 pt-4">
    {!addresses && !error && <AddressSkeleton />}
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {addresses && addresses.length === 0 && <div className="rounded-2xl border border-border bg-white p-8 text-center"><MapPin size={28} className="mx-auto mb-3 text-muted-foreground/50" aria-hidden="true" /><p className="text-sm font-bold text-foreground">هنوز آدرسی ثبت نشده است.</p><p className="mt-1 text-xs text-muted-foreground">آدرس‌های تحویل سفارش‌های شما اینجا نمایش داده می‌شوند.</p></div>}
    {addresses && addresses.length > 0 && addresses.map((address) => <AddressCard key={address.id} address={address} onPick={(picked) => { if (!picked.isDefault) { setConfirmError(null); setConfirming(picked); } }} />)}
    <div className="flex justify-end pt-3">
      <button type="button" aria-label="افزودن آدرس جدید" onClick={() => setSheetOpen(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg transition-all hover:bg-blue-800 active:scale-95"><Plus size={24} strokeWidth={2.5} aria-hidden="true" /></button>
    </div>
  </div>
  <AnimatePresence>{sheetOpen && <AddressFormSheet accessToken={authentication.accessToken} onCreated={handleCreated} onClose={() => setSheetOpen(false)} />}</AnimatePresence>
  <AnimatePresence>{confirming && <BottomSheet title="آدرس پیش‌فرض" onClose={() => setConfirming(null)}>
    <p className="text-sm leading-6 text-foreground">«{confirming.label}» به‌عنوان آدرس پیش‌فرض تحویل انتخاب شود؟</p>
    <p className="mt-1 text-xs text-muted-foreground">{confirming.province}، {confirming.city}، {confirming.line1}</p>
    {confirmError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{confirmError}</p>}
    <div className="mt-4 space-y-2">
      <button type="button" disabled={confirmingBusy} onClick={() => void confirmDefault()} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60" aria-busy={Boolean(confirmingBusy)}>{confirmingBusy ? <><HeartbeatLoader />{"در حال ذخیره…"}</> : "تأیید و انتخاب"}</button>
      <button type="button" onClick={() => setConfirming(null)} className="w-full rounded-2xl py-3 text-sm font-bold text-muted-foreground transition-colors active:bg-muted">انصراف</button>
    </div>
  </BottomSheet>}</AnimatePresence></div>;
}
