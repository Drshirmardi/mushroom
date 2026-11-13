"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { StoreIcon } from "./store-icon";
import styles from "./receipt-page.module.css";
import { Button } from "@/components/ui/button";
import type { CommerceOrder, CommerceReceipt } from "@/lib/commerce-catalog-api";
import { formatPrice, toP } from "@/lib/format";

export function OrderPaymentSuccess({ order, receipt, onClose, onTrack }: {
  order: CommerceOrder;
  receipt: CommerceReceipt;
  onClose: () => void;
  onTrack: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const element = dialog.current;
    const previouslyFocused = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, []);

  return <dialog ref={dialog} aria-labelledby="order-paid-title" aria-describedby="order-paid-description"
    className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-3xl border-0 bg-white p-0 text-foreground shadow-xl backdrop:bg-slate-900/35"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div className="relative p-6" initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <button type="button" aria-label="بستن تأیید پرداخت" onClick={onClose} className="absolute left-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"><StoreIcon name="close" size={18} /></button>
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600" aria-hidden="true">
        <motion.span initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, delay: 0.2 }}>
          <StoreIcon name="checkCircle" size={52} />
        </motion.span>
      </div>
      <h2 id="order-paid-title" className="text-center text-lg font-semibold">پرداختت با موفقیت انجام شد!</h2>
      <p id="order-paid-description" className="mt-2 text-center text-sm leading-7 text-muted-foreground">سفارشت ثبت شد؛ مراحل آماده‌سازی را از بخش پیگیری سفارش ببین.</p>
      <dl className="my-5 space-y-3 rounded-2xl bg-muted/60 p-4 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">شماره سفارش</dt><dd className="font-iransans-fanum">{toP(order.orderNumber)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">مبلغ پرداخت‌شده</dt><dd className="font-iransans-fanum text-primary">{formatPrice(BigInt(receipt.totalAmountToman))} تومان</dd></div>
        {receipt.method && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">روش پرداخت</dt><dd>{receipt.method === "WALLET" ? "کیف پول" : receipt.method === "FREE" ? "بدون نیاز به پرداخت" : "درگاه بانکی"}</dd></div>}
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">روش دریافت</dt><dd>{order.shippingMethod === "PICKUP" ? "دریافت حضوری" : "ارسال با پیک"}</dd></div>
      </dl>
      <div className={styles.dialogActions}><Button className="w-full" onClick={onTrack}>پیگیری سفارش</Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>مشاهده جزئیات سفارش</Button></div>
    </motion.div>
  </dialog>;
}
