import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InvalidCredentialsError,
  LoginRateLimitedError,
  LoginUserUseCase,
} from '../src/modules/identity/application/login-user.use-case';
import {
  LoginRepository,
  type LoginSubject,
} from '../src/modules/identity/application/ports/login.repository';
import { PasswordHasher } from '../src/modules/identity/application/ports/password-hasher';

describe('LoginUserUseCase', () => {
  const now = new Date('2026-08-22T10:00:00.000Z');
  const subject: LoginSubject = {
    id: '37694db4-23a5-4498-a49d-135fc98de279',
    phone: '+989123456789',
    status: 'ACTIVE',
    passwordHash: '$argon2id$real-hash',
    roles: ['PATIENT'],
  };
  const reserveAttempt = vi.fn();
  const findSubjectByPhone = vi.fn();
  const completeAttempt = vi.fn();
  const verify = vi.fn();
  const useCase = new LoginUserUseCase(
    {
      reserveAttempt,
      findSubjectByPhone,
      completeAttempt,
    } as unknown as LoginRepository,
    { verify } as unknown as PasswordHasher,
    () => now,
  );

  beforeEach(() => {
    reserveAttempt.mockReset();
    findSubjectByPhone.mockReset();
    completeAttempt.mockReset();
    verify.mockReset();
    reserveAttempt.mockResolvedValue({ allowed: true, attemptId: 'attempt-id' });
    completeAttempt.mockResolvedValue(undefined);
  });

  it('normalizes the phone, authenticates and records success', async () => {
    findSubjectByPhone.mockResolvedValue(subject);
    verify.mockResolvedValue(true);

    await expect(useCase.execute({
      phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹',
      password: 'correct horse battery staple',
      ipAddress: '203.0.113.10',
      userAgent: 'test-agent',
    })).resolves.toEqual({
      id: subject.id,
      phone: subject.phone,
      roles: subject.roles,
    });

    expect(reserveAttempt).toHaveBeenCalledWith({
      phone: subject.phone,
      recordedPhone: subject.phone,
      ipAddress: '203.0.113.10',
      userAgent: 'test-agent',
      windowStartedAt: new Date('2026-08-22T09:45:00.000Z'),
      phoneLimit: 5,
      ipLimit: 30,
    });
    expect(verify).toHaveBeenCalledWith(
      subject.passwordHash,
      'correct horse battery staple',
    );
    expect(completeAttempt).toHaveBeenCalledWith(
      'attempt-id',
      'SUCCESS',
      subject.id,
    );
  });

  it.each([
    {
      name: 'wrong password',
      found: subject,
      matches: false,
      outcome: 'INVALID_CREDENTIALS',
    },
    {
      name: 'disabled account',
      found: { ...subject, status: 'DISABLED' as const },
      matches: true,
      outcome: 'ACCOUNT_DISABLED',
    },
    {
      name: 'unknown account',
      found: null,
      matches: false,
      outcome: 'INVALID_CREDENTIALS',
    },
  ])('returns the same public error for $name', async ({
    found,
    matches,
    outcome,
  }) => {
    findSubjectByPhone.mockResolvedValue(found);
    verify.mockResolvedValue(matches);

    const result = useCase.execute({
      phone: subject.phone,
      password: 'candidate password',
      ipAddress: '203.0.113.11',
    });

    await expect(result).rejects.toEqual(new InvalidCredentialsError());
    expect(completeAttempt).toHaveBeenCalledWith(
      'attempt-id',
      outcome,
      found?.id,
    );
  });

  it('uses the fixed Argon2id timing hash for unknown and malformed phones', async () => {
    findSubjectByPhone.mockResolvedValue(null);
    verify.mockResolvedValue(false);

    await expect(useCase.execute({
      phone: 'not-a-phone',
      password: 'candidate password',
      ipAddress: '203.0.113.12',
    })).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(findSubjectByPhone).not.toHaveBeenCalled();
    expect(reserveAttempt).toHaveBeenCalledWith(expect.objectContaining({
      phone: undefined,
      recordedPhone: 'INVALID',
    }));
    expect(verify.mock.calls[0]?.[0]).toMatch(/^\$argon2id\$/);
  });

  it('stops before credential lookup when the reservation is rate limited', async () => {
    reserveAttempt.mockResolvedValue({ allowed: false });

    await expect(useCase.execute({
      phone: subject.phone,
      password: 'candidate password',
      ipAddress: '203.0.113.13',
    })).rejects.toEqual(new LoginRateLimitedError());

    expect(findSubjectByPhone).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    expect(completeAttempt).not.toHaveBeenCalled();
  });
});
