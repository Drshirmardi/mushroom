import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { ConflictException, HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SmsDeliveryService } from '../../communications/sms/sms-delivery.service';
import { normalizeIranianMobile } from '../domain/phone-number';
import { PublicAuthRateLimiter } from './ports/public-auth-rate-limiter';
import { SessionIssuerUseCase } from './session-issuer.use-case';

type RequestContext = { ipAddress: string; userAgent?: string; requestId: string };

@Injectable()
export class OtpAuthenticationUseCase {
  constructor(private readonly prisma: PrismaService, private readonly delivery: SmsDeliveryService, private readonly rateLimiter: PublicAuthRateLimiter, private readonly sessions: SessionIssuerUseCase, private readonly config: ConfigService) {}

  async request(input: { phone: string; remember: boolean; idempotencyKey?: string } & RequestContext) {
    const phone = normalizeIranianMobile(input.phone); const key = this.idempotency(input.idempotencyKey); const now = new Date();
    await this.prisma.otpChallenge.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, status: { in: ['FAILED', 'CONSUMED', 'EXPIRED', 'SUPERSEDED', 'LOCKED'] } } });
    const policy = await this.policy(); if (!policy.enabled) throw this.unavailable('OTP_DISABLED');
    const existing = await this.prisma.otpChallenge.findUnique({ where: { purpose_canonicalPhone_idempotencyKey: { purpose: 'AUTHENTICATION', canonicalPhone: phone, idempotencyKey: key } } });
    if (existing) {
      if (['ACCEPTED', 'UNKNOWN'].includes(existing.status)) return this.response(existing);
      throw this.unavailable('OTP_DELIVERY_UNAVAILABLE');
    }
    const allowed = await this.rateLimiter.consume({ scope: 'otp-request', windowMs: policy.requestWindowSeconds * 1000, at: now, subjects: [{ kind: 'phone', value: phone, limit: policy.phoneRequestLimit }, { kind: 'ip', value: input.ipAddress, limit: policy.phoneRequestLimit * 5 }] });
    if (!allowed) throw this.tooMany('OTP_RATE_LIMITED', 'OTP request limit exceeded.');
    const id = randomUUID(); const code = this.code(policy.codeLength);
    const challenge = await this.prisma.otpChallenge.create({ data: { id, purpose: 'AUTHENTICATION', canonicalPhone: phone, verifier: this.verifier(id, phone, code), expiresAt: new Date(now.getTime() + policy.expiresInSeconds * 1000), resendAvailableAt: new Date(now.getTime() + policy.resendCooldownSeconds * 1000), maxVerifyAttempts: policy.maxVerifyAttempts, remember: input.remember, idempotencyKey: key, requestIpHash: createHmac('sha256', this.config.getOrThrow<string>('OTP_PEPPER')).update(`ip\0${input.ipAddress}`).digest('hex') } });
    let delivered: { outcome: 'ACCEPTED' | 'FAILED' | 'UNKNOWN' };
    try { delivered = await this.delivery.sendAuthenticationCode(challenge.id, phone, code); }
    catch (error) { await this.prisma.otpChallenge.updateMany({ where: { id: challenge.id, status: 'PENDING' }, data: { status: 'FAILED' } }); throw error; }
    if (delivered.outcome === 'FAILED') throw this.unavailable('OTP_DELIVERY_UNAVAILABLE');
    return this.response(challenge);
  }

  async resend(challengeId: string, idempotencyKey: string | undefined, context: RequestContext) {
    const previous = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!previous || !['ACCEPTED', 'UNKNOWN'].includes(previous.status)) throw this.invalid();
    if (previous.resendAvailableAt > new Date()) throw new ConflictException({ code: 'OTP_RESEND_COOLDOWN', message: 'OTP resend cooldown is active.', details: { resendAvailableAt: previous.resendAvailableAt.toISOString() } });
    const next = await this.request({ phone: previous.canonicalPhone, remember: previous.remember, idempotencyKey, ...context });
    await this.prisma.otpChallenge.updateMany({ where: { id: previous.id, status: { in: ['ACCEPTED', 'UNKNOWN'] } }, data: { status: 'SUPERSEDED', supersededAt: new Date() } });
    return next;
  }

  async verify(challengeId: string, code: string, context: RequestContext) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${challengeId}))::text AS locked`);
      const challenge = await tx.otpChallenge.findUnique({ where: { id: challengeId } }); const now = new Date();
      if (!challenge || !['ACCEPTED', 'UNKNOWN'].includes(challenge.status)) return { error: 'INVALID' as const };
      if (challenge.expiresAt <= now) { await tx.otpChallenge.update({ where: { id: challenge.id }, data: { status: 'EXPIRED' } }); return { error: 'EXPIRED' as const }; }
      const expected = Buffer.from(challenge.verifier, 'hex'); const actual = Buffer.from(this.verifier(challenge.id, challenge.canonicalPhone, code), 'hex');
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        const attempts = challenge.verifyAttemptCount + 1; await tx.otpChallenge.update({ where: { id: challenge.id }, data: { verifyAttemptCount: attempts, status: attempts >= challenge.maxVerifyAttempts ? 'LOCKED' : challenge.status } });
        return { error: attempts >= challenge.maxVerifyAttempts ? 'EXHAUSTED' as const : 'INVALID' as const };
      }
      const consumed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, status: { in: ['ACCEPTED', 'UNKNOWN'] }, consumedAt: null }, data: { status: 'CONSUMED', consumedAt: now } });
      if (consumed.count !== 1) return { error: 'INVALID' as const };
      let user = await tx.user.findUnique({ where: { phone: challenge.canonicalPhone }, include: { roles: { include: { role: true } } } });
      if (!user) {
        const clinic = await tx.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); const role = await tx.role.findUnique({ where: { code: 'PATIENT' } });
        if (!clinic || !role) throw this.unavailable('OTP_ACCOUNT_PROVISIONING_UNAVAILABLE');
        user = await tx.user.upsert({ where: { phone: challenge.canonicalPhone }, update: {}, create: { phone: challenge.canonicalPhone, roles: { create: { roleId: role.id } }, patientProfile: { create: { clinicId: clinic.id } } }, include: { roles: { include: { role: true } } } });
      }
      if (user.status !== 'ACTIVE') throw this.invalid();
      await tx.auditEvent.create({ data: { action: 'OTP_AUTHENTICATED', actorUserId: user.id, subjectType: 'USER', subjectId: user.id, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: { challengeId: challenge.id } } });
      return { user: { id: user.id, phone: user.phone, roles: user.roles.map(({ role }) => role.code) }, remember: challenge.remember };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ('error' in result) { if (result.error === 'EXPIRED') throw this.expired(); if (result.error === 'EXHAUSTED') throw this.tooMany('OTP_ATTEMPTS_EXHAUSTED', 'OTP verification attempts are exhausted.'); throw this.invalid(); }
    return this.sessions.execute({ user: result.user, remember: result.remember, ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId });
  }

  private policy() { return this.prisma.otpPolicy.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} }); }
  private code(length: number) { const min = 10 ** (length - 1); return String(randomInt(min, 10 ** length)); }
  private verifier(id: string, phone: string, code: string) { return createHmac('sha256', this.config.getOrThrow<string>('OTP_PEPPER')).update(`v1\0AUTHENTICATION\0${id}\0${phone}\0${code}`).digest('hex'); }
  private idempotency(value: string | undefined) { const key = value?.trim(); if (!key || key.length > 240 || !/^[\x21-\x7e]+$/u.test(key)) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_INVALID', message: 'Idempotency-Key is required.', details: {} }); return key; }
  private response(challenge: { id: string; canonicalPhone: string; expiresAt: Date; resendAvailableAt: Date }) { return { challengeId: challenge.id, expiresAt: challenge.expiresAt.toISOString(), resendAvailableAt: challenge.resendAvailableAt.toISOString(), destinationMasked: `${challenge.canonicalPhone.slice(0, 5)}***${challenge.canonicalPhone.slice(-2)}` }; }
  private invalid() { return new UnauthorizedException({ code: 'OTP_INVALID', message: 'OTP challenge or code is invalid.', details: {} }); }
  private expired() { return new UnauthorizedException({ code: 'OTP_EXPIRED', message: 'OTP challenge has expired.', details: {} }); }
  private unavailable(code: string) { return new ServiceUnavailableException({ code, message: 'OTP service is unavailable.', details: {} }); }
  private tooMany(code: string, message: string) { return new HttpException({ code, message, details: {} }, HttpStatus.TOO_MANY_REQUESTS); }
}
