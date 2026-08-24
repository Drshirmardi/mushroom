import type { PasswordPolicyContext } from '../../domain/password-policy';

export abstract class PasswordHasher {
  abstract hash(
    password: string,
    policyContext?: PasswordPolicyContext,
  ): Promise<string>;

  abstract verify(encodedHash: string, password: string): Promise<boolean>;
}
