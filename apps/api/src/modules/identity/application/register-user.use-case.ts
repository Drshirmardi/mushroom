import { normalizeIranianMobile } from '../domain/phone-number';
import { PasswordHasher } from './ports/password-hasher';
import { PublicAuthRateLimiter } from './ports/public-auth-rate-limiter';
import {
  RegistrationRepository,
  type RegisteredUser,
} from './ports/registration.repository';
import type { SecurityAuditContext } from './security-audit';

export type { RegisteredUser } from './ports/registration.repository';

export const REGISTRATION_RATE_LIMIT = Object.freeze({
  windowMs: 15 * 60 * 1_000,
  attemptsPerPhone: 3,
  attemptsPerIp: 10,
});

export class RegistrationRateLimitedError extends Error {
  readonly code = 'REGISTRATION_RATE_LIMITED';

  constructor() {
    super('Too many registration attempts. Please try again later.');
    this.name = 'RegistrationRateLimitedError';
  }
}

export interface RegisterUserCommand extends SecurityAuditContext {
  phone: string;
  password: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly registrations: RegistrationRepository,
    private readonly passwords: PasswordHasher,
    private readonly rateLimiter: PublicAuthRateLimiter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisteredUser> {
    const phone = normalizeIranianMobile(command.phone);
    const allowed = await this.rateLimiter.consume({
      scope: 'registration',
      subjects: [
        { kind: 'phone', value: phone, limit: REGISTRATION_RATE_LIMIT.attemptsPerPhone },
        { kind: 'ip', value: command.ipAddress, limit: REGISTRATION_RATE_LIMIT.attemptsPerIp },
      ],
      windowMs: REGISTRATION_RATE_LIMIT.windowMs,
      at: this.now(),
    });
    if (!allowed) throw new RegistrationRateLimitedError();

    const passwordHash = await this.passwords.hash(command.password, {
      blockedValues: [phone, phone.slice(3)],
    });

    return this.registrations.createPatient({
      phone,
      passwordHash,
      audit: {
        requestId: command.requestId,
        ipAddress: command.ipAddress,
      },
    });
  }
}
