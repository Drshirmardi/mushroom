import type {
  SecurityAuditAction,
  SecurityAuditContext,
} from '../security-audit';

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
  audit: SecurityAuditContext;
}

export interface RotateSessionRefresh {
  sessionId: string;
  presentedTokenHash: string;
  replacementTokenHash: string;
  usedAt: Date;
  ipAddress: string;
  userAgent?: string;
  audit: SecurityAuditContext;
}

export type UserSessionRevocationReason = 'LOGOUT' | 'LOGOUT_ALL';

export interface RevokeSession {
  userId: string;
  sessionId: string;
  reason: UserSessionRevocationReason;
  revokedAt: Date;
  audit: SecurityAuditContext;
  auditAction: SecurityAuditAction;
}

export interface RevokeAllSessions {
  userId: string;
  reason: UserSessionRevocationReason;
  revokedAt: Date;
  audit: SecurityAuditContext;
}

export interface ListActiveSessions {
  userId: string;
  activeAt: Date;
  page: number;
  limit: number;
}

export interface SessionMetadata {
  id: string;
  remembered: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface SessionPage {
  items: SessionMetadata[];
  total: number;
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
  abstract revoke(input: RevokeSession): Promise<void>;
  abstract revokeAll(input: RevokeAllSessions): Promise<void>;
  abstract listActive(input: ListActiveSessions): Promise<SessionPage>;
}
