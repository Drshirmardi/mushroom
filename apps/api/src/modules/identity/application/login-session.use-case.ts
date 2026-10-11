import { LoginUserUseCase } from './login-user.use-case';
import { RefreshTokenManager } from './ports/refresh-token-manager';
import { SessionRepository } from './ports/session.repository';
import type { SecurityAuditContext } from './security-audit';
import { SessionIssuerUseCase } from './session-issuer.use-case';

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
    return new SessionIssuerUseCase(this.sessions, this.refreshTokens, this.accessTokens, this.now).execute({ user, remember: command.remember, userAgent: command.userAgent, ipAddress: command.ipAddress, requestId: command.requestId });
  }
}
