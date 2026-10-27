import { describe, expect, it } from "vitest";
import fa from "../messages/fa.json";
import en from "../messages/en.json";
import zh from "../messages/zh-CN.json";

function leafKeys(value: unknown, path = ""): string[] {
    if (typeof value !== "object" || value === null) return [path];
    return Object.entries(value).flatMap(([key, child]) => leafKeys(child, `${path}.${key}`)).sort();
}

describe("complete web translations", () => {
    for (const [locale, messages] of [["en", en], ["zh-CN", zh]] as const) {
        it(`${locale} has the same content and error keys as Persian`, () => {
            expect(leafKeys(messages)).toEqual(leafKeys(fa));
            expect(messages.Common.appNotice).toBeTruthy();
            expect(messages.Auth.errors.OTP_INVALID).toBeTruthy();
        });
    }
});
