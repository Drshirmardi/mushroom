import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  PublicAuthRateLimiter,
  type ConsumePublicAuthRateLimit,
} from '../application/ports/public-auth-rate-limiter';

const bucketKey = (scope: string, kind: string, value: string): string =>
  createHash('sha256').update(`${scope}:${kind}:${value}`, 'utf8').digest('hex');

@Injectable()
export class PrismaPublicAuthRateLimiter extends PublicAuthRateLimiter {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async consume(request: ConsumePublicAuthRateLimit): Promise<boolean> {
    const subjects = request.subjects.map((subject) => ({
      ...subject,
      key: bucketKey(request.scope, subject.kind, subject.value),
    }));
    const windowStartedAfter = new Date(request.at.getTime() - request.windowMs);
    const expiredBefore = new Date(request.at.getTime() - request.windowMs * 4);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.authRateLimitBucket.deleteMany({
        where: { updatedAt: { lt: expiredBefore } },
      });

      for (const key of subjects.map(({ key }) => key).sort()) {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS locked
        `;
      }

      const existing = await transaction.authRateLimitBucket.findMany({
        where: { key: { in: subjects.map(({ key }) => key) } },
      });
      const buckets = new Map(existing.map((bucket) => [bucket.key, bucket]));
      const limited = subjects.some(({ key, limit }) => {
        const bucket = buckets.get(key);

        return Boolean(
          bucket
          && bucket.windowStartedAt >= windowStartedAfter
          && bucket.requestCount >= limit,
        );
      });

      if (limited) return false;

      for (const { key } of subjects) {
        const bucket = buckets.get(key);
        const active = bucket?.windowStartedAt
          && bucket.windowStartedAt >= windowStartedAfter;

        await transaction.authRateLimitBucket.upsert({
          where: { key },
          create: {
            key,
            windowStartedAt: request.at,
            requestCount: 1,
          },
          update: active
            ? { requestCount: { increment: 1 } }
            : { windowStartedAt: request.at, requestCount: 1 },
        });
      }

      return true;
    });
  }
}
