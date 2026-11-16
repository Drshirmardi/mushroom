import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";
import { HeartbeatLoader } from "../shared/heartbeat-loader";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  busy?: boolean;
};

export function Button({ variant = "primary", busy = false, className, disabled, type = "button", children, ...props }: Props) {
  return <button {...props} type={type} disabled={disabled || busy} aria-busy={busy || undefined}
    className={cn("patient-button", `patient-button--${variant}`, className)}>{busy && <HeartbeatLoader className={props["aria-label"] ? "m-0" : ""} />}{!(busy && props["aria-label"]) && children}</button>;
}
