import { randomUUID } from 'node:crypto';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

export async function createTestAccessToken(
  prisma: PrismaService,
  tokens: AccessTokenService,
  roles: string[],
  userId?: string,
): Promise<{ token: string; userId: string; sessionId: string }> {
  const resolvedUserId = userId ?? (await prisma.user.create({
    data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` },
  })).id;
  const session = await prisma.session.create({
    data: {
      userId: resolvedUserId,
      refreshTokenHash: `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`,
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });

  return {
    token: await tokens.issue({ userId: resolvedUserId, sessionId: session.id, roles }),
    userId: resolvedUserId,
    sessionId: session.id,
  };
}
