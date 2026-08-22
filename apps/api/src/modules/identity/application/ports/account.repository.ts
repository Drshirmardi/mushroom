export interface CurrentAccount {
  id: string;
  phone: string;
  status: 'ACTIVE' | 'DISABLED';
  roles: string[];
  createdAt: Date;
  passwordChangedAt: Date;
}

export interface AccountCredential extends CurrentAccount {
  passwordHash: string;
}

export interface ChangeAccountPhone {
  userId: string;
  expectedPasswordHash: string;
  phone: string;
}

export interface ChangeAccountPassword {
  userId: string;
  expectedPasswordHash: string;
  passwordHash: string;
  changedAt: Date;
}

export type AccountMutationResult =
  | { kind: 'CHANGED'; account: CurrentAccount }
  | { kind: 'STALE' };

export class AccountPhoneAlreadyRegisteredError extends Error {
  constructor() {
    super('An account with this phone number already exists.');
    this.name = 'AccountPhoneAlreadyRegisteredError';
  }
}

export abstract class AccountRepository {
  abstract findById(userId: string): Promise<CurrentAccount | null>;
  abstract findCredential(userId: string): Promise<AccountCredential | null>;
  abstract changePhone(
    input: ChangeAccountPhone,
  ): Promise<AccountMutationResult>;
  abstract changePassword(
    input: ChangeAccountPassword,
  ): Promise<AccountMutationResult>;
}
