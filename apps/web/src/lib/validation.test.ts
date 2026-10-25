import { describe, expect, it } from "vitest";

import { formatPhoneDigits, normalizePhone, phoneSchema, signupPasswordSchema } from "./validation";

describe("landing phone entry", () => {
    it.each(["9123456789", "۹۱۲۳۴۵۶۷۸۹", "٩١٢٣٤٥٦٧٨٩"])("shows %s as Persian digits", value => {
        expect(formatPhoneDigits(value)).toBe("۹۱۲۳۴۵۶۷۸۹");
    });

    it("removes letters, punctuation, and separators from pasted content", () => {
        expect(formatPhoneDigits("abc۹۱۲ 34-٥۶۷۸۹!الف")).toBe("۹۱۲۳۴۵۶۷۸۹");
        expect(formatPhoneDigits("letters! حروف")).toBe("");
    });

    it("keeps a ten-digit subscriber number valid with the separate Iran prefix", () => {
        const subscriber = normalizePhone(formatPhoneDigits("9123456789"));
        expect(phoneSchema.safeParse(`0${subscriber}`).success).toBe(true);
    });

    it.each(["09123456789", "+98 (912) 345-6789", "00989123456789"])("preserves canonical submission for %s", value => {
        const canonical = normalizePhone(formatPhoneDigits(value));
        expect(canonical).toBe("09123456789");
        expect(phoneSchema.safeParse(canonical).success).toBe(true);
    });
});

describe("signup password validation", () => {
    it("matches the API length contract and accepts Unicode passphrases", () => {
        expect(signupPasswordSchema.safeParse("چهار واژه امن فارسی").success).toBe(true);
        expect(signupPasswordSchema.safeParse("a".repeat(14)).success).toBe(false);
        expect(signupPasswordSchema.safeParse("a".repeat(129)).success).toBe(false);
    });
});
