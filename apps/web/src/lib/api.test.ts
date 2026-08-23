import { describe, expect, it } from "vitest";

import { appUrl, resolvePostLoginUrl } from "./api";

describe("post-login destination", () => {
    it("accepts configured app origins and rejects open redirects", () => {
        expect(resolvePostLoginUrl("http://localhost:3002/patients/1?tab=medical")).toBe(
            "http://localhost:3002/patients/1?tab=medical",
        );
        expect(resolvePostLoginUrl("https://attacker.example/dashboard")).toBe(appUrl);
        expect(resolvePostLoginUrl("not-a-url")).toBe(appUrl);
    });
});
