import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LoginSessionUseCase,
  SESSION_LIFETIME_MS,
} from '../src/modules/identity/application/login-session.use-case';
import type { LoginUserUseCase } from '../src/modules/identity/application/login-user.use-case';
import type { RefreshTokenManager } from '../src/modules/identity/application/ports/refresh-token-manager';
import type { SessionRepository } from '../src/modules/identity/application/ports/session.repository';
import {
  InvalidRefreshTokenError,
  RefreshSessionUseCase,
} from '../src/modules/identity/application/refresh-session.use-case';

describe('session authentication use cases', () => {
  const now = new Date('2026-08-22T12:00:00.000Z');
  const requestId = 'request-session';
  const user = {
    id: '37694db4-23a5-4498-a49d-135fc98de279',
    phone: '+989123456789',
    roles: ['PATIENT'],
  };
  const refresh = {
    sessionId: 'df846b14-c123-45bd-8efe-58220999e940',
    rawToken: 'raw-refresh-token',
    tokenHash: 'a'.repeat(64),
  };
  const replacement = {
    ...refresh,
    rawToken: 'rotated-refresh-token',
    tokenHash: 'b'.repeat(64),
  };
  const executeLogin = vi.fn();
  const createSession = vi.fn();
  const rotateRefresh = vi.fn();
  const createRefresh = vi.fn();
  const inspectRefresh = vi.fn();
  const rotateToken = vi.fn();
  const issueAccess = vi.fn();
  const sessions = {
    create: createSession,
    rotateRefresh,
  } as unknown as SessionRepository;
  const refreshTokens = {
    create: createRefresh,
    inspect: inspectRefresh,
    rotate: rotateToken,
  } as unknown as RefreshTokenManager;
  const accessTokens = { issue: issueAccess };

  beforeEach(() => {
    executeLogin.mockReset();
    createSession.mockReset();
    rotateRefresh.mockReset();
    createRefresh.mockReset();
    inspectRefresh.mockReset();
    rotateToken.mockReset();
    issueAccess.mockReset();
    executeLogin.mockResolvedValue(user);
    createRefresh.mockReturnValue(refresh);
    rotateToken.mockReturnValue(replacement);
    issueAccess.mockResolvedValue('access-token');
    createSession.mockResolvedValue(undefined);
  });

  it.each([
    [false, SESSION_LIFETIME_MS.standard],
    [true, SESSION_LIFETIME_MS.remembered],
  ])('creates the correct absolute session deadline for remember=%s', async (
    remember,
    lifetime,
  ) => {
    const useCase = new LoginSessionUseCase(
      { execute: executeLogin } as unknown as LoginUserUseCase,
      sessions,
      refreshTokens,
      accessTokens,
      () => now,
    );

    const result = await useCase.execute({
      phone: '09123456789',
      password: 'candidate password',
      remember,
      ipAddress: '203.0.113.10',
      userAgent: 'test-agent',
      requestId,
    });
    const expiresAt = new Date(now.getTime() + lifetime);

    expect(issueAccess).toHaveBeenCalledWith({
      userId: user.id,
      sessionId: refresh.sessionId,
      roles: user.roles,
    });
    expect(createSession).toHaveBeenCalledWith({
      id: refresh.sessionId,
      userId: user.id,
      refreshTokenHash: refresh.tokenHash,
      remembered: remember,
      userAgent: 'test-agent',
      ipAddress: '203.0.113.10',
      expiresAt,
      audit: {
        requestId,
        ipAddress: '203.0.113.10',
        actorSessionId: refresh.sessionId,
      },
    });
    expect(result).toEqual({
      user,
      accessToken: 'access-token',
      refreshToken: refresh.rawToken,
      refreshExpiresAt: expiresAt,
    });
  });

  it('does not persist a session if access-token issuance fails', async () => {
    issueAccess.mockRejectedValue(new Error('signing unavailable'));
    const useCase = new LoginSessionUseCase(
      { execute: executeLogin } as unknown as LoginUserUseCase,
      sessions,
      refreshTokens,
      accessTokens,
      () => now,
    );

    await expect(useCase.execute({
      phone: user.phone,
      password: 'candidate password',
      remember: false,
      ipAddress: '203.0.113.10',
      requestId,
    })).rejects.toThrow('signing unavailable');
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rotates refresh storage before issuing the next access token', async () => {
    inspectRefresh.mockReturnValue({
      sessionId: refresh.sessionId,
      tokenHash: refresh.tokenHash,
    });
    rotateRefresh.mockResolvedValue({
      kind: 'ROTATED',
      user,
      expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS.standard),
      generation: 1,
    });
    const useCase = new RefreshSessionUseCase(
      sessions,
      refreshTokens,
      accessTokens,
      () => now,
    );

    await expect(useCase.execute({
      refreshToken: refresh.rawToken,
      ipAddress: '203.0.113.11',
      userAgent: 'rotating-agent',
      requestId,
    })).resolves.toMatchObject({
      user,
      accessToken: 'access-token',
      refreshToken: replacement.rawToken,
    });
    expect(rotateRefresh).toHaveBeenCalledWith({
      sessionId: refresh.sessionId,
      presentedTokenHash: refresh.tokenHash,
      replacementTokenHash: replacement.tokenHash,
      usedAt: now,
      ipAddress: '203.0.113.11',
      userAgent: 'rotating-agent',
      audit: {
        requestId,
        ipAddress: '203.0.113.11',
        actorSessionId: refresh.sessionId,
      },
    });
    expect(rotateRefresh.mock.invocationCallOrder[0])
      .toBeLessThan(issueAccess.mock.invocationCallOrder[0] ?? 0);
  });

  it.each(['INVALID', 'REUSED'] as const)(
    'maps repository status %s to one refresh error',
    async (kind) => {
      inspectRefresh.mockReturnValue({
        sessionId: refresh.sessionId,
        tokenHash: refresh.tokenHash,
      });
      rotateRefresh.mockResolvedValue({ kind });
      const useCase = new RefreshSessionUseCase(
        sessions,
        refreshTokens,
        accessTokens,
        () => now,
      );

      await expect(useCase.execute({
        refreshToken: refresh.rawToken,
        ipAddress: '203.0.113.11',
        requestId,
      })).rejects.toEqual(new InvalidRefreshTokenError());
      expect(issueAccess).not.toHaveBeenCalled();
    },
  );

  it('rejects missing and malformed tokens before persistence', async () => {
    inspectRefresh.mockReturnValue(null);
    const useCase = new RefreshSessionUseCase(
      sessions,
      refreshTokens,
      accessTokens,
      () => now,
    );

    await expect(useCase.execute({
      refreshToken: 'malformed',
      ipAddress: '203.0.113.11',
      requestId,
    })).rejects.toEqual(new InvalidRefreshTokenError());
    expect(rotateRefresh).not.toHaveBeenCalled();
  });
});
