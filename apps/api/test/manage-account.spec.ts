import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CurrentAccountUnavailableError,
  InvalidCurrentPasswordError,
  ManageAccountUseCase,
  PasswordUnchangedError,
} from '../src/modules/identity/application/manage-account.use-case';
import type { AccountRepository } from '../src/modules/identity/application/ports/account.repository';
import type { PasswordHasher } from '../src/modules/identity/application/ports/password-hasher';
import { InvalidPhoneNumberError } from '../src/modules/identity/domain/phone-number';

describe('ManageAccountUseCase', () => {
  const now = new Date('2026-08-22T13:00:00.000Z');
  const account = {
    id: '37694db4-23a5-4498-a49d-135fc98de279',
    phone: '+989123456789',
    status: 'ACTIVE' as const,
    roles: ['PATIENT'],
    createdAt: new Date('2026-08-20T12:00:00.000Z'),
    passwordChangedAt: new Date('2026-08-20T12:00:00.000Z'),
  };
  const credential = { ...account, passwordHash: 'encoded-current-hash' };
  const audit = {
    requestId: 'request-account',
    ipAddress: '203.0.113.13',
    actorSessionId: 'df846b14-c123-45bd-8efe-58220999e940',
  };
  const findById = vi.fn();
  const findCredential = vi.fn();
  const changePhone = vi.fn();
  const changePassword = vi.fn();
  const verify = vi.fn();
  const hash = vi.fn();
  const accounts = {
    findById,
    findCredential,
    changePhone,
    changePassword,
  } as unknown as AccountRepository;
  const passwords = { verify, hash } as unknown as PasswordHasher;
  const useCase = new ManageAccountUseCase(accounts, passwords, () => now);

  beforeEach(() => {
    findById.mockReset().mockResolvedValue(account);
    findCredential.mockReset().mockResolvedValue(credential);
    changePhone.mockReset().mockResolvedValue({ kind: 'CHANGED', account });
    changePassword.mockReset().mockResolvedValue({ kind: 'CHANGED', account });
    verify.mockReset();
    hash.mockReset().mockResolvedValue('encoded-new-hash');
  });

  it('returns only the active account contract', async () => {
    await expect(useCase.get(account.id)).resolves.toEqual(account);
    expect(findById).toHaveBeenCalledWith(account.id);
  });

  it.each([null, { ...account, status: 'DISABLED' as const }])(
    'rejects an unavailable current account',
    async (unavailable) => {
      findById.mockResolvedValue(unavailable);

      await expect(useCase.get(account.id)).rejects.toEqual(
        new CurrentAccountUnavailableError(),
      );
    },
  );

  it('normalizes a changed phone after verifying the current password', async () => {
    verify.mockResolvedValue(true);
    const changed = { ...account, phone: '+989121112233' };
    changePhone.mockResolvedValue({ kind: 'CHANGED', account: changed });

    await expect(useCase.changePhone(
      account.id,
      'current password',
      '۰۹۱۲ ۱۱۱ ۲۲۳۳',
      audit,
    )).resolves.toEqual(changed);
    expect(changePhone).toHaveBeenCalledWith({
      userId: account.id,
      expectedPasswordHash: credential.passwordHash,
      phone: '+989121112233',
      audit,
    });
  });

  it('rejects a bad password before validating or persisting a new phone', async () => {
    verify.mockResolvedValue(false);

    await expect(useCase.changePhone(
      account.id,
      'wrong password',
      'not-a-phone',
      audit,
    )).rejects.toEqual(new InvalidCurrentPasswordError());
    expect(changePhone).not.toHaveBeenCalled();
  });

  it('returns the safe account contract when the canonical phone is unchanged', async () => {
    verify.mockResolvedValue(true);

    const result = await useCase.changePhone(
      account.id,
      'current password',
      '09123456789',
      audit,
    );

    expect(result).toEqual(account);
    expect(result).not.toHaveProperty('passwordHash');
    expect(changePhone).not.toHaveBeenCalled();
  });

  it('rejects an invalid new phone after authenticating the change', async () => {
    verify.mockResolvedValue(true);

    await expect(useCase.changePhone(
      account.id,
      'current password',
      'not-a-phone',
      audit,
    )).rejects.toBeInstanceOf(InvalidPhoneNumberError);
  });

  it('changes the password with context policy and a fixed timestamp', async () => {
    verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await useCase.changePassword(
      account.id,
      'current password',
      'new secure password value',
      audit,
    );

    expect(hash).toHaveBeenCalledWith('new secure password value', {
      blockedValues: [account.phone],
    });
    expect(changePassword).toHaveBeenCalledWith({
      userId: account.id,
      expectedPasswordHash: credential.passwordHash,
      passwordHash: 'encoded-new-hash',
      changedAt: now,
      audit,
    });
  });

  it('rejects an unchanged password before hashing or persistence', async () => {
    verify.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    await expect(useCase.changePassword(
      account.id,
      'current password',
      'current password',
      audit,
    )).rejects.toEqual(new PasswordUnchangedError());
    expect(hash).not.toHaveBeenCalled();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('maps a concurrent stale credential to the current-password error', async () => {
    verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    changePassword.mockResolvedValue({ kind: 'STALE' });

    await expect(useCase.changePassword(
      account.id,
      'current password',
      'new secure password value',
      audit,
    )).rejects.toEqual(new InvalidCurrentPasswordError());
  });
});
