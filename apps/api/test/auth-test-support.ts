import { randomUUID } from 'node:crypto';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

export function assertPatientJourneyTestDatabase() {
  const target = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '55419' || !['/patient_journey_test', '/patient_journey_program_purchase_test', '/patient_journey_custom_request_test', '/patient_journey_custom_request_verified_test'].includes(target.pathname) || process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1') throw new Error('Explicit disposable patient journey database on localhost:55419 required.');
}

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
