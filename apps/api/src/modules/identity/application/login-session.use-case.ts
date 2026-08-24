import { LoginUserUseCase } from './login-user.use-case';
import { RefreshTokenManager } from './ports/refresh-token-manager';
import { SessionRepository } from './ports/session.repository';
import type { SecurityAuditContext } from './security-audit';

export const SESSION_LIFETIME_MS = Object.freeze({
  standard: 24 * 60 * 60 * 1_000,
  remembered: 30 * 24 * 60 * 60 * 1_000,
});

export interface AccessTokenIssuer {
  issue(input: {
    userId: string;
    sessionId: string;
    roles: string[];
  }): Promise<string>;
}

export interface LoginSessionCommand extends SecurityAuditContext {
  phone: string;
  password: string;
  remember: boolean;
  ipAddress: string;
  userAgent?: string;
}

export interface SessionAuthenticationResult {
  user: {
    id: string;
    phone: string;
    roles: string[];
  };
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export class LoginSessionUseCase {
  constructor(
    private readonly authenticate: LoginUserUseCase,
    private readonly sessions: SessionRepository,
    private readonly refreshTokens: RefreshTokenManager,
    private readonly accessTokens: AccessTokenIssuer,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    command: LoginSessionCommand,
  ): Promise<SessionAuthenticationResult> {
    const user = await this.authenticate.execute(command);
    const currentTime = this.now();
    const refresh = this.refreshTokens.create();
    const refreshExpiresAt = new Date(
      currentTime.getTime()
      + (command.remember
        ? SESSION_LIFETIME_MS.remembered
        : SESSION_LIFETIME_MS.standard),
    );
    const accessToken = await this.accessTokens.issue({
      userId: user.id,
      sessionId: refresh.sessionId,
      roles: user.roles,
    });

    await this.sessions.create({
      id: refresh.sessionId,
      userId: user.id,
      refreshTokenHash: refresh.tokenHash,
      remembered: command.remember,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
      expiresAt: refreshExpiresAt,
      audit: {
        requestId: command.requestId,
        ipAddress: command.ipAddress,
        actorSessionId: refresh.sessionId,
      },
    });

    return {
      user,
      accessToken,
      refreshToken: refresh.rawToken,
      refreshExpiresAt,
    };
  }
}
