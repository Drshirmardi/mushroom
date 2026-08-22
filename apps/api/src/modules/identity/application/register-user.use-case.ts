import { normalizeIranianMobile } from '../domain/phone-number';
import { PasswordHasher } from './ports/password-hasher';
import {
  RegistrationRepository,
  type RegisteredUser,
} from './ports/registration.repository';

export type { RegisteredUser } from './ports/registration.repository';

export interface RegisterUserCommand {
  phone: string;
  password: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly registrations: RegistrationRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisteredUser> {
    const phone = normalizeIranianMobile(command.phone);
    const passwordHash = await this.passwords.hash(command.password, {
      blockedValues: [phone, phone.slice(3)],
    });

    return this.registrations.createPatient({ phone, passwordHash });
  }
}
