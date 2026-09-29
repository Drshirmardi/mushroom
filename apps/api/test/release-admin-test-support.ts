import { randomUUID } from 'node:crypto';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

export type ReleaseAdminTestPrincipal = {
  userId: string;
  sessionId: string;
  token: string;
};

export async function createReleaseAdminTestPrincipal(
  prisma: PrismaService,
  tokens: AccessTokenService,
): Promise<ReleaseAdminTestPrincipal> {
  const user = await prisma.user.create({
    data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` },
  });
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`,
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });

  return {
    userId: user.id,
    sessionId: session.id,
    token: await tokens.issue({ userId: user.id, sessionId: session.id, roles: ['ADMIN'] }),
  };
}

export async function disposeReleaseAdminTestPrincipal(
  prisma: PrismaService,
  principal: ReleaseAdminTestPrincipal | undefined,
): Promise<void> {
  if (!principal) return;
  await prisma.auditEvent.deleteMany({ where: { actorUserId: principal.userId } });
  await prisma.patientAccessAudit.deleteMany({ where: { actorUserId: principal.userId } });
  await prisma.session.deleteMany({ where: { id: principal.sessionId } });
  await prisma.user.deleteMany({ where: { id: principal.userId } });
}
