
"use client";

import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthErrorAlert } from "./AuthErrorAlert";
import {
  requestOtp,
  resendOtp,
  verifyOtp,
  type OtpChallenge,
} from "@/services/auth";
import { normalizeDigits, normalizePhone } from "@/lib/validation";

const OTP_LENGTH = 6;

export function OtpAuthForm({
  onAuthenticated,
  requireTerms = false,
}: {
  onAuthenticated: (roles: string[]) => void;
  requireTerms?: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [remember, setRemember] = useState(true);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);

  // Six separate OTP digits
  const [digits, setDigits] = useState<string[]>(
    () => Array(OTP_LENGTH).fill("")
  );

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [terms, setTerms] = useState(false);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep the existing API contract unchanged
  const code = digits.join("");
  const isCodeComplete = digits.every((digit) => digit.length === 1);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now()),
      1000
    );

    return () => window.clearInterval(timer);
  }, []);

  // Autofocus the first OTP box when challenge appears
  useEffect(() => {
    if (challenge) {
      codeRefs.current[0]?.focus();
    }
  }, [challenge]);

  const seconds = (date: string) =>
    Math.max(
      0,
      Math.ceil((new Date(date).getTime() - now) / 1000)
    );

  const focusDigit = (index: number) => {
    codeRefs.current[index]?.focus();
  };

  const resetDigits = () => {
    setDigits(Array(OTP_LENGTH).fill(""));
  };

  const cleanDigits = (value: string) =>
    normalizeDigits(value).replace(/\D/g, "");

  // Insert one or multiple digits into the OTP boxes
  const insertDigits = (index: number, rawValue: string) => {
    const cleaned = cleanDigits(rawValue);
    if (!cleaned) return;

    // Full OTP from paste or mobile autofill
    if (cleaned.length >= OTP_LENGTH) {
      const next = cleaned.slice(0, OTP_LENGTH).split("");
      setDigits(next);
      focusDigit(OTP_LENGTH - 1);
      return;
    }

    setDigits((previous) => {
      const next = [...previous];

      for (
        let i = 0;
        i < cleaned.length && index + i < OTP_LENGTH;
        i++
      ) {
        next[index + i] = cleaned[i];
      }

      return next;
    });

    focusDigit(
      Math.min(index + cleaned.length, OTP_LENGTH - 1)
    );
  };

  const handleDigitChange = (
    index: number,
    value: string
  ) => {
    const cleaned = cleanDigits(value);

    if (!cleaned) {
      setDigits((previous) => {
        const next = [...previous];
        next[index] = "";
        return next;
      });
      return;
    }

    insertDigits(index, cleaned);
  };

  const handleDigitKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "Backspace") {
      if (!digits[index] && index > 0) {
        event.preventDefault();

        setDigits((previous) => {
          const next = [...previous];
          next[index - 1] = "";
          return next;
        });

        focusDigit(index - 1);
      }

      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusDigit(Math.max(0, index - 1));
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusDigit(Math.min(OTP_LENGTH - 1, index + 1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusDigit(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusDigit(OTP_LENGTH - 1);
      return;
    }

    // Block non-numeric keyboard characters
    // without blocking shortcuts such as Ctrl+V
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !cleanDigits(event.key)
    ) {
      event.preventDefault();
    }
  };

  const handleDigitPaste = (
    event: ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    event.preventDefault();

    const pasted = event.clipboardData.getData("text");
    const cleaned = cleanDigits(pasted);

    if (!cleaned) return;

    insertDigits(index, cleaned);
  };

  // Existing authentication logic
  const send = async () => {
    setBusy(true);
    setError(null);

    const result = await requestOtp({
      phone: normalizePhone(phone),
      remember,
    });

    setBusy(false);

    if (result.ok) {
      setChallenge(result.challenge);
    } else {
      setError(result.message);
    }
  };

  const resend = async () => {
    if (!challenge) return;

    setBusy(true);
    setError(null);

    const result = await resendOtp(challenge.challengeId);

    setBusy(false);

    if (result.ok) {
      resetDigits();
      setChallenge(result.challenge);
      focusDigit(0);
    } else {
      setError(result.message);
    }
  };

  const verify = async () => {
    if (!challenge || !isCodeComplete) return;

    setBusy(true);
    setError(null);

    const result = await verifyOtp(
      challenge.challengeId,
      code
    );

    setBusy(false);

    if (result.ok) {
      onAuthenticated([...result.roles]);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="space-y-5">
      {error && <AuthErrorAlert message={error} />}

      {!challenge ? (
        <>
          <label className="block text-sm font-medium">
            شماره موبایل

            <input
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
              className="mt-2 h-12 w-full rounded-xl border border-input bg-transparent px-4 text-left outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={remember}
              onCheckedChange={(value) =>
                setRemember(value === true)
              }
            />
            مرا به خاطر بسپار
          </label>

          {requireTerms && (
            <label className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <Checkbox
                className="mt-1"
                checked={terms}
                onCheckedChange={(value) =>
                  setTerms(value === true)
                }
              />
              شرایط استفاده فعلی را خوانده‌ام و می‌پذیرم.
            </label>
          )}

          <button
            type="button"
            disabled={
              busy ||
              phone.trim().length < 10 ||
              (requireTerms && !terms)
            }
            onClick={() => void send()}
            className="press inline-flex h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "در حال ارسال…" : "ارسال کد"}
          </button>
        </>
      ) : (
        <>
          {/* OTP SENT MESSAGE */}
          <div className="rounded-xl bg-primary/5 p-3 text-sm leading-6">
            <b>کد ارسال شد</b>

            <p className="text-muted-foreground">
              مقصد:{" "}
              <span dir="ltr">
                {challenge.destinationMasked}
              </span>
            </p>
          </div>

          {/* SIX-DIGIT OTP INPUT */}
          <div className="space-y-3">
            <label
              id="otp-input-label"
              className="block text-sm font-medium"
            >
              کد یک‌بارمصرف
            </label>

            <div
              dir="ltr"
              role="group"
              aria-labelledby="otp-input-label"
              className="flex w-full items-center justify-center gap-1.5 sm:gap-2"
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    codeRefs.current[index] = element;
                  }}
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                  maxLength={1}
                  value={digit}
                  disabled={busy}
                  aria-label={`رقم ${index + 1} از ${OTP_LENGTH}`}
                  onChange={(event) =>
                    handleDigitChange(
                      index,
                      event.target.value
                    )
                  }
                  onKeyDown={(event) =>
                    handleDigitKeyDown(event, index)
                  }
                  onPaste={(event) =>
                    handleDigitPaste(event, index)
                  }
                  onFocus={(event) =>
                    event.currentTarget.select()
                  }
                  className={[
                    "size-12 max-[360px]:size-10",
                    "shrink-0 rounded-xl border",
                    "bg-transparent text-center",
                    "text-2xl font-semibold",
                    "tabular-nums",
                    "outline-none",
                    "transition-all duration-150",
                    "focus:border-primary",
                    "focus:ring-2",
                    "focus:ring-primary/30",
                    "focus:ring-offset-2",
                    "focus:ring-offset-background",
                    "disabled:cursor-not-allowed",
                    "disabled:opacity-50",
                    digit
                      ? "border-primary/50"
                      : "border-input",
                  ].join(" ")}
                />
              ))}
            </div>

            {/* OTP EXPIRATION */}
            <p
              aria-live="polite"
              className="text-center text-xs text-muted-foreground"
            >
              اعتبار کد:{" "}
              {seconds(
                challenge.expiresAt
              ).toLocaleString("fa-IR")}{" "}
              ثانیه
            </p>
          </div>

          {/* VERIFY */}
          <button
            type="button"
            disabled={
              busy ||
              !isCodeComplete ||
              seconds(challenge.expiresAt) === 0
            }
            onClick={() => void verify()}
            className="press inline-flex h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "در حال بررسی…" : "تأیید و ادامه"}
          </button>

          {/* CHANGE PHONE */}
          <div className="flex justify-start text-sm">
            <button
              type="button"
              onClick={() => {
                setChallenge(null);
                resetDigits();
                setError(null);
              }}
              className="text-primary"
            >
              تغییر شماره
            </button>
          </div>

          {/* RESEND OTP - SEPARATE BOTTOM LINE */}
          <div className="flex justify-center border-t border-border/50 pt-4 text-sm">
            <button
              type="button"
              disabled={
                busy ||
                seconds(
                  challenge.resendAvailableAt
                ) > 0
              }
              onClick={() => void resend()}
              className="text-primary transition-colors disabled:text-muted-foreground"
            >
              {seconds(
                challenge.resendAvailableAt
              ) > 0
                ? `ارسال دوباره تا ${seconds(
                  challenge.resendAvailableAt
                ).toLocaleString("fa-IR")}`
                : "ارسال دوباره"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
