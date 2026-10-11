import { describe, expect, it } from "vitest";
import type { OtpPolicy } from "./sms-settings-api";
import { otpPolicyPayload } from "./sms-settings-policy";

describe("otpPolicyPayload", () => {
  it("sends only fields accepted by the update DTO", () => {
    const policy: OtpPolicy = { id: "default", enabled: true, codeLength: 6, expiresInSeconds: 120, resendCooldownSeconds: 60, maxVerifyAttempts: 5, phoneRequestLimit: 3, requestWindowSeconds: 900, updatedAt: "2026-10-12T00:00:00.000Z" };
    expect(otpPolicyPayload(policy)).toEqual({ enabled: true, codeLength: 6, expiresInSeconds: 120, resendCooldownSeconds: 60, maxVerifyAttempts: 5, phoneRequestLimit: 3, requestWindowSeconds: 900 });
  });
});
