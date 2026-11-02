import { HttpException, Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { SmsCredentialCryptoService } from '../../communications/sms/sms-credential-crypto.service';
import { SmsProviderRegistry } from '../../communications/sms/sms-provider.registry';
import { SmsRuntimeService } from '../../communications/sms/sms-runtime.service';
import type { GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { MarriageRequestService } from './marriage-request.service';

@Injectable()
export class MarriageSmsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(private readonly prisma: PrismaService, private readonly requests: MarriageRequestService, private readonly crypto: SmsCredentialCryptoService, private readonly registry: SmsProviderRegistry, private readonly runtime: SmsRuntimeService, private readonly config: ConfigService) {}
  onModuleInit() { if (this.config.get('NODE_ENV') !== 'test') { this.timer = setInterval(() => void this.tick().catch(() => undefined), 10000); this.timer.unref(); } }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async enqueue(id: string, key: string|undefined, ctx: Context) {
    if (!key || !/^[\x21-\x7e]{1,200}$/u.test(key)) throw new HttpException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A valid command key is required.', details: {} }, 422);
    await this.prisma.$transaction(async tx => {
      const first = await this.requests.owned(tx, id, ctx);
      if (first.patient.id !== first.row.initiatorPatientId || first.row.status !== 'PENDING') throw new HttpException({ code: 'MARRIAGE_REQUEST_CONFLICT', message: 'Only the pending invitation sender may send this message.', details: {} }, 409);
      const phone = this.crypto.decrypt(first.row).phone!;
      for (const identity of [`marriage-sms-issuer:${first.patient.id}`, `marriage-sms-phone:${this.crypto.phoneFingerprints(phone)[0]}`].sort()) await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${identity},0))`);
      const { row } = await this.requests.owned(tx, id, ctx, true);
      if (row.status !== 'PENDING') throw new HttpException({ code: 'MARRIAGE_REQUEST_CONFLICT', message: 'This invitation is no longer pending.', details: {} }, 409);
      if (await tx.marriageInvitationDelivery.count({ where: { requestId: id, idempotencyKey: key } })) return;
      const configured = await this.provider();
      const [clock] = await tx.$queryRaw<{ now: Date; midnight: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now,date_trunc('day',CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS midnight`);
      const [last, invitationCount, issuerCount, recipientCount] = await Promise.all([
        tx.marriageInvitationDelivery.findFirst({ where: { requestId: id }, orderBy: { createdAt: 'desc' } }),
        tx.marriageInvitationDelivery.count({ where: { requestId: id } }),
        tx.marriageInvitationDelivery.count({ where: { createdAt: { gte: clock!.midnight }, request: { initiatorPatientId: row.initiatorPatientId } } }),
        tx.marriageInvitationDelivery.count({ where: { createdAt: { gte: clock!.midnight }, request: { recipientHash: { in: this.crypto.phoneFingerprints(phone) } } } }),
      ]);
      if (last && clock!.now.getTime() - last.createdAt.getTime() < 60000 || invitationCount >= 3 || issuerCount >= 10 || recipientCount >= 5) throw new HttpException({ code: 'MARRIAGE_SMS_RATE_LIMITED', message: 'Invitation SMS limit reached. The shareable link remains available.', details: {} }, 429);
      await tx.marriageInvitationDelivery.create({ data: { requestId: id, idempotencyKey: key, providerRevisionId: configured.revisionId } });
      await tx.auditEvent.create({ data: { action: 'MARRIAGE_SMS_QUEUED', subjectType: 'MARRIAGE_SERVICE_REQUEST', subjectId: id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0,128), ipAddress: ctx.ipAddress, metadata: {} } });
    });
    return this.requests.get(id, ctx);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      // A crashed sender may have contacted the provider; never replay an uncertain send automatically.
      await this.prisma.marriageInvitationDelivery.updateMany({ where: { status: 'SENDING', OR: [{ startedAt: { lt: new Date(Date.now() - 300000) } }, { startedAt: null }] }, data: { status: 'UNKNOWN', resolvedAt: new Date() } });
      const delivery = await this.prisma.$transaction(async tx => {
        const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM marriage_invitation_deliveries WHERE status='QUEUED' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`);
        if (!rows[0]) return null;
        return tx.marriageInvitationDelivery.update({ where: { id: rows[0].id }, data: { status: 'SENDING', startedAt: new Date() }, include: { request: true } });
      });
      if (!delivery) return;
      let status: 'ACCEPTED'|'FAILED'|'UNKNOWN' = 'FAILED'; let providerReference: string|undefined; let contacted = false;
      try {
        const request = await this.prisma.marriageServiceRequest.findUniqueOrThrow({ where: { id: delivery.requestId } });
        if (request.status === 'PENDING') {
          if (!delivery.providerRevisionId) throw new Error('Legacy unpinned delivery requires an explicit new send');
          const configured = await this.provider(delivery.providerRevisionId);
          const phone = this.crypto.decrypt(request).phone!;
          const url = new URL(`/assessment/marriage/requests/${request.id}`, configured.origin).toString();
          const credential = this.crypto.decrypt(configured.credentials);
          contacted = true;
          const result = configured.mode === 'TEXT'
            ? await configured.provider.sendText({ credential, recipient: phone, senderLine: configured.settings.invitationSenderLine!, text: `سبز زندگی | شناخت پیش از ازدواج\nبرای بررسی دعوت و شرایط خدمت، با شماره خودتان وارد شوید:\n${url}` })
            : await configured.provider.sendPattern({ credential, config: { ...configured.settings, patternCode: configured.settings.invitationPatternCode! }, recipient: phone, attributes: { link: url } });
          status = result.outcome; providerReference = result.providerReference;
        }
      } catch { status = contacted ? 'UNKNOWN' : 'FAILED'; }
      await this.prisma.marriageInvitationDelivery.updateMany({ where: { id: delivery.id, status: 'SENDING' }, data: { status, providerReference, resolvedAt: new Date() } });
    } finally { this.running = false; }
  }

  private async provider(revisionId?: string) {
    this.runtime.assertLive();
    const unavailable = () => new ServiceUnavailableException({ code: 'MARRIAGE_SMS_UNAVAILABLE', message: 'Configure the invitation transport and public application origin. The shareable link remains available.', details: {} });
    const row = await this.prisma.smsProviderConfig.findFirst({ where: { enabled: true, isDefault: true }, include: { activeRevision: { include: { credentialVersion: true } } } });
    if (!row) throw unavailable();
    const revision = revisionId ? await this.prisma.smsProviderConfigRevision.findFirst({ where: { id: revisionId, configId: row.id }, include: { credentialVersion: true } }) : row?.activeRevision;
    const settings = revision?.nonSecretConfig as Record<string,string>|undefined;
    if (!row || !revision?.credentialVersion || revision.credentialVersion.status !== 'ACTIVE' || !settings) throw unavailable();
    const mode = settings.invitationMode || (settings.invitationPatternCode ? 'PATTERN' : 'TEXT');
    if (!['TEXT','PATTERN'].includes(mode) || mode === 'TEXT' && !/^\d{3,20}$/u.test(settings.invitationSenderLine ?? '') || mode === 'PATTERN' && !settings.invitationPatternCode?.trim()) throw unavailable();
    let origin: string;
    try { const url = new URL(this.config.get<string>('PUBLIC_APP_URL') || (this.config.get('NODE_ENV') === 'production' ? '' : 'http://localhost:3001')); if (!['http:','https:'].includes(url.protocol) || this.config.get('NODE_ENV') === 'production' && url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw unavailable(); origin = url.origin; } catch { throw unavailable(); }
    const provider = this.registry.resolve(row.providerCode); this.registry.require(provider, mode === 'TEXT' ? 'TEXT_SEND' : 'PATTERN_SEND');
    return { provider, credentials: revision.credentialVersion, settings, mode, revisionId: revision.id, origin };
  }
}
