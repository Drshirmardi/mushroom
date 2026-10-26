import { z } from "zod";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** ارقام فارسی/عربی را به معادل لاتین تبدیل می‌کند */
export function normalizeDigits(value: string): string {
    return value.replace(/[۰-۹٠-٩]/g, (digit) => {
        const persianIndex = PERSIAN_DIGITS.indexOf(digit);
        if (persianIndex !== -1) return String(persianIndex);
        return String(ARABIC_DIGITS.indexOf(digit));
    });
}

/** نمایش یکدست ارقام تلفن، مستقل از زبان صفحه‌کلید. */
export function formatPhoneDigits(value: string): string {
    return normalizeDigits(value)
        .replace(/\D/g, "")
        .replace(/[0-9]/g, digit => PERSIAN_DIGITS.charAt(Number(digit)));
}

/**
 * ورودی شماره موبایل را به شکل استاندارد 09xxxxxxxxx نرمال می‌کند.
 * پیش‌شماره‌های +98 و 0098 و 98 و جداکننده‌های فاصله/خط تیره پشتیبانی می‌شوند.
 */
export function normalizePhone(value: string): string {
    let phone = normalizeDigits(value).replace(/[\s\-()]/g, "");
    if (phone.startsWith("+98")) phone = `0${phone.slice(3)}`;
    else if (phone.startsWith("0098")) phone = `0${phone.slice(4)}`;
    else if (phone.startsWith("98") && phone.length === 12) phone = `0${phone.slice(2)}`;
    return phone;
}

export const IRANIAN_PHONE_PATTERN = /^09\d{9}$/;

export const nameSchema = z
    .string()
    .trim()
    .min(3, "نام و نام خانوادگی را کامل وارد کنید")
    .max(60, "نام وارد شده طولانی است");

export const phoneSchema = z
    .string()
    .min(1, "شماره موبایل را وارد کنید")
    .refine(
        (value) => IRANIAN_PHONE_PATTERN.test(normalizePhone(value)),
        "شماره موبایل معتبر نیست؛ نمونه: ۰۹۱۲۳۴۵۶۷۸۹",
    );

export const loginPasswordSchema = z.string().min(1, "رمز عبور را وارد کنید");

export const signupPasswordSchema = z
    .string()
    .min(15, "رمز عبور باید حداقل ۱۵ کاراکتر باشد")
    .max(128, "رمز عبور باید حداکثر ۱۲۸ کاراکتر باشد");
