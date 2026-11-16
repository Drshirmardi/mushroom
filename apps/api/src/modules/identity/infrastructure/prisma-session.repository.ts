import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  SessionRevocationReason,
  UserStatus,
} from '../../../generated/prisma/client';
import {
  SessionRepository,
  type CreateSession,
  type ListActiveSessions,
  type RevokeAllSessions,
  type RevokeSession,
  type RotateSessionRefresh,
  type SessionPage,
  type SessionRefreshResult,
} from '../application/ports/session.repository';
import { SECURITY_AUDIT_ACTIONS } from '../application/security-audit';
import { constantTimeRefreshHashEquals } from './hmac-refresh-token-manager';
import {
  AUDIT_SUBJECT_TYPES,
  recordSecurityAudit,
} from './prisma-security-audit';

interface LockedSessionRow {
  id: string;
  userId: string;
  refreshTokenHash: string;
  previousRefreshTokenHash: string | null;
  previousRefreshTokenExpiresAt: Date | null;
  refreshGeneration: number;
  expiresAt: Date;
  revokedAt: Date | null;
}

const limitUserAgent = (userAgent: string | undefined): string | undefined =>
  userAgent ? [...userAgent].slice(0, 512).join('') : undefined;

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateSession): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.session.create({
        data: {
          id: input.id,
          userId: input.userId,
          refreshTokenHash: input.refreshTokenHash,
          verifiedPhone: input.verifiedPhone,
          remembered: input.remembered,
          userAgent: limitUserAgent(input.userAgent),
          ipAddress: input.ipAddress,
          expiresAt: input.expiresAt,
        },
      });
      await recordSecurityAudit(transaction, {
        ...input.audit,
        action: SECURITY_AUDIT_ACTIONS.SESSION_CREATED,
        actorUserId: input.userId,
        subjectType: AUDIT_SUBJECT_TYPES.SESSION,
        subjectId: input.id,
        metadata: { remembered: input.remembered },
      });
    });
  }

  async rotateRefresh(
    input: RotateSessionRefresh,
  ): Promise<SessionRefreshResult> {
    return this.prisma.$transaction(async (transaction) => {
      const sessions = await transaction.$queryRaw<LockedSessionRow[]>`
        SELECT
          "id",
          "user_id" AS "userId",
          "refresh_token_hash" AS "refreshTokenHash",
          "previous_refresh_token_hash" AS "previousRefreshTokenHash",
          "previous_refresh_token_expires_at" AS "previousRefreshTokenExpiresAt",
          "refresh_generation" AS "refreshGeneration",
          "expires_at" AS "expiresAt",
          "revoked_at" AS "revokedAt"
        FROM "sessions"
        WHERE "id" = ${input.sessionId}::uuid
        FOR UPDATE
      `;
      const session = sessions[0];

      if (
        !session
        || session.revokedAt !== null
        || session.expiresAt.getTime() <= input.usedAt.getTime()
      ) {
        return { kind: 'INVALID' };
      }

      if (!constantTimeRefreshHashEquals(session.refreshTokenHash, input.presentedTokenHash)) {
        if (
          session.previousRefreshTokenHash !== null
          && session.previousRefreshTokenExpiresAt !== null
          && session.previousRefreshTokenExpiresAt.getTime() > input.usedAt.getTime()
          && constantTimeRefreshHashEquals(
            session.previousRefreshTokenHash,
            input.presentedTokenHash,
          )
        ) {
          return { kind: 'CONCURRENT_REFRESH' };
        }

        await transaction.session.update({
          where: { id: session.id },
          data: {
            revokedAt: input.usedAt,
            revokedReason: SessionRevocationReason.REFRESH_REUSE_DETECTED,
          },
        });
        await recordSecurityAudit(transaction, {
          ...input.audit,
          action: SECURITY_AUDIT_ACTIONS.SESSION_REFRESH_REUSE_DETECTED,
          actorUserId: session.userId,
          subjectType: AUDIT_SUBJECT_TYPES.SESSION,
          subjectId: session.id,
          metadata: { generation: session.refreshGeneration },
        });

        // The transaction commits this durable revocation before the caller
        // performs local Socket.IO invalidation.
        return { kind: 'REVOKED' };
      }

      const user = await transaction.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          phone: true,
          status: true,
          roles: { select: { role: { select: { code: true } } } },
        },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        await transaction.session.update({
          where: { id: session.id },
          data: {
            revokedAt: input.usedAt,
            revokedReason: SessionRevocationReason.ADMIN_REVOKED,
          },
        });

        // A disabled user also changes an otherwise active session into a
        // durable revocation; callers must evict any existing local socket.
        return { kind: 'REVOKED' };
      }

      const generation = session.refreshGeneration + 1;
      await transaction.session.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: input.replacementTokenHash,
          previousRefreshTokenHash: session.refreshTokenHash,
          previousRefreshTokenExpiresAt: new Date(input.usedAt.getTime() + 15_000),
          refreshGeneration: generation,
          lastUsedAt: input.usedAt,
          ipAddress: input.ipAddress,
          userAgent: limitUserAgent(input.userAgent),
        },
      });

      return {
        kind: 'ROTATED',
        user: {
          id: user.id,
          phone: user.phone,
          roles: user.roles.map(({ role }) => role.code),
        },
        expiresAt: session.expiresAt,
        generation,
      };
    });
  }

  async revoke(input: RevokeSession): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: {
          id: input.sessionId,
          userId: input.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: input.revokedAt,
          revokedReason: input.reason,
        },
      });
      if (revoked.count === 0) return;

      await recordSecurityAudit(transaction, {
        ...input.audit,
        action: input.auditAction,
        actorUserId: input.userId,
        subjectType: AUDIT_SUBJECT_TYPES.SESSION,
        subjectId: input.sessionId,
        metadata: { reason: input.reason },
      });
    });
  }

  async revokeAll(input: RevokeAllSessions): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: input.revokedAt,
          revokedReason: input.reason,
        },
      });
      if (revoked.count === 0) return;

      await recordSecurityAudit(transaction, {
        ...input.audit,
        action: SECURITY_AUDIT_ACTIONS.SESSIONS_LOGGED_OUT_ALL,
        actorUserId: input.userId,
        subjectType: AUDIT_SUBJECT_TYPES.USER,
        subjectId: input.userId,
        metadata: {
          reason: input.reason,
          revokedSessionCount: revoked.count,
        },
      });
    });
  }

  async listActive(input: ListActiveSessions): Promise<SessionPage> {
    const where = {
      userId: input.userId,
      revokedAt: null,
      expiresAt: { gt: input.activeAt },
    } as const;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where,
        select: {
          id: true,
          remembered: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
        },
        orderBy: [{ lastUsedAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.session.count({ where }),
    ]);

    return { items, total };
  }
}
