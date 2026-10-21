"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";
const key = "dashboard-appearance-v1";
const labels = { light: "روشن", dark: "تیره", system: "سیستم" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const preference = useRef<Theme>("system");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    try {
      const saved = localStorage.getItem(key);
      if (saved === "light" || saved === "dark") preference.current = saved;
    } catch { /* Use the system preference when storage is unavailable. */ }
    setTheme(preference.current);
    const apply = () => document.documentElement.classList.toggle("dark", preference.current === "dark" || (preference.current === "system" && media.matches));
    apply();
    media.addEventListener("change", apply);
    const change = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      preference.current = event.newValue === "light" || event.newValue === "dark" ? event.newValue : "system";
      setTheme(preference.current); apply();
    };
    window.addEventListener("storage", change);
    return () => { media.removeEventListener("change", apply); window.removeEventListener("storage", change); };
  }, []);

  const cycle = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    preference.current = next;
    try { localStorage.setItem(key, next); } catch { /* The current page can still change theme. */ }
    document.documentElement.classList.toggle("dark", next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
    setTheme(next);
  };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return <button type="button" onClick={cycle} className="dashboard-icon" aria-label={`تم ${labels[theme]}؛ تغییر تم`} title={`تم ${labels[theme]}`}><Icon size={18} /></button>;
}
