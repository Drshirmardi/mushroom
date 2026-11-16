import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { normalizeIranianMobile } from '../domain/phone-number';
import { SessionIssuerUseCase } from '../application/session-issuer.use-case';
import type { SessionAuthenticationResult } from '../application/login-session.use-case';
import { BaleInitDataError, verifyBaleInitData, type VerifiedBaleUser } from './bale-init-data';

type RequestContext = { ipAddress: string; requestId: string; userAgent?: string };
type Authentication = { status: 'AUTHENTICATED'; result: SessionAuthenticationResult };
type ContactRequired = { status: 'CONTACT_REQUIRED' };
type Pending = { status: 'CONTACT_PENDING' };
type LinkRequired = { status: 'ACCOUNT_LINK_REQUIRED'; phone: string };
export type BaleFlowResult = Authentication | ContactRequired | Pending | LinkRequired;

const CONTACT_TTL_MS = 5 * 60_000;
const hashTicket = (ticket: string) => createHash('sha256').update(ticket).digest('hex');
const invalid = () => new UnauthorizedException({ code: 'BALE_AUTH_INVALID', message: 'Bale identity or contact request is invalid.', details: {} });
const limited = () => new ConflictException({ code: 'BALE_LINK_CONFLICT', message: 'The account cannot be linked.', details: {} });
export const unsupportedBaleAccount = () => new ForbiddenException({
  code: 'BALE_ACCOUNT_UNSUPPORTED',
  message: 'Bale sign-in is available only for active patient accounts.',
  details: {},
});
export const hasBalePatientRole = (roles: string[]) => roles.includes('PATIENT') && !roles.some(role => ['ADMIN', 'STAFF', 'DOCTOR'].includes(role));
const isActivePatient = (user: { status: string; roles: { role: { code: string } }[] }) =>
  user.status === 'ACTIVE' && hasBalePatientRole(user.roles.map(({ role }) => role.code));

