import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { OtpAuthenticationUseCase } from '../src/modules/identity/application/otp-authentication.use-case';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('OTP authentication persistence', () => {
  let prisma: PrismaService;
  let useCase: OtpAuthenticationUseCase;
  let deliveredCode = '';

  beforeAll(async () => {
    prisma = new PrismaService(new ConfigService({ DATABASE_URL: databaseUrl }));
    await prisma.auditEvent.deleteMany({ where: { action: 'OTP_AUTHENTICATED' } });
    await prisma.smsDeliveryAttempt.deleteMany();
    await prisma.otpChallenge.deleteMany();
    await prisma.patientProfile.deleteMany({ where: { user: { phone: '+989123456789' } } });
    await prisma.user.deleteMany({ where: { phone: '+989123456789' } });
    const clinic = await prisma.clinic.findFirst({ where: { status: 'ACTIVE' } });
    if (!clinic) await prisma.clinic.create({ data: { name: 'OTP integration clinic', status: 'ACTIVE' } });
    const delivery = { sendAuthenticationCode: async (challengeId: string, _phone: string, code: string) => { deliveredCode = code; await prisma.otpChallenge.update({ where: { id: challengeId }, data: { status: 'ACCEPTED' } }); return { outcome: 'ACCEPTED' as const }; } };
    const limiter = { consume: async () => true };
    const sessions = { execute: async ({ user, remember }: { user: { id: string; phone: string; roles: string[] }; remember: boolean }) => ({ user, accessToken: 'test-access', refreshToken: 'test-refresh', refreshExpiresAt: new Date(), remember }) };
    useCase = new OtpAuthenticationUseCase(prisma, delivery as never, limiter as never, sessions as never, new ConfigService({ OTP_PEPPER: 'integration-otp-pepper-with-more-than-thirty-two-bytes' }));
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { action: 'OTP_AUTHENTICATED' } });
    await prisma.smsDeliveryAttempt.deleteMany();
    await prisma.otpChallenge.deleteMany();
    await prisma.patientProfile.deleteMany({ where: { user: { phone: '+989123456789' } } });
    await prisma.user.deleteMany({ where: { phone: '+989123456789' } });
    await prisma.clinic.deleteMany({ where: { name: 'OTP integration clinic', patientProfiles: { none: {} } } });
    await prisma.$disconnect();
  });

  it('creates a passwordless patient and consumes a code exactly once', async () => {
    const challenge = await useCase.request({ phone: '09123456789', remember: true, idempotencyKey: 'otp-integration-1', ipAddress: '127.0.0.1', requestId: 'otp-test' });
    expect(deliveredCode).toMatch(/^\d{6}$/u);
    const authenticated = await useCase.verify(challenge.challengeId, deliveredCode, { ipAddress: '127.0.0.1', requestId: 'otp-test' });
    expect(authenticated.user.roles).toContain('PATIENT');
    const user = await prisma.user.findUniqueOrThrow({ where: { phone: '+989123456789' }, include: { credential: true, patientProfile: true } });
    expect(user.credential).toBeNull();
    expect(user.patientProfile).not.toBeNull();
    await expect(useCase.verify(challenge.challengeId, deliveredCode, { ipAddress: '127.0.0.1', requestId: 'otp-test-2' })).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });

    const concurrent = await useCase.request({ phone: '09123456789', remember: false, idempotencyKey: 'otp-integration-2', ipAddress: '127.0.0.1', requestId: 'otp-test-3' });
    const outcomes = await Promise.allSettled([
      useCase.verify(concurrent.challengeId, deliveredCode, { ipAddress: '127.0.0.1', requestId: 'otp-concurrent-1' }),
      useCase.verify(concurrent.challengeId, deliveredCode, { ipAddress: '127.0.0.1', requestId: 'otp-concurrent-2' }),
    ]);
    expect(outcomes.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
  });
});
