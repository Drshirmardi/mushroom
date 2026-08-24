export const LOGIN_ATTEMPT_FINAL_OUTCOMES = [
  'SUCCESS',
  'INVALID_CREDENTIALS',
  'ACCOUNT_DISABLED',
] as const;

export type LoginAttemptFinalOutcome =
  (typeof LOGIN_ATTEMPT_FINAL_OUTCOMES)[number];

export interface LoginSubject {
  id: string;
  phone: string;
  status: 'ACTIVE' | 'DISABLED';
  passwordHash: string;
  roles: string[];
}

export interface ReserveLoginAttempt {
  phone?: string;
  recordedPhone: string;
  ipAddress: string;
  userAgent?: string;
  windowStartedAt: Date;
  phoneLimit: number;
  ipLimit: number;
}

export type LoginAttemptReservation =
  | { allowed: true; attemptId: string }
  | { allowed: false };

export abstract class LoginRepository {
  abstract reserveAttempt(
    request: ReserveLoginAttempt,
  ): Promise<LoginAttemptReservation>;

  abstract findSubjectByPhone(phone: string): Promise<LoginSubject | null>;

  abstract completeAttempt(
    attemptId: string,
    outcome: LoginAttemptFinalOutcome,
    userId?: string,
  ): Promise<void>;
}