/** This service only trusts signed Bale initData and authenticated webhook updates. */
@Injectable()
export class BaleAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sessions: SessionIssuerUseCase,
  ) {}

  private verify(raw: string): VerifiedBaleUser {
    if (this.config.get('BALE_AUTH_ENABLED') !== 'true') {
      throw new ServiceUnavailableException({ code: 'BALE_DISABLED', message: 'Bale login is disabled.', details: {} });
    }
    const token = this.config.get<string>('BALE_BOT_TOKEN');
    if (!token) throw new ServiceUnavailableException({ code: 'BALE_NOT_CONFIGURED', message: 'Bale login is unavailable.', details: {} });
    try { return verifyBaleInitData(raw, token); }
    catch (error) { if (error instanceof BaleInitDataError) throw invalid(); throw error; }
  }

  private async issue(user: { id: string; phone: string; status: string; roles: { role: { code: string } }[] }, context: RequestContext, baleProviderUserId: string): Promise<Authentication> {
    const roles = user.roles.map(({ role }) => role.code);
    if (!isActivePatient(user)) throw invalid();
    return {
      status: 'AUTHENTICATED',
      result: await this.sessions.execute({
        user: { id: user.id, phone: user.phone, roles },
        remember: true,
        baleProviderUserId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      }),
    };
  }

  async exchange(raw: string, context: RequestContext): Promise<BaleFlowResult> {
    const bale = this.verify(raw);
    const identity = await this.prisma.externalAuthIdentity.findUnique({
      where: { provider_providerUserId: { provider: 'BALE', providerUserId: bale.providerUserId } },
      select: {
        user: {
          select: {
            id: true, phone: true, status: true,
            roles: { select: { role: { select: { code: true } } } },
          },
        },
      },
    });
    return identity ? this.issue(identity.user, context, bale.providerUserId) : { status: 'CONTACT_REQUIRED' };
  }

  async requestContact(raw: string): Promise<{ status: 'CONTACT_REQUIRED'; ticket: string; expiresAt: string }> {
    const bale = this.verify(raw);
    const exists = await this.prisma.externalAuthIdentity.findUnique({
      where: { provider_providerUserId: { provider: 'BALE', providerUserId: bale.providerUserId } },
      select: { userId: true },
    });
    if (exists) throw limited();
    const ticket = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + CONTACT_TTL_MS);
    await this.prisma.baleContactChallenge.upsert({
      where: { providerUserId: bale.providerUserId },
      create: {
        id: randomUUID(), providerUserId: bale.providerUserId, ticketHash: hashTicket(ticket),
        expiresAt, status: 'PENDING',
      },
      update: {
        ticketHash: hashTicket(ticket), status: 'PENDING',
        phone: null, verifiedAt: null, consumedAt: null, createdAt: new Date(), expiresAt,
      },
    });
    return { status: 'CONTACT_REQUIRED', ticket, expiresAt: expiresAt.toISOString() };
  }

  private async challenge(raw: string, ticket: string) {
    const bale = this.verify(raw);
    if (!/^[A-Za-z0-9_-]{43}$/u.test(ticket)) throw invalid();
    const challenge = await this.prisma.baleContactChallenge.findUnique({ where: { providerUserId: bale.providerUserId } });
    if (!challenge || challenge.expiresAt.getTime() <= Date.now() || challenge.consumedAt ||
        !timingSafeEqual(Buffer.from(challenge.ticketHash, 'hex'), Buffer.from(hashTicket(ticket), 'hex'))) throw invalid();
    return { bale, challenge };
  }

  async completeContact(raw: string, ticket: string, context: RequestContext): Promise<BaleFlowResult> {
    const { bale, challenge } = await this.challenge(raw, ticket);
    if (challenge.status === 'PENDING') return { status: 'CONTACT_PENDING' };
    if (challenge.status !== 'VERIFIED' || !challenge.phone) throw invalid();

    // Never auto-link an existing medical account based on a phone from the browser.
    const prior = await this.prisma.user.findUnique({
      where: { phone: challenge.phone },
      select: { status: true, roles: { select: { role: { select: { code: true } } } } },
    });
    if (prior) {
      if (!isActivePatient(prior)) throw unsupportedBaleAccount();
      return { status: 'ACCOUNT_LINK_REQUIRED', phone: challenge.phone };
    }

    try {
      const user = await this.prisma.$transaction(async tx => {
        const locked = await tx.baleContactChallenge.updateMany({
          where: { id: challenge.id, status: 'VERIFIED', consumedAt: null, expiresAt: { gt: new Date() }, ticketHash: challenge.ticketHash },
          data: { status: 'CONSUMED', consumedAt: new Date() },
        });
        if (locked.count !== 1) throw limited();

        const existing = await tx.externalAuthIdentity.findUnique({
          where: { provider_providerUserId: { provider: 'BALE', providerUserId: bale.providerUserId } },
          select: { userId: true },
        });
        if (existing || await tx.user.findUnique({ where: { phone: challenge.phone! }, select: { id: true } })) throw limited();
        const role = await tx.role.findUnique({ where: { code: 'PATIENT' }, select: { id: true } });
        const clinic = await tx.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } });
        if (!role || !clinic) throw new ServiceUnavailableException({ code: 'BALE_PROVISIONING_UNAVAILABLE', message: 'Cannot provision patient account.', details: {} });

        const created = await tx.user.create({
          data: {
            phone: challenge.phone!,
            roles: { create: { roleId: role.id } },
            patientProfile: { create: { clinicId: clinic.id } },
            externalAuthIdentities: { create: { provider: 'BALE', providerUserId: bale.providerUserId } },
          },
          select: {
            id: true, phone: true, status: true,
            roles: { select: { role: { select: { code: true } } } },
          },
        });
        await tx.auditEvent.create({
          data: {
            action: 'BALE_ACCOUNT_CREATED', actorUserId: created.id,
            subjectType: 'USER', subjectId: created.id,
            requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress,
            metadata: { provider: 'BALE' },
          },
        });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return this.issue(user, context, bale.providerUserId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw limited();
      throw error;
    }
  }

  /** Requires a *fresh OTP-verified* patient session, not an arbitrary pre-existing cookie. */
  async linkExisting(raw: string, ticket: string, userId: string, sessionId: string, context: RequestContext): Promise<void> {
    const { bale, challenge } = await this.challenge(raw, ticket);
    if (challenge.status !== 'VERIFIED' || !challenge.phone) throw invalid();
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, verifiedPhone: true, createdAt: true, revokedAt: true, expiresAt: true },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, status: true, roles: { select: { role: { select: { code: true } } } } },
    });
    if (!user || !isActivePatient(user)) throw unsupportedBaleAccount();
    if (user.phone !== challenge.phone || session?.userId !== userId || session.verifiedPhone !== challenge.phone ||
      session.revokedAt || session.expiresAt.getTime() <= Date.now() || session.createdAt.getTime() < Date.now() - 10 * 60_000) throw new ForbiddenException({ code: 'BALE_REAUTH_REQUIRED', message: 'Fresh phone authentication is required.', details: {} });

    try {
      await this.prisma.$transaction(async tx => {
        const claimed = await tx.baleContactChallenge.updateMany({
          where: { id: challenge.id, status: 'VERIFIED', consumedAt: null, expiresAt: { gt: new Date() }, ticketHash: challenge.ticketHash },
          data: { status: 'CONSUMED', consumedAt: new Date() },
        });
        if (claimed.count !== 1) throw limited();
        await tx.externalAuthIdentity.create({ data: { provider: 'BALE', providerUserId: bale.providerUserId, userId } });
        await tx.auditEvent.create({
          data: { action: 'BALE_ACCOUNT_LINKED', actorUserId: userId, actorSessionId: sessionId,
            subjectType: 'USER', subjectId: userId, requestId: context.requestId.slice(0, 128),
            ipAddress: context.ipAddress, metadata: { provider: 'BALE' } },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw limited();
      throw error;
    }
  }

  /** Receives bot updates ONLY through a secret, server-configured webhook URL. */
  async acceptWebhook(secret: string, input: unknown): Promise<void> {
    const configured = this.config.get<string>('BALE_WEBHOOK_SECRET');
    if (!configured || !secret) throw invalid();
    const expected = createHash('sha256').update(configured).digest();
    const presented = createHash('sha256').update(secret).digest();
    if (!timingSafeEqual(expected, presented)) throw invalid();

    if (this.config.get('BALE_AUTH_ENABLED') !== 'true' || !input || typeof input !== 'object') return;
    const update = input as Record<string, unknown>;
    const message = update.message as Record<string, unknown> | undefined;
    const from = message?.from as Record<string, unknown> | undefined;
    const chat = message?.chat as Record<string, unknown> | undefined;
    const contact = message?.contact as Record<string, unknown> | undefined;
    if (!contact || chat?.type !== 'private' ||
      typeof update.update_id !== 'number' || !Number.isSafeInteger(update.update_id) ||
      typeof from?.id !== 'number' || !Number.isSafeInteger(from.id) ||
      typeof contact.user_id !== 'number' || contact.user_id !== from.id ||
      typeof contact.phone_number !== 'string' ||
      typeof message?.date !== 'number' || !Number.isSafeInteger(message.date)) return;

    let phone: string;
    try { phone = normalizeIranianMobile(contact.phone_number); }
    catch { return; }

    const now = new Date();
    const messageAt = new Date(message.date * 1000);
    if (messageAt.getTime() > now.getTime() + 30_000 || now.getTime() - messageAt.getTime() > CONTACT_TTL_MS) return;

    await this.prisma.$transaction(async tx => {
      const accepted = await tx.baleWebhookEvent.createMany({
        data: [{ updateId: BigInt(update.update_id as number) }], skipDuplicates: true,
      });
      if (accepted.count !== 1) return;
      await tx.baleContactChallenge.updateMany({
        where: {
          providerUserId: String(from.id), status: 'PENDING', expiresAt: { gt: now },
          createdAt: { lte: new Date(messageAt.getTime() + 1000) },
        },
        data: { phone, status: 'VERIFIED', verifiedAt: now },
      });
    });
  }
}
