import type { AccessTokenIssuer, SessionAuthenticationResult } from './login-session.use-case';
import { SESSION_LIFETIME_MS } from './login-session.use-case';
import type { RefreshTokenManager } from './ports/refresh-token-manager';
import type { SessionRepository } from './ports/session.repository';

export class SessionIssuerUseCase {
  constructor(private readonly sessions: SessionRepository, private readonly refreshTokens: RefreshTokenManager, private readonly accessTokens: AccessTokenIssuer, private readonly now: () => Date = () => new Date()) {}
  async execute(input: { user: { id: string; phone: string; roles: string[] }; remember: boolean; phoneVerified?: boolean; ipAddress: string; userAgent?: string; requestId: string }): Promise<SessionAuthenticationResult> {
    const currentTime = this.now(); const refresh = this.refreshTokens.create();
    const refreshExpiresAt = new Date(currentTime.getTime() + (input.remember ? SESSION_LIFETIME_MS.remembered : SESSION_LIFETIME_MS.standard));
    const accessToken = await this.accessTokens.issue({ userId: input.user.id, sessionId: refresh.sessionId, roles: input.user.roles });
    await this.sessions.create({ id: refresh.sessionId, userId: input.user.id, refreshTokenHash: refresh.tokenHash, remembered: input.remember, verifiedPhone: input.phoneVerified ? input.user.phone : undefined, userAgent: input.userAgent, ipAddress: input.ipAddress, expiresAt: refreshExpiresAt, audit: { requestId: input.requestId, ipAddress: input.ipAddress, actorSessionId: refresh.sessionId } });
    return { user: input.user, accessToken, refreshToken: refresh.rawToken, refreshExpiresAt };
  }
}
