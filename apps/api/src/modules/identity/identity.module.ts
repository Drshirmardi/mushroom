import { Module } from '@nestjs/common';

import { LoginUserUseCase } from './application/login-user.use-case';
import { LoginRepository } from './application/ports/login.repository';
import { PasswordHasher } from './application/ports/password-hasher';
import { RegistrationRepository } from './application/ports/registration.repository';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { Argon2PasswordHasher } from './infrastructure/password-hasher';
import { PrismaLoginRepository } from './infrastructure/prisma-login.repository';
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
    PrismaLoginRepository,
    {
      provide: LoginRepository,
      useExisting: PrismaLoginRepository,
    },
    {
      provide: RegisterUserUseCase,
      inject: [RegistrationRepository, PasswordHasher],
      useFactory: (
        registrations: RegistrationRepository,
        passwords: PasswordHasher,
      ) => new RegisterUserUseCase(registrations, passwords),
    },
    {
      provide: LoginUserUseCase,
      inject: [LoginRepository, PasswordHasher],
      useFactory: (logins: LoginRepository, passwords: PasswordHasher) =>
        new LoginUserUseCase(logins, passwords),
    },
  ],
  exports: [LoginUserUseCase],
})
export class IdentityModule {}
