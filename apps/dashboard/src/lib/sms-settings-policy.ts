import type { OtpPolicy } from "./sms-settings-api";

export function otpPolicyPayload(policy: OtpPolicy) {
  return {
    enabled: policy.enabled,
    codeLength: policy.codeLength,
    expiresInSeconds: policy.expiresInSeconds,
    resendCooldownSeconds: policy.resendCooldownSeconds,
    maxVerifyAttempts: policy.maxVerifyAttempts,
    phoneRequestLimit: policy.phoneRequestLimit,
    requestWindowSeconds: policy.requestWindowSeconds,
  };
}
