export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

const DISALLOWED_CONTROL_CHARACTERS = /\p{Cc}/u;
const BASELINE_BLOCKLIST = new Set([
  '123456789012345',
  'adminadminadmin',
  'letmeinletmeinletmein',
  'passwordpassword',
  'qwertyuiopasdfgh',
]);

export type PasswordPolicyErrorCode =
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_UNSUPPORTED_CHARACTERS'
  | 'PASSWORD_BLOCKED';

export type PolicyCompliantPassword = string & {
  readonly policyCompliantPassword: unique symbol;
};

export class PasswordPolicyError extends Error {
  constructor(readonly code: PasswordPolicyErrorCode) {
    super('Password does not satisfy the security policy.');
    this.name = 'PasswordPolicyError';
  }
}

const normalizePassword = (password: string): string => password.normalize('NFC');

const countCodePoints = (value: string): number => [...value].length;

const blocklistKey = (value: string): string =>
  normalizePassword(value).toLocaleLowerCase('en-US');

export interface PasswordPolicyContext {
  blockedValues?: Iterable<string>;
}

export const normalizePasswordForVerification = (password: string): string => {
  const normalized = normalizePassword(password);

  if (countCodePoints(normalized) > PASSWORD_MAX_LENGTH) {
    throw new PasswordPolicyError('PASSWORD_TOO_LONG');
  }

  if (DISALLOWED_CONTROL_CHARACTERS.test(normalized)) {
    throw new PasswordPolicyError('PASSWORD_UNSUPPORTED_CHARACTERS');
  }

  return normalized;
};

export const assertPasswordPolicy = (
  password: string,
  context: PasswordPolicyContext = {},
): PolicyCompliantPassword => {
  const normalized = normalizePasswordForVerification(password);
  const length = countCodePoints(normalized);

  if (length < PASSWORD_MIN_LENGTH) {
    throw new PasswordPolicyError('PASSWORD_TOO_SHORT');
  }

  const candidateKey = blocklistKey(normalized);
  const isContextBlocked = [...(context.blockedValues ?? [])]
    .some((value) => blocklistKey(value) === candidateKey);

  if (
    normalized.trim().length === 0
    || BASELINE_BLOCKLIST.has(candidateKey)
    || isContextBlocked
  ) {
    throw new PasswordPolicyError('PASSWORD_BLOCKED');
  }

  return normalized as PolicyCompliantPassword;
};
