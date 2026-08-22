import {
  SessionRepository,
  type SessionMetadata,
} from './ports/session.repository';

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
    private readonly now: () => Date = () => new Date(),
  ) {}

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessions.revoke({
      userId,
      sessionId,
      reason: 'LOGOUT',
      revokedAt: this.now(),
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeAll({
      userId,
      reason: 'LOGOUT_ALL',
      revokedAt: this.now(),
    });
  }

  async revoke(userId: string, sessionId: string): Promise<void> {
    await this.sessions.revoke({
      userId,
      sessionId,
      reason: 'LOGOUT',
      revokedAt: this.now(),
    });
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
