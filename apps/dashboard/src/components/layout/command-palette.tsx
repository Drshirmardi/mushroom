"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpLeft, Search, X } from "lucide-react";
import { NAV } from "@/lib/nav";

export function CommandPalette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const show = () => { setQuery(""); if (!dialog.current?.open) dialog.current?.showModal(); };

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close(); else show();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const pages = NAV.filter(item => `${item.label} ${item.group}`.includes(query.trim()));
  return <>
    <button type="button" onClick={show} className="dashboard-search" aria-label="جستجو در صفحه‌های پنل">
      <Search size={17} aria-hidden="true" /><span className="hidden sm:inline">جستجو در پنل…</span><kbd className="ms-auto hidden sm:inline" dir="ltr">Ctrl K</kbd>
    </button>
    <dialog ref={dialog} className="dashboard-command" aria-labelledby="dashboard-command-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="flex items-center gap-3 border-b border-border p-4">
        <Search size={19} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <label id="dashboard-command-title" className="sr-only" htmlFor="dashboard-page-search">جستجو در صفحه‌های پنل</label>
        <input id="dashboard-page-search" autoFocus type="search" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" placeholder="کدام بخش را می‌خواهید؟" value={query} onChange={event => setQuery(event.target.value)} />
        <button type="button" onClick={() => dialog.current?.close()} className="dashboard-icon" aria-label="بستن جستجو"><X size={18} /></button>
      </div>
      <div className="max-h-[55dvh] overflow-y-auto p-2">
        {pages.length ? <ul>{pages.map(({ href, label, group, icon: Icon }) => <li key={href}><Link className="dashboard-command-link" href={href} onClick={() => dialog.current?.close()}><Icon size={18} aria-hidden="true" /><span className="flex-1">{label}<small className="ms-2 text-muted-foreground">{group}</small></span><ArrowUpLeft size={15} aria-hidden="true" /></Link></li>)}</ul> : <p className="p-6 text-center text-sm text-muted-foreground">صفحه‌ای با این نام پیدا نشد.</p>}
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">جستجو در نام صفحه‌ها · بستن با Esc</p>
    </dialog>
  </>;
}
