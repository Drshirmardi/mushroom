"use client";

import { useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { HeartbeatLoader } from "./heartbeat-loader";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick: (event: MouseEvent<HTMLButtonElement>) => unknown;
};

/** Owns feedback for the clicked action while siblings share a disabled state. */
export function AsyncButton({ onClick, disabled, children, ...props }: Props) {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  return <button {...props} disabled={disabled || pending} aria-busy={pending || undefined} onClick={async event => {
    if (lock.current) return;
    lock.current = true; setPending(true);
    try { await onClick(event); }
    finally { lock.current = false; setPending(false); }
  }}>{pending && <HeartbeatLoader />}{children}</button>;
}
