import { createHash, randomInt } from 'node:crypto';
import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { normalizeIranianMobile } from '../../identity/domain/phone-number';
import type { CreateSmsProviderRevisionDto, UpdateOtpPolicyDto, UpdateSmsProviderStateDto } from './admin-sms.dto';
import { SmsCredentialCryptoService } from './sms-credential-crypto.service';
import { SmsProviderRegistry } from './sms-provider.registry';
import { SmsRuntimeService } from './sms-runtime.service';

type Context = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };

@Injectable()
export class SmsProviderConfigService {
  constructor(private readonly prisma: PrismaService, private readonly registry: SmsProviderRegistry, private readonly crypto: SmsCredentialCryptoService, private readonly runtime: SmsRuntimeService) {}

  async list() {
    const configs = await this.prisma.smsProviderConfig.findMany({ include: { activeRevision: true } });
    return this.registry.descriptors().map((descriptor) => {
      const config = configs.find((item) => item.providerCode === descriptor.code);
      return { ...descriptor, runtimeAvailable: this.runtime.live, enabled: config?.enabled ?? false, isDefault: config?.isDefault ?? false, credentialConfigured: Boolean(config?.activeRevision?.credentialVersionId), activeRevisionNumber: config?.activeRevision?.revisionNumber ?? null, config: (config?.activeRevision?.nonSecretConfig as Record<string, string> | undefined) ?? {}, updatedAt: config?.updatedAt.toISOString() ?? null };
    });
  }

