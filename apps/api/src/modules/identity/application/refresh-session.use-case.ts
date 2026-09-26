import type {
  AccessTokenIssuer,
  SessionAuthenticationResult,
} from './login-session.use-case';
import { RefreshTokenManager } from './ports/refresh-token-manager';
import { PublicAuthRateLimiter } from './ports/public-auth-rate-limiter';
import { SessionRepository } from './ports/session.repository';
import type { SecurityAuditContext } from './security-audit';

export class InvalidRefreshTokenError extends Error {
  readonly code = 'INVALID_REFRESH_TOKEN';

  constructor() {
    super('Refresh token is invalid.');
    this.name = 'InvalidRefreshTokenError';
  }
}

export const REFRESH_RATE_LIMIT = Object.freeze({
  windowMs: 15 * 60 * 1_000,
  attemptsPerSession: 20,
  attemptsPerIp: 60,
});

export class RefreshRateLimitedError extends Error {
  readonly code = 'REFRESH_RATE_LIMITED';

  constructor() {
    super('Too many refresh attempts. Please try again later.');
    this.name = 'RefreshRateLimitedError';
  }
}

export interface RefreshSessionCommand extends SecurityAuditContext {
  refreshToken: string | undefined;
  ipAddress: string;
  userAgent?: string;
}

export class RefreshSessionUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly refreshTokens: RefreshTokenManager,
    private readonly accessTokens: AccessTokenIssuer,
    private readonly rateLimiter: PublicAuthRateLimiter,
    private readonly sockets: { disconnectSession(sessionId: string): void },
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    command: RefreshSessionCommand,
  ): Promise<SessionAuthenticationResult> {
    if (!command.refreshToken) throw new InvalidRefreshTokenError();

    const inspected = this.refreshTokens.inspect(command.refreshToken);
    if (!inspected) throw new InvalidRefreshTokenError();

    const currentTime = this.now();
    const allowed = await this.rateLimiter.consume({
      scope: 'refresh',
      subjects: [
        { kind: 'session', value: inspected.sessionId, limit: REFRESH_RATE_LIMIT.attemptsPerSession },
        { kind: 'ip', value: command.ipAddress, limit: REFRESH_RATE_LIMIT.attemptsPerIp },
      ],
      windowMs: REFRESH_RATE_LIMIT.windowMs,
      at: currentTime,
    });
    if (!allowed) throw new RefreshRateLimitedError();

    const replacement = this.refreshTokens.rotate(inspected.sessionId);
    const rotation = await this.sessions.rotateRefresh({
      sessionId: inspected.sessionId,
      presentedTokenHash: inspected.tokenHash,
      replacementTokenHash: replacement.tokenHash,
      usedAt: currentTime,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      audit: {
        requestId: command.requestId,
        ipAddress: command.ipAddress,
        actorSessionId: inspected.sessionId,
      },
    });

    // rotateRefresh resolves only after its PostgreSQL transaction commits. A
    // refresh replay/disabled-user branch has persistently revoked this exact
    // session, so evict it before returning the authentication failure.
    if (rotation.kind === 'REVOKED') {
      this.sockets.disconnectSession(inspected.sessionId);
      throw new InvalidRefreshTokenError();
    }
    if (rotation.kind !== 'ROTATED') throw new InvalidRefreshTokenError();

    const accessToken = await this.accessTokens.issue({
      userId: rotation.user.id,
      sessionId: inspected.sessionId,
      roles: rotation.user.roles,
    });

    return {
      user: rotation.user,
      accessToken,
      refreshToken: replacement.rawToken,
      refreshExpiresAt: rotation.expiresAt,
    };
  }
}
