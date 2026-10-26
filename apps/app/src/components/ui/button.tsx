import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  busy?: boolean;
};

export function Button({ variant = "primary", busy = false, className, disabled, type = "button", children, ...props }: Props) {
  return <button {...props} type={type} disabled={disabled || busy} aria-busy={busy || undefined}
    className={cn("patient-button", `patient-button--${variant}`, className)}>{children}</button>;
}
