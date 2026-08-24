import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordHasher } from '../src/modules/identity/application/ports/password-hasher';
import { PublicAuthRateLimiter } from '../src/modules/identity/application/ports/public-auth-rate-limiter';
import {
  RegistrationRepository,
  type RegisteredUser,
} from '../src/modules/identity/application/ports/registration.repository';
import {
  RegistrationRateLimitedError,
  RegisterUserUseCase,
} from '../src/modules/identity/application/register-user.use-case';

describe('RegisterUserUseCase', () => {
  const audit = { requestId: 'request-register', ipAddress: '203.0.113.10' };
  const registeredUser: RegisteredUser = {
    id: '37694db4-23a5-4498-a49d-135fc98de279',
    phone: '+989123456789',
    roles: ['PATIENT'],
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
  };
  const createPatient = vi.fn();
  const hash = vi.fn();
  const consume = vi.fn();
  const useCase = new RegisterUserUseCase(
    { createPatient } as unknown as RegistrationRepository,
    { hash } as unknown as PasswordHasher,
    { consume } as unknown as PublicAuthRateLimiter,
  );

  beforeEach(() => {
    createPatient.mockReset();
    hash.mockReset();
    consume.mockReset();
    consume.mockResolvedValue(true);
  });

  it('stops before Argon2 and persistence when registration is rate limited', async () => {
    consume.mockResolvedValueOnce(false);

    await expect(useCase.execute({
      phone: '09123456789',
      password: 'correct horse battery staple',
      ...audit,
    })).rejects.toEqual(new RegistrationRateLimitedError());
    expect(hash).not.toHaveBeenCalled();
    expect(createPatient).not.toHaveBeenCalled();
  });

  it('normalizes and hashes before passing persistence-safe values to the repository', async () => {
    hash.mockResolvedValueOnce('$argon2id$encoded');
    createPatient.mockResolvedValueOnce(registeredUser);

    await expect(useCase.execute({
      phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹',
      password: 'correct horse battery staple',
      ...audit,
    })).resolves.toEqual(registeredUser);

    expect(hash).toHaveBeenCalledWith('correct horse battery staple', {
      blockedValues: ['+989123456789', '9123456789'],
    });
    expect(createPatient).toHaveBeenCalledWith({
      phone: '+989123456789',
      passwordHash: '$argon2id$encoded',
      audit,
    });
  });

  it('does not open persistence when validation or hashing fails', async () => {
    hash.mockRejectedValueOnce(new Error('policy rejected'));

    await expect(useCase.execute({
      phone: '09123456789',
      password: 'rejected password',
      ...audit,
    })).rejects.toThrow('policy rejected');
    expect(createPatient).not.toHaveBeenCalled();
  });
});