  async createRevision(code: string, idempotencyKey: string | undefined, body: CreateSmsProviderRevisionDto, context: Context) {
    const provider = this.registry.resolve(code);
    const key = this.key(idempotencyKey);
    const safeConfig = this.validateConfig(provider.descriptor.fields, body.config);
    await this.prisma.$transaction(async (tx) => {
      let config = await tx.smsProviderConfig.upsert({ where: { providerCode: code }, create: { providerCode: code }, update: {} });
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${config.id}))::text AS locked`);
      const duplicate = await tx.smsProviderConfigRevision.findUnique({ where: { configId_idempotencyKey: { configId: config.id, idempotencyKey: key } } });
      if (duplicate) return;
      const active = config.activeRevisionId ? await tx.smsProviderConfigRevision.findUnique({ where: { id: config.activeRevisionId }, include: { credentialVersion: true } }) : null;
      let credentialVersionId = active?.credentialVersionId ?? null;
      if (body.credential && Object.keys(body.credential).length > 0) {
        const token = body.credential.apiToken?.trim();
        if (!token || Object.keys(body.credential).join(',') !== 'apiToken' || token.length > 4096) throw this.invalid();
        const encrypted = this.crypto.encrypt({ apiToken: token });
        const last = await tx.smsProviderCredentialVersion.findFirst({ where: { configId: config.id }, orderBy: { versionNumber: 'desc' } });
        await tx.smsProviderCredentialVersion.updateMany({ where: { configId: config.id, status: 'ACTIVE' }, data: { status: 'RETIRED' } });
        const created = await tx.smsProviderCredentialVersion.create({ data: { configId: config.id, versionNumber: (last?.versionNumber ?? 0) + 1, encryptedPayload: Uint8Array.from(encrypted.ciphertext), encryptionNonce: Uint8Array.from(encrypted.nonce), authenticationTag: Uint8Array.from(encrypted.tag), encryptionKeyVersion: encrypted.keyVersion } });
        credentialVersionId = created.id;
      }
      if (!credentialVersionId) throw this.invalid();
      const last = await tx.smsProviderConfigRevision.findFirst({ where: { configId: config.id }, orderBy: { revisionNumber: 'desc' } });
      const revision = await tx.smsProviderConfigRevision.create({ data: { configId: config.id, revisionNumber: (last?.revisionNumber ?? 0) + 1, nonSecretConfig: safeConfig, capabilitySnapshot: provider.descriptor.capabilities, credentialVersionId, createdByUserId: context.actorUserId, idempotencyKey: key } });
      config = await tx.smsProviderConfig.update({ where: { id: config.id }, data: { activeRevisionId: revision.id } });
      await this.audit(tx, 'SMS_PROVIDER_REVISION_CREATED', config.id, context, { providerCode: code, revisionNumber: revision.revisionNumber, credentialReplaced: Boolean(body.credential) });
    });
    return this.listOne(code);
  }

  async updateState(code: string, body: UpdateSmsProviderStateDto, context: Context) {
    this.registry.resolve(code);
    await this.prisma.$transaction(async (tx) => {
      const config = await tx.smsProviderConfig.findUnique({ where: { providerCode: code }, include: { activeRevision: true } });
      if (!config) throw this.missing();
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${config.id}))::text AS locked`);
      if ((body.enabled || body.isDefault) && (!this.runtime.live || !config.activeRevision?.credentialVersionId)) throw new ConflictException({ code: 'SMS_PROVIDER_ACTIVATION_BLOCKED', message: 'SMS provider runtime or credential is not ready.', details: {} });
      const enabled = body.enabled ?? config.enabled;
      if (body.isDefault && !enabled) throw this.invalid();
      if (body.isDefault) await tx.smsProviderConfig.updateMany({ where: { id: { not: config.id } }, data: { isDefault: false } });
      const updated = await tx.smsProviderConfig.update({ where: { id: config.id }, data: { ...(body.enabled === undefined ? {} : { enabled: body.enabled }), ...(body.enabled === false ? { isDefault: false } : body.isDefault === undefined ? {} : { isDefault: body.isDefault }) } });
      await this.audit(tx, 'SMS_PROVIDER_STATE_UPDATED', config.id, context, { providerCode: code, enabled: updated.enabled, isDefault: updated.isDefault });
    });
    return this.listOne(code);
  }

  async testConnection(code: string, context: Context) { const { provider, credential } = await this.runtimeProvider(code); const result = await provider.testConnection(credential); await this.safeAttempt(undefined, code, '+989000000000', true, result); await this.audit(this.prisma, 'SMS_PROVIDER_CONNECTION_TESTED', null, context, { providerCode: code, outcome: result.outcome }); return result; }
  async sendTest(code: string, phone: string, context: Context) { const canonical = normalizeIranianMobile(phone); const recipientHash = createHash('sha256').update(canonical).digest('hex'); const recent = await this.prisma.smsDeliveryAttempt.count({ where: { isTest: true, recipientHash, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } } }); if (recent >= 3) throw new HttpException({ code: 'SMS_TEST_RATE_LIMITED', message: 'Test SMS rate limit exceeded.', details: {} }, HttpStatus.TOO_MANY_REQUESTS); const { provider, credential, config } = await this.runtimeProvider(code); const result = await provider.sendPattern({ credential, config, recipient: canonical, attributes: { code: String(randomInt(100000, 1000000)) } }); await this.safeAttempt(undefined, code, canonical, true, result); await this.audit(this.prisma, 'SMS_PROVIDER_TEST_SENT', null, context, { providerCode: code, outcome: result.outcome }); return result; }
  async policy() { return this.prisma.otpPolicy.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} }); }
  async updatePolicy(body: UpdateOtpPolicyDto, context: Context) { const policy = await this.prisma.otpPolicy.upsert({ where: { id: 'default' }, create: { id: 'default', ...body, updatedByUserId: context.actorUserId }, update: { ...body, updatedByUserId: context.actorUserId } }); await this.audit(this.prisma, 'OTP_POLICY_UPDATED', null, context, { enabled: policy.enabled }); return policy; }
  async attempts(pageSize: number) { const rows = await this.prisma.smsDeliveryAttempt.findMany({ take: pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, recipientMasked: true, status: true, providerReference: true, errorCategory: true, isTest: true, createdAt: true, resolvedAt: true, providerConfig: { select: { providerCode: true } } } }); return rows.map(({ providerConfig, ...row }) => ({ ...row, providerCode: providerConfig?.providerCode ?? null })); }

  private async listOne(code: string) { return (await this.list()).find((item) => item.code === code); }
  private async runtimeProvider(code: string) { this.runtime.assertLive(); const provider = this.registry.resolve(code); const config = await this.prisma.smsProviderConfig.findUnique({ where: { providerCode: code }, include: { activeRevision: { include: { credentialVersion: true } } } }); if (!config?.enabled || !config.activeRevision?.credentialVersion) throw this.missing(); return { provider, credential: this.crypto.decrypt(config.activeRevision.credentialVersion), config: config.activeRevision.nonSecretConfig as Record<string, string> }; }
  private validateConfig(fields: readonly { key: string; secret: boolean; required: boolean; defaultValue?: string; maxLength: number }[], input: Record<string, string>) { const allowed = fields.filter((field) => !field.secret); if (Object.keys(input).some((key) => !allowed.some((field) => field.key === key))) throw this.invalid(); const result: Record<string, string> = Object.fromEntries(allowed.map((field) => [field.key, input[field.key]?.trim() || field.defaultValue || '']).filter(([, value]) => value)); if (allowed.some((field) => field.required && !result[field.key]) || Object.entries(result).some(([key, value]) => value.length > (allowed.find((field) => field.key === key)?.maxLength ?? 0))) throw this.invalid(); return result; }
  private key(value: string | undefined) { const key = value?.trim(); if (!key || key.length > 240 || !/^[\x21-\x7e]+$/u.test(key)) throw this.invalid(); return key; }
  private async safeAttempt(challengeId: string | undefined, code: string, phone: string, isTest: boolean, result: { outcome: 'ACCEPTED' | 'FAILED' | 'UNKNOWN'; providerReference?: string; errorCategory?: string }) { const config = await this.prisma.smsProviderConfig.findUnique({ where: { providerCode: code } }); await this.prisma.smsDeliveryAttempt.create({ data: { challengeId, providerConfigId: config?.id, providerConfigRevisionId: config?.activeRevisionId, recipientHash: createHash('sha256').update(phone).digest('hex'), recipientMasked: `${phone.slice(0, 5)}***${phone.slice(-2)}`, status: result.outcome, providerReference: result.providerReference, errorCategory: result.errorCategory, isTest, resolvedAt: new Date() } }); }
  private audit(tx: Pick<Prisma.TransactionClient, 'auditEvent'>, action: string, subjectId: string | null, context: Context, metadata: Record<string, unknown>) { return tx.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'SMS_PROVIDER_CONFIG', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: metadata as Prisma.InputJsonValue } }); }
  private invalid() { return new UnprocessableEntityException({ code: 'SMS_PROVIDER_CONFIGURATION_INVALID', message: 'SMS provider configuration is invalid.', details: {} }); }
  private missing() { return new NotFoundException({ code: 'SMS_PROVIDER_NOT_CONFIGURED', message: 'SMS provider is not configured.', details: {} }); }
}
