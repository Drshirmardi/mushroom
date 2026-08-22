import type {
  AccessTokenIssuer,
  SessionAuthenticationResult,
} from './login-session.use-case';
import { RefreshTokenManager } from './ports/refresh-token-manager';
import { SessionRepository } from './ports/session.repository';

export class InvalidRefreshTokenError extends Error {
  readonly code = 'INVALID_REFRESH_TOKEN';

  constructor() {
    super('Refresh token is invalid.');
    this.name = 'InvalidRefreshTokenError';
  }
}

export interface RefreshSessionCommand {
  refreshToken: string | undefined;
  ipAddress: string;
  userAgent?: string;
}

export class RefreshSessionUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly refreshTokens: RefreshTokenManager,
    private readonly accessTokens: AccessTokenIssuer,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    command: RefreshSessionCommand,
  ): Promise<SessionAuthenticationResult> {
    if (!command.refreshToken) throw new InvalidRefreshTokenError();

    const inspected = this.refreshTokens.inspect(command.refreshToken);
    if (!inspected) throw new InvalidRefreshTokenError();

    const replacement = this.refreshTokens.rotate(inspected.sessionId);
    const rotation = await this.sessions.rotateRefresh({
      sessionId: inspected.sessionId,
      presentedTokenHash: inspected.tokenHash,
      replacementTokenHash: replacement.tokenHash,
      usedAt: this.now(),
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    });

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
