import {
  argon2id,
  hash,
  needsRehash,
  verify,
  type HashOptions,
} from 'argon2';

import {
  assertPasswordPolicy,
  normalizePasswordForVerification,
  type PasswordPolicyContext,
} from '../domain/password-policy';

export const ARGON2ID_HASH_OPTIONS = Object.freeze({
  type: argon2id,
  version: 0x13,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
} satisfies HashOptions);

export const hashPassword = async (
  password: string,
  policyContext?: PasswordPolicyContext,
): Promise<string> => {
  const validatedPassword = assertPasswordPolicy(password, policyContext);

  return hash(validatedPassword, ARGON2ID_HASH_OPTIONS);
};

export const verifyPassword = async (
  encodedHash: string,
  password: string,
): Promise<boolean> => {
  try {
    if (!encodedHash.startsWith('$argon2id$')) return false;

    const normalizedPassword = normalizePasswordForVerification(password);

    return await verify(encodedHash, normalizedPassword);
  } catch {
    return false;
  }
};

export const passwordHashNeedsRehash = (encodedHash: string): boolean => {
  try {
    return (
      !encodedHash.startsWith('$argon2id$')
      || needsRehash(encodedHash, ARGON2ID_HASH_OPTIONS)
    );
  } catch {
    return true;
  }
};
