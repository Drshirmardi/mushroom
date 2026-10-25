import { describe, expect, it } from "vitest";
import { landingLoginUrl, postAuthenticationUrl } from "./auth-navigation";

describe("landing authentication navigation", () => {
    it("keeps patient and operational roles on their existing destinations", () => {
        expect(postAuthenticationUrl(["PATIENT"], null)).toBe("http://localhost:3001");
        for (const role of ["ADMIN", "DOCTOR", "STAFF"]) {
            expect(postAuthenticationUrl([role], null)).toBe("http://localhost:3002");
        }
    });

    it("retains allowed return destinations and rejects external or executable ones", () => {
        expect(postAuthenticationUrl(["PATIENT"], "http://localhost:3001/assessment?resume=1"))
            .toBe("http://localhost:3001/assessment?resume=1");
        for (const candidate of ["https://example.com", "javascript:alert(1)", "//example.com", "http://localhost:3001.evil.test/"]) {
            expect(postAuthenticationUrl(["ADMIN"], candidate)).toBe("http://localhost:3001");
        }
    });

    it("encodes old entry links as a landing dialog without losing the return query", () => {
        const next = "http://localhost:3001/assessment?resume=1&source=web";
        const url = new URL(landingLoginUrl(next), "http://localhost:3000");
        expect(url.pathname).toBe("/");
        expect(url.searchParams.get("login")).toBe("1");
        expect(url.searchParams.get("next")).toBe(next);
        expect(landingLoginUrl()).toBe("/?login=1");
    });
});
