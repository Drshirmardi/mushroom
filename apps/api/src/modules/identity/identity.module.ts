import { Module } from '@nestjs/common';

import { PasswordHasher } from './application/ports/password-hasher';
import { RegistrationRepository } from './application/ports/registration.repository';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { Argon2PasswordHasher } from './infrastructure/password-hasher';
import { PrismaRegistrationRepository } from './infrastructure/prisma-registration.repository';
import { AuthController } from './presentation/http/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    Argon2PasswordHasher,
    {
      provide: PasswordHasher,
      useExisting: Argon2PasswordHasher,
    },
    PrismaRegistrationRepository,
    {
      provide: RegistrationRepository,
      useExisting: PrismaRegistrationRepository,
    },
    {
      provide: RegisterUserUseCase,
      inject: [RegistrationRepository, PasswordHasher],
      useFactory: (
        registrations: RegistrationRepository,
        passwords: PasswordHasher,
      ) => new RegisterUserUseCase(registrations, passwords),
    },
  ],
})
export class IdentityModule {}
