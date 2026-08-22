import { Module } from '@nestjs/common';

import { AccessTokenService } from '../../common/auth/access-token.service';
import { LoginSessionUseCase } from './application/login-session.use-case';
import { LoginUserUseCase } from './application/login-user.use-case';
import { ManageAccountUseCase } from './application/manage-account.use-case';
import { ManageSessionsUseCase } from './application/manage-sessions.use-case';
import { AccountRepository } from './application/ports/account.repository';
import { LoginRepository } from './application/ports/login.repository';
import { PasswordHasher } from './application/ports/password-hasher';
import { RegistrationRepository } from './application/ports/registration.repository';
import { RefreshTokenManager } from './application/ports/refresh-token-manager';
import { SessionRepository } from './application/ports/session.repository';
import { RefreshSessionUseCase } from './application/refresh-session.use-case';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { Argon2PasswordHasher } from './infrastructure/password-hasher';
import { PrismaAccountRepository } from './infrastructure/prisma-account.repository';
import { HmacRefreshTokenManager } from './infrastructure/hmac-refresh-token-manager';
import { PrismaLoginRepository } from './infrastructure/prisma-login.repository';
import { PrismaRegistrationRepository } from './infrastructure/prisma-registration.repository';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { AuthController } from './presentation/http/auth.controller';
import { MeController } from './presentation/http/me.controller';

@Module({
  controllers: [AuthController, MeController],
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
    HmacRefreshTokenManager,
    {
      provide: RefreshTokenManager,
      useExisting: HmacRefreshTokenManager,
    },
    PrismaSessionRepository,
    {
      provide: SessionRepository,
      useExisting: PrismaSessionRepository,
    },
    PrismaAccountRepository,
    {
      provide: AccountRepository,
      useExisting: PrismaAccountRepository,
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
    {
      provide: LoginSessionUseCase,
      inject: [
        LoginUserUseCase,
        SessionRepository,
        RefreshTokenManager,
        AccessTokenService,
      ],
      useFactory: (
        login: LoginUserUseCase,
        sessions: SessionRepository,
        refreshTokens: RefreshTokenManager,
        accessTokens: AccessTokenService,
      ) => new LoginSessionUseCase(
        login,
        sessions,
        refreshTokens,
        accessTokens,
      ),
    },
    {
      provide: RefreshSessionUseCase,
      inject: [SessionRepository, RefreshTokenManager, AccessTokenService],
      useFactory: (
        sessions: SessionRepository,
        refreshTokens: RefreshTokenManager,
        accessTokens: AccessTokenService,
      ) => new RefreshSessionUseCase(
        sessions,
        refreshTokens,
        accessTokens,
      ),
    },
    {
      provide: ManageSessionsUseCase,
      inject: [SessionRepository],
      useFactory: (sessions: SessionRepository) =>
        new ManageSessionsUseCase(sessions),
    },
    {
      provide: ManageAccountUseCase,
      inject: [AccountRepository, PasswordHasher],
      useFactory: (
        accounts: AccountRepository,
        passwords: PasswordHasher,
      ) => new ManageAccountUseCase(accounts, passwords),
    },
  ],
  exports: [
    LoginUserUseCase,
    LoginSessionUseCase,
    RefreshSessionUseCase,
    ManageSessionsUseCase,
    ManageAccountUseCase,
  ],
})
export class IdentityModule {}
