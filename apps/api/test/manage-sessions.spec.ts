import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ManageSessionsUseCase } from '../src/modules/identity/application/manage-sessions.use-case';
import type { SessionRepository } from '../src/modules/identity/application/ports/session.repository';

describe('ManageSessionsUseCase', () => {
  const now = new Date('2026-08-22T12:00:00.000Z');
  const userId = '37694db4-23a5-4498-a49d-135fc98de279';
  const currentSessionId = 'df846b14-c123-45bd-8efe-58220999e940';
  const otherSessionId = '524722c1-5057-45e0-b385-48005194f44f';
  const audit = {
    requestId: 'request-management',
    ipAddress: '203.0.113.12',
    actorSessionId: currentSessionId,
  };
  const revoke = vi.fn();
  const revokeAll = vi.fn();
  const listActive = vi.fn();
  const sessions = {
    revoke,
    revokeAll,
    listActive,
  } as unknown as SessionRepository;
  const useCase = new ManageSessionsUseCase(sessions, () => now);

  beforeEach(() => {
    revoke.mockReset().mockResolvedValue(undefined);
    revokeAll.mockReset().mockResolvedValue(undefined);
    listActive.mockReset();
  });

  it('revokes the current session idempotently as logout', async () => {
    await useCase.logout(userId, currentSessionId, audit);

    expect(revoke).toHaveBeenCalledWith({
      userId,
      sessionId: currentSessionId,
      reason: 'LOGOUT',
      revokedAt: now,
      audit,
      auditAction: 'IDENTITY_SESSION_LOGGED_OUT',
    });
  });

  it('revokes all owned sessions as logout-all', async () => {
    await useCase.logoutAll(userId, audit);

    expect(revokeAll).toHaveBeenCalledWith({
      userId,
      reason: 'LOGOUT_ALL',
      revokedAt: now,
      audit,
    });
  });

  it('uses the same ownership-scoped logout reason for a selected session', async () => {
    await useCase.revoke(userId, otherSessionId, audit);

    expect(revoke).toHaveBeenCalledWith({
      userId,
      sessionId: otherSessionId,
      reason: 'LOGOUT',
      revokedAt: now,
      audit,
      auditAction: 'IDENTITY_SESSION_REVOKED',
    });
  });

  it('lists only repository metadata and marks the current session', async () => {
    const metadata = {
      id: currentSessionId,
      remembered: false,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: new Date('2026-08-23T12:00:00.000Z'),
    };
    listActive.mockResolvedValue({ items: [metadata], total: 1 });

    await expect(useCase.list(userId, currentSessionId, 2, 10)).resolves.toEqual({
      items: [{ ...metadata, current: true }],
      page: 2,
      limit: 10,
      total: 1,
    });
    expect(listActive).toHaveBeenCalledWith({
      userId,
      activeAt: now,
      page: 2,
      limit: 10,
    });
  });
});
