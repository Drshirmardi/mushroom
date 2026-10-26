"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { X } from "lucide-react";
import { postAuthenticationUrl } from "@/auth/auth-navigation";
import { LandingOtpForm } from "./LandingOtpForm";
import "./landing-auth.css";

export function LandingLoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const drag = useRef<{ startY: number; moved: boolean } | null>(null);
    const [offset, setOffset] = useState(0);
    const [closing, setClosing] = useState(false);
    const close = () => setClosing(true);

    useEffect(() => {
        if (!closing || !open) return;
        const timer = window.setTimeout(() => {
            onClose();
            setClosing(false);
            setOffset(0);
            drag.current = null;
        },
            window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
        return () => window.clearTimeout(timer);
    }, [closing, open, onClose]);

    useEffect(() => {
        if (!open) return;
        const element = dialog.current!;
        const focused = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        element.showModal();
        element.querySelector<HTMLElement>("input:not(:disabled), .landing-auth-primary:not(:disabled)")?.focus();
        const viewport = window.visualViewport;
        const updateViewport = () => {
            element.style.setProperty("--auth-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
            element.style.setProperty("--auth-viewport-top", `${viewport?.offsetTop ?? 0}px`);
        };
        updateViewport();
        viewport?.addEventListener("resize", updateViewport);
        viewport?.addEventListener("scroll", updateViewport);
        return () => {
            viewport?.removeEventListener("resize", updateViewport);
            viewport?.removeEventListener("scroll", updateViewport);
            element.close();
            document.body.style.overflow = previousOverflow;
            if (focused instanceof HTMLElement && focused.isConnected) focused.focus();
        };
    }, [open]);

    function endDrag(event: PointerEvent<HTMLButtonElement>) {
        if (!drag.current) return;
        const distance = Math.max(0, event.clientY - drag.current.startY);
        const moved = drag.current.moved;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (distance > 90) close();
        else { setOffset(0); if (moved) event.preventDefault(); }
    }

    return <dialog ref={dialog} className={`landing-auth-dialog ${closing ? "is-closing" : ""}`} aria-labelledby="landing-auth-title"
        onCancel={event => { event.preventDefault(); close(); }}>
        <div className="landing-auth-backdrop" aria-hidden="true" onClick={close} />
        <div className="landing-auth-position">
            <div className="landing-auth-panel" style={{ transform: offset ? `translateY(${offset}px)` : undefined }}>
                <button className="landing-auth-handle" type="button" aria-label="بستن پنجره ورود با کشیدن به پایین"
                    onPointerDown={event => {
                        drag.current = { startY: event.clientY, moved: false };
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={event => {
                        if (!drag.current) return;
                        const distance = Math.max(0, event.clientY - drag.current.startY);
                        if (distance > 6) drag.current.moved = true;
                        setOffset(distance);
                    }}
                    onPointerUp={endDrag} onPointerCancel={() => { drag.current = null; setOffset(0); }}
                    onClick={event => { if (event.detail === 0) close(); }}><span /></button>
                <button className="landing-auth-close" type="button" aria-label="بستن پنجره ورود" onClick={close}><X size={20} /></button>
                <LandingOtpForm active={open} onAuthenticated={roles => window.location.assign(postAuthenticationUrl(roles, new URLSearchParams(window.location.search).get("next")))} />
            </div>
        </div>
    </dialog>;
}
