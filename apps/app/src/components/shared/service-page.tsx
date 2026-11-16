import Link from "next/link";
import { ArrowRight, ArrowLeft, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toP } from "@/lib/format";

export function ServicePage({ title, description, icon: Icon, iconNode, backIcon, children, action, backHref = "/", backLabel = "خانه", onBack }: { title: string; description: string; icon?: LucideIcon; iconNode?: ReactNode; backIcon?: ReactNode; children: ReactNode; action?: ReactNode; backHref?: string; backLabel?: string; onBack?: () => void }) {
  const backContent = <>{backIcon ?? <ArrowRight size={18} aria-hidden="true" />}{backLabel}</>;
  return <main className="service-page" dir="rtl"><nav className="service-navigation" aria-label="مسیر صفحه">{onBack ? <button type="button" onClick={onBack}>{backContent}</button> : <Link href={backHref}>{backContent}</Link>}{action}</nav><header className="service-intro"><span className="service-intro-icon">{iconNode ?? (Icon && <Icon size={26} aria-hidden="true" />)}</span><h1>{title}</h1><p>{description}</p></header>{children}</main>;
}

export function ServiceSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="service-section"><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header><div className="service-stack">{children}</div></section>;
}

export function ServiceEmpty({ title, description, icon: Icon = Info, iconNode, actionIcon, href, action }: { title: string; description: string; icon?: LucideIcon; iconNode?: ReactNode; actionIcon?: ReactNode; href?: string; action?: string }) {
  return <div className="service-empty">{iconNode ?? <Icon size={26} aria-hidden="true" />}<h3>{title}</h3><p>{description}</p>{href && action && <Link href={href} className="service-text-action">{action}{actionIcon ?? <ArrowLeft size={17} aria-hidden="true" />}</Link>}</div>;
}

export function ServiceTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
  return <div className="service-tabs" role="group" aria-label="انتخاب بخش">{options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}

export function ServiceSteps({ steps, current }: { steps: string[]; current?: number }) {
  return <ol className="service-steps" aria-label="مراحل دریافت خدمت">{steps.map((step, index) => <li key={step} aria-current={current === index ? "step" : undefined}><span>{toP(index + 1)}</span>{step}</li>)}</ol>;
}
