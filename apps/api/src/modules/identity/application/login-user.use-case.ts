import {
  InvalidPhoneNumberError,
  normalizeIranianMobile,
} from '../domain/phone-number';
import {
  LoginRepository,
  type LoginAttemptFinalOutcome,
} from './ports/login.repository';
import { PasswordHasher } from './ports/password-hasher';

export const LOGIN_RATE_LIMIT = Object.freeze({
  windowMs: 15 * 60 * 1_000,
  attemptsPerPhone: 5,
  attemptsPerIp: 30,
});

const INVALID_RECORDED_PHONE = 'INVALID';
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Hgt7+QN9Jkr0PaJfhHRlsQ$n//rTI3vt32b6eiOA3TYdC9pX3kPGu9hOtPlVCCd3gU';

export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid phone number or password.');
    this.name = 'InvalidCredentialsError';
  }
}

export class LoginRateLimitedError extends Error {
  readonly code = 'LOGIN_RATE_LIMITED';

  constructor() {
    super('Too many login attempts. Please try again later.');
    this.name = 'LoginRateLimitedError';
  }
}

export interface LoginUserCommand {
  phone: string;
  password: string;
  ipAddress: string;
  userAgent?: string;
}

export interface AuthenticatedUser {
  id: string;
  phone: string;
  roles: string[];
}

export class LoginUserUseCase {
  constructor(
    private readonly logins: LoginRepository,
    private readonly passwords: PasswordHasher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthenticatedUser> {
    let phone: string | undefined;

    try {
      phone = normalizeIranianMobile(command.phone);
    } catch (error) {
      if (!(error instanceof InvalidPhoneNumberError)) throw error;
    }

    const currentTime = this.now();
    const reservation = await this.logins.reserveAttempt({
      phone,
      recordedPhone: phone ?? INVALID_RECORDED_PHONE,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      windowStartedAt: new Date(currentTime.getTime() - LOGIN_RATE_LIMIT.windowMs),
      phoneLimit: LOGIN_RATE_LIMIT.attemptsPerPhone,
      ipLimit: LOGIN_RATE_LIMIT.attemptsPerIp,
    });

    if (!reservation.allowed) throw new LoginRateLimitedError();

    const subject = phone
      ? await this.logins.findSubjectByPhone(phone)
      : null;
    const passwordMatches = await this.passwords.verify(
      subject?.passwordHash ?? DUMMY_PASSWORD_HASH,
      command.password,
    );
    const authenticated = subject?.status === 'ACTIVE' && passwordMatches;
    const outcome: LoginAttemptFinalOutcome = authenticated
      ? 'SUCCESS'
      : subject?.status === 'DISABLED'
        ? 'ACCOUNT_DISABLED'
        : 'INVALID_CREDENTIALS';

    await this.logins.completeAttempt(
      reservation.attemptId,
      outcome,
      subject?.id,
    );

    if (!authenticated || !subject) throw new InvalidCredentialsError();

    return {
      id: subject.id,
      phone: subject.phone,
      roles: subject.roles,
    };
  }
}
