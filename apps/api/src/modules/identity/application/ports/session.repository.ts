export interface SessionUser {
  id: string;
  phone: string;
  roles: string[];
}

export interface CreateSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  remembered: boolean;
  userAgent?: string;
  ipAddress: string;
  expiresAt: Date;
}

export interface RotateSessionRefresh {
  sessionId: string;
  presentedTokenHash: string;
  replacementTokenHash: string;
  usedAt: Date;
  ipAddress: string;
  userAgent?: string;
}

export type SessionRefreshResult =
  | {
      kind: 'ROTATED';
      user: SessionUser;
      expiresAt: Date;
      generation: number;
    }
  | { kind: 'INVALID' }
  | { kind: 'REUSED' };

export abstract class SessionRepository {
  abstract create(input: CreateSession): Promise<void>;
  abstract rotateRefresh(
    input: RotateSessionRefresh,
  ): Promise<SessionRefreshResult>;
}
