import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
type PaymentStatusLookup = (userId: string, intentId: string) => Promise<string | null>;

const CONTACT_TTL_MS = 5 * 60_000;
const START_RATE_LIMIT = 5;
const START_RATE_WINDOW_MS = 60_000;
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
  private readonly logger = new Logger(BaleAuthService.name);

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
  async acceptWebhook(secret: string, input: unknown, paymentStatus?: PaymentStatusLookup): Promise<void> {
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
    const startCommand = typeof message?.text === 'string'
      ? /^\/start(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/u.exec(message.text.trim())
      : null;
    if (typeof message?.text === 'string') {
      this.logger.log(`Bale message update received (private=${chat?.type === 'private'}, start=${Boolean(startCommand)}, senderValid=${typeof from?.id === 'number' && Number.isSafeInteger(from.id)}, chatValid=${typeof chat?.id === 'number' && Number.isSafeInteger(chat.id)})`);
    }
    if (chat?.type !== 'private' ||
      typeof update.update_id !== 'number' || !Number.isSafeInteger(update.update_id) ||
      typeof from?.id !== 'number' || !Number.isSafeInteger(from.id)) return;

    if (startCommand) {
      if (typeof chat.id === 'number' && Number.isSafeInteger(chat.id)) {
        await this.replyToStart(update.update_id, from.id, chat.id, startCommand[1], paymentStatus);
      }
      return;
    }

    const contact = message?.contact as Record<string, unknown> | undefined;
    if (!contact ||
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

  private async replyToStart(updateId: number, providerUserId: number, chatId: number, payload?: string, paymentStatus?: PaymentStatusLookup): Promise<void> {
    const token = this.config.get<string>('BALE_BOT_TOKEN');
    const appUrl = this.miniAppUrl();
    const isPayment = payload?.startsWith('payment_') === true;
    if (!token || (!appUrl && !isPayment)) {
      this.logger.warn(`Bale /start reply skipped (botTokenConfigured=${Boolean(token)}, miniAppUrlConfigured=${Boolean(appUrl)})`);
      return;
    }

    const shouldReply = await this.prisma.$transaction(async tx => {
      const providerId = String(providerUserId);
      // Serialize updates from the same user across API replicas before checking the window.
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${providerId}, 0))::text AS locked`);
      const previous = await tx.baleStartRateLimit.findUnique({ where: { providerUserId: providerId } });
      const currentUpdateId = BigInt(updateId);
      if (previous && currentUpdateId <= previous.lastUpdateId) return false;

      const now = new Date();
      const cutoff = now.getTime() - START_RATE_WINDOW_MS;
      const recent = (previous?.recentStartAt ?? []).filter(value => value.getTime() > cutoff);
      const allowed = recent.length < START_RATE_LIMIT;
      if (allowed) recent.push(now);

      if (previous) {
        await tx.baleStartRateLimit.update({
          where: { providerUserId: providerId },
          data: { lastUpdateId: currentUpdateId, recentStartAt: recent },
        });
      } else {
        await tx.baleStartRateLimit.create({
          data: { providerUserId: providerId, lastUpdateId: currentUpdateId, recentStartAt: recent },
        });
      }
      return allowed;
    });
    if (!shouldReply) {
      this.logger.log('Bale /start reply suppressed by rate limit or duplicate update');
      return;
    }

    let replyText = 'برای استفاده از خدمات، وارد مینی‌اپ شوید.';
    let buttonUrl = isPayment ? undefined : appUrl;
    let buttonText = 'ورود به مینی‌اپ';
    if (isPayment) {
      replyText = 'نتیجهٔ پرداخت با این کد در دسترس نیست.';
      const intentId = /^payment_([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu.exec(payload ?? '')?.[1];
      if (intentId && paymentStatus) {
        try {
          const identity = await this.prisma.externalAuthIdentity.findUnique({
            where: { provider_providerUserId: { provider: 'BALE', providerUserId: String(providerUserId) } },
            select: { user: { select: { id: true, status: true, roles: { select: { role: { select: { code: true } } } } } } },
          });
          const status = identity && isActivePatient(identity.user) ? await paymentStatus(identity.user.id, intentId) : null;
          if (status) {
            replyText = status;
            buttonText = 'مشاهدهٔ نتیجه در مینی‌اپ';
            if (appUrl) {
              const url = new URL(appUrl);
              url.searchParams.set('paymentReturn', `payment_${intentId}`);
              buttonUrl = url.toString();
            }
          }
        } catch {
          this.logger.warn('Bale payment status lookup failed');
          replyText = 'بررسی وضعیت پرداخت ممکن نشد. دوباره تلاش کنید.';
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await fetch(`https://tapi.bale.ai/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8', accept: 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          ...(buttonUrl ? { reply_markup: { inline_keyboard: [[{ text: buttonText, web_app: { url: buttonUrl } }]] } } : {}),
        }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (!response.ok || result?.ok !== true) {
        this.logger.warn(`Bale sendMessage rejected (httpStatus=${response.status}, apiAccepted=${result?.ok === true})`);
      } else {
        this.logger.log('Bale /start reply sent successfully');
      }
    } catch {
      // A failed send must not break contact verification or payment webhook processing.
      this.logger.warn('Bale sendMessage request failed before a successful response');
    } finally {
      clearTimeout(timeout);
    }
  }

  private miniAppUrl(): string | undefined {
    const configured = this.config.get<string>('PUBLIC_APP_URL');
    if (!configured) return undefined;
    try {
      const base = new URL(configured);
      if ((base.protocol !== 'https:' && base.protocol !== 'http:') || base.username || base.password ||
        (this.config.get('NODE_ENV') === 'production' && base.protocol !== 'https:')) return undefined;
      return new URL('/bale', base.origin).toString();
    } catch {
      return undefined;
    }
  }
}
