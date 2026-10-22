"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { useUiStore } from "@/stores/ui";

export function GlobalSheet() {
  const sheet = useUiStore(state => state.sheet);
  const setSheet = useUiStore(state => state.setSheet);
  const router = useRouter();
  const [notice, setNotice] = useState<{ sheet: typeof sheet; text: string } | null>(null);
  const open = (href: string) => { setSheet(null); router.push(href); };
  const productId = typeof sheet?.data?.productId === "string" ? sheet.data.productId : typeof sheet?.data?.id === "string" ? sheet.data.id : null;
  const appointmentId = typeof sheet?.data?.appointmentId === "string" ? sheet.data.appointmentId : typeof sheet?.data?.id === "string" ? sheet.data.id : null;
  const copyProduct = async () => {
    if (!productId) return;
    try {
      await navigator.clipboard.writeText(new URL(`/store/products/${encodeURIComponent(productId)}`, window.location.origin).toString());
      setNotice({ sheet, text: "نشانی محصول کپی شد." });
    } catch { setNotice({ sheet, text: "کپی نشانی ممکن نشد؛ نشانی صفحهٔ محصول را مستقیماً کپی کنید." }); }
  };
  return <AnimatePresence>{sheet && <BottomSheet title="گزینه‌ها" onClose={() => setSheet(null)}>
    {sheet.type === "medAction" && <div className="space-y-3"><p className="text-sm leading-7">ثبت مصرف دارو و فعالیت‌های درمانی از برنامهٔ منتشرشدهٔ شما انجام می‌شود.</p><button type="button" onClick={() => open("/treatment")} className="w-full rounded-xl bg-primary p-4 font-bold text-white">مشاهدهٔ برنامه و ثبت مصرف</button></div>}
    {sheet.type === "appointmentCancel" && <div className="space-y-3"><p className="text-sm leading-7">پیش از لغو، جزئیات و وضعیت جاری نوبت را بررسی کنید.</p><button type="button" onClick={() => open(appointmentId ? `/appointments/${encodeURIComponent(appointmentId)}` : "/appointments")} className="w-full rounded-xl bg-primary p-4 font-bold text-white">بررسی و لغو نوبت</button></div>}
    {sheet.type === "shareProduct" && <div className="space-y-3">{productId ? <button type="button" onClick={() => void copyProduct()} className="w-full rounded-xl bg-primary p-4 font-bold text-white">کپی نشانی محصول</button> : <button type="button" onClick={() => open("/store")} className="w-full rounded-xl border border-border p-4 text-sm">انتخاب محصول از فروشگاه</button>}{notice?.sheet === sheet && <p role="status" className="text-sm">{notice.text}</p>}</div>}
    <button type="button" onClick={() => setSheet(null)} className="mt-3 w-full rounded-xl border border-border p-3 text-sm">بستن</button>
  </BottomSheet>}</AnimatePresence>;
}
