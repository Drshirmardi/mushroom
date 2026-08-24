import { describe, expect, it } from "vitest";

import { signupPasswordSchema } from "./validation";

describe("signup password validation", () => {
    it("matches the API length contract and accepts Unicode passphrases", () => {
        expect(signupPasswordSchema.safeParse("چهار واژه امن فارسی").success).toBe(true);
        expect(signupPasswordSchema.safeParse("a".repeat(14)).success).toBe(false);
        expect(signupPasswordSchema.safeParse("a".repeat(129)).success).toBe(false);
    });
});
