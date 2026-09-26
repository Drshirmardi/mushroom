import {
  SessionRepository,
  type SessionMetadata,
} from './ports/session.repository';
import {
  SECURITY_AUDIT_ACTIONS,
  type SecurityAuditContext,
} from './security-audit';

export interface SessionListItem extends SessionMetadata {
  current: boolean;
}

export interface SessionListResult {
  items: SessionListItem[];
  page: number;
  limit: number;
  total: number;
}

export class ManageSessionsUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly sockets: { disconnectSession(sessionId: string): void; disconnectUser(userId: string): void },
    private readonly now: () => Date = () => new Date(),
  ) {}

  async logout(
    userId: string,
    sessionId: string,
    audit: SecurityAuditContext,
  ): Promise<void> {
    await this.sessions.revoke({
      userId,
      sessionId,
      reason: 'LOGOUT',
      revokedAt: this.now(),
      audit,
      auditAction: SECURITY_AUDIT_ACTIONS.SESSION_LOGGED_OUT,
    });
    this.sockets.disconnectSession(sessionId);
  }

  async logoutAll(
    userId: string,
    audit: SecurityAuditContext,
  ): Promise<void> {
    await this.sessions.revokeAll({
      userId,
      reason: 'LOGOUT_ALL',
      revokedAt: this.now(),
      audit,
    });
    this.sockets.disconnectUser(userId);
  }

  async revoke(
    userId: string,
    sessionId: string,
    audit: SecurityAuditContext,
  ): Promise<void> {
    await this.sessions.revoke({
      userId,
      sessionId,
      reason: 'LOGOUT',
      revokedAt: this.now(),
      audit,
      auditAction: SECURITY_AUDIT_ACTIONS.SESSION_REVOKED,
    });
    this.sockets.disconnectSession(sessionId);
  }

  async list(
    userId: string,
    currentSessionId: string,
    page: number,
    limit: number,
  ): Promise<SessionListResult> {
    const result = await this.sessions.listActive({
      userId,
      activeAt: this.now(),
      page,
      limit,
    });

    return {
      items: result.items.map((session) => ({
        ...session,
        current: session.id === currentSessionId,
      })),
      page,
      limit,
      total: result.total,
    };
  }
}
