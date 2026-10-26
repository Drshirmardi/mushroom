import { createHmac, randomUUID } from 'node:crypto';
import 'dotenv/config';

import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('OTP HTTP error contract (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const challengeIds = new Set<string>();
  let otpPepper: string;

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    otpPepper = app.get(ConfigService).getOrThrow<string>('OTP_PEPPER');
  }, 30_000);

  afterAll(async () => {
    if (challengeIds.size > 0) {
      await prisma.otpChallenge.deleteMany({ where: { id: { in: [...challengeIds] } } });
    }
    await app.close();
  });

  it('returns OTP_INVALID to HTTP clients for an accepted challenge with a wrong code', async () => {
    const id = randomUUID();
    const phone = `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}`;
    const validCode = '123456';
    challengeIds.add(id);
    await prisma.otpChallenge.create({
      data: {
        id,
        purpose: 'AUTHENTICATION',
        canonicalPhone: phone,
        verifier: createHmac('sha256', otpPepper)
          .update(`v1\0AUTHENTICATION\0${id}\0${phone}\0${validCode}`)
          .digest('hex'),
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 60_000),
        resendAvailableAt: new Date(Date.now() + 60_000),
        maxVerifyAttempts: 5,
        idempotencyKey: `otp-error-${id}`,
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/v1/auth/otp/challenges/${id}/verify`,
      payload: { code: '000000' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'OTP_INVALID' });
  });
});
