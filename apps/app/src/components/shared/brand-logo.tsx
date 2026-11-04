import Image from "next/image";

const parts = ["body-1", "body-2", "body-3", "dot-3", "dot-1", "dot-2"];

/** The approved landing mark; its owning brand text supplies the accessible name. */
export function BrandLogo({ animated = false }: { animated?: boolean }) {
  if (!animated) return <Image className="app-brand-logo" src="/brand/shirmardi-logo.svg" width={64} height={32} alt="" aria-hidden="true" unoptimized loading="eager" />;
  return <svg className="app-brand-logo app-brand-logo--animated" viewBox="0 0 1030 516" width={64} height={32} aria-hidden="true" focusable="false">
    {parts.map(part => <use key={part} className="app-brand-logo__part" href={`/brand/shirmardi-logo.svg#${part}`} />)}
  </svg>;
}
