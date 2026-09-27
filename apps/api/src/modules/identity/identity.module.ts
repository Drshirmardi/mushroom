import { Module } from '@nestjs/common';

import { AccessTokenService } from '../../common/auth/access-token.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ChatModule } from '../communications/chat/chat.module';
import { ClinicalModule } from '../clinical/clinical.module';
import { ChatSocketRegistry } from '../communications/chat/realtime/chat-socket-registry';
import { LoginSessionUseCase } from './application/login-session.use-case';
import { LoginUserUseCase } from './application/login-user.use-case';
import { ManageAccountUseCase } from './application/manage-account.use-case';
import { ManageSessionsUseCase } from './application/manage-sessions.use-case';
import { ManageUserStatusUseCase } from './application/manage-user-status.use-case';
import { AccountRepository } from './application/ports/account.repository';
import { LoginRepository } from './application/ports/login.repository';
import { PasswordHasher } from './application/ports/password-hasher';
import { PublicAuthRateLimiter } from './application/ports/public-auth-rate-limiter';
import { RegistrationRepository } from './application/ports/registration.repository';
import { RefreshTokenManager } from './application/ports/refresh-token-manager';
import { SessionRepository } from './application/ports/session.repository';
import { RefreshSessionUseCase } from './application/refresh-session.use-case';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { Argon2PasswordHasher } from './infrastructure/password-hasher';
import { PrismaAccountRepository } from './infrastructure/prisma-account.repository';
import { HmacRefreshTokenManager } from './infrastructure/hmac-refresh-token-manager';
import { PrismaLoginRepository } from './infrastructure/prisma-login.repository';
import { PrismaPublicAuthRateLimiter } from './infrastructure/prisma-public-auth-rate-limiter';
import { PrismaRegistrationRepository } from './infrastructure/prisma-registration.repository';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { AuthController } from './presentation/http/auth.controller';
import { MeController } from './presentation/http/me.controller';
import { AuditViewerController } from './audit/audit-viewer.controller';
import { AuditViewerSessionGuard } from './audit/audit-viewer-session.guard';
import { AuditViewerService } from './audit/audit-viewer.service';

@Module({
  imports: [ChatModule, ClinicalModule],
  controllers: [AuthController, MeController, AuditViewerController],
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
    PrismaPublicAuthRateLimiter,
    {
      provide: PublicAuthRateLimiter,
      useExisting: PrismaPublicAuthRateLimiter,
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
      inject: [RegistrationRepository, PasswordHasher, PublicAuthRateLimiter],
      useFactory: (
        registrations: RegistrationRepository,
        passwords: PasswordHasher,
        rateLimiter: PublicAuthRateLimiter,
      ) => new RegisterUserUseCase(registrations, passwords, rateLimiter),
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
      inject: [
        SessionRepository,
        RefreshTokenManager,
        AccessTokenService,
        PublicAuthRateLimiter,
        ChatSocketRegistry,
      ],
      useFactory: (
        sessions: SessionRepository,
        refreshTokens: RefreshTokenManager,
        accessTokens: AccessTokenService,
        rateLimiter: PublicAuthRateLimiter,
        sockets: ChatSocketRegistry,
      ) => new RefreshSessionUseCase(
        sessions,
        refreshTokens,
        accessTokens,
        rateLimiter,
        sockets,
      ),
    },
    {
      provide: ManageSessionsUseCase,
      inject: [SessionRepository, ChatSocketRegistry],
      useFactory: (sessions: SessionRepository, sockets: ChatSocketRegistry) =>
        new ManageSessionsUseCase(sessions, sockets),
    },
    {
      provide: ManageUserStatusUseCase,
      inject: [PrismaService, ChatSocketRegistry],
      useFactory: (prisma: PrismaService, sockets: ChatSocketRegistry) =>
        new ManageUserStatusUseCase(prisma, sockets),
    },
    {
      provide: ManageAccountUseCase,
      inject: [AccountRepository, PasswordHasher, ChatSocketRegistry],
      useFactory: (
        accounts: AccountRepository,
        passwords: PasswordHasher,
        sockets: ChatSocketRegistry,
      ) => new ManageAccountUseCase(accounts, passwords, sockets),
    },
    AuditViewerSessionGuard,
    AuditViewerService,
  ],
  exports: [
    LoginUserUseCase,
    LoginSessionUseCase,
    RefreshSessionUseCase,
    ManageSessionsUseCase,
    ManageUserStatusUseCase,
    ManageAccountUseCase,
  ],
})
export class IdentityModule {}
