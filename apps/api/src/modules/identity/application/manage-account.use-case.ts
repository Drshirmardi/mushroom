import {
  InvalidPhoneNumberError,
  normalizeIranianMobile,
} from '../domain/phone-number';
import { PasswordHasher } from './ports/password-hasher';
import {
  AccountRepository,
  type CurrentAccount,
} from './ports/account.repository';
import type { SecurityAuditContext } from './security-audit';

export class CurrentAccountUnavailableError extends Error {
  readonly code = 'UNAUTHORIZED';

  constructor() {
    super('Authentication required.');
    this.name = 'CurrentAccountUnavailableError';
  }
}

export class InvalidCurrentPasswordError extends Error {
  readonly code = 'INVALID_CURRENT_PASSWORD';

  constructor() {
    super('Current password is invalid.');
    this.name = 'InvalidCurrentPasswordError';
  }
}

export class PasswordUnchangedError extends Error {
  readonly code = 'PASSWORD_UNCHANGED';

  constructor() {
    super('New password must be different from the current password.');
    this.name = 'PasswordUnchangedError';
  }
}

export class ManageAccountUseCase {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly passwords: PasswordHasher,
    private readonly sockets: { disconnectUser(userId: string): void },
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(userId: string): Promise<CurrentAccount> {
    const account = await this.accounts.findById(userId);

    if (!account || account.status !== 'ACTIVE') {
      throw new CurrentAccountUnavailableError();
    }

    return account;
  }

  async changePhone(
    userId: string,
    currentPassword: string,
    requestedPhone: string,
    audit: SecurityAuditContext,
  ): Promise<CurrentAccount> {
    const credential = await this.activeCredential(userId);
    const passwordMatches = await this.passwords.verify(
      credential.passwordHash,
      currentPassword,
    );
    if (!passwordMatches) throw new InvalidCurrentPasswordError();

    const phone = normalizeIranianMobile(requestedPhone);
    if (phone === credential.phone) {
      const { passwordHash: _passwordHash, ...account } = credential;

      return account;
    }

    const result = await this.accounts.changePhone({
      userId,
      expectedPasswordHash: credential.passwordHash,
      phone,
      audit,
    });
    if (result.kind === 'STALE') throw new InvalidCurrentPasswordError();

    return result.account;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    audit: SecurityAuditContext,
  ): Promise<void> {
    const credential = await this.activeCredential(userId);
    const currentPasswordMatches = await this.passwords.verify(
      credential.passwordHash,
      currentPassword,
    );
    if (!currentPasswordMatches) throw new InvalidCurrentPasswordError();

    const passwordUnchanged = await this.passwords.verify(
      credential.passwordHash,
      newPassword,
    );
    if (passwordUnchanged) throw new PasswordUnchangedError();

    const passwordHash = await this.passwords.hash(newPassword, {
      blockedValues: [credential.phone],
    });
    const result = await this.accounts.changePassword({
      userId,
      expectedPasswordHash: credential.passwordHash,
      passwordHash,
      changedAt: this.now(),
      audit,
    });
    if (result.kind === 'STALE') throw new InvalidCurrentPasswordError();
    // AccountRepository commits the password change and session revocations as
    // one transaction before this local single-instance eviction occurs.
    this.sockets.disconnectUser(userId);
  }

  private async activeCredential(userId: string) {
    const credential = await this.accounts.findCredential(userId);

    if (!credential || credential.status !== 'ACTIVE') {
      throw new CurrentAccountUnavailableError();
    }

    return credential;
  }
}
