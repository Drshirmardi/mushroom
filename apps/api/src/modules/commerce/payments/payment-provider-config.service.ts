import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentCredentialCryptoService } from './payment-credential-crypto.service';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { SadadRuntimeConfigService } from './sadad-runtime-config.service';
import type { CreatePaymentProviderRevisionDto, UpdatePaymentProviderConfigDto } from './payment-provider.dto';

type Context = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
const missing = () => new NotFoundException({ code: 'PAYMENT_PROVIDER_NOT_FOUND', message: 'Payment provider is not configured for this clinic.', details: {} });
const conflict = () => new ConflictException({ code: 'PAYMENT_PROVIDER_CONFIGURATION_INVALID', message: 'Payment provider configuration is invalid.', details: {} });

@Injectable()
export class PaymentProviderConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentProviderRegistry,
    private readonly crypto: PaymentCredentialCryptoService,
    private readonly sadadRuntime: SadadRuntimeConfigService,
  ) {}

  async list() {
    const clinic = await this.clinic();
    const configs = await this.prisma.paymentProviderConfig.findMany({ where: { clinicId: clinic.id }, include: { activeRevision: true } });
    return this.registry.descriptors().map((descriptor) => this.response(descriptor, configs.find((config) => config.providerCode === descriptor.code)));
  }

  async createRevision(code: string, key: string | undefined, body: CreatePaymentProviderRevisionDto, context: Context) {
    const provider = this.registry.resolve(code);
    if (body.isDefault && !body.enable) throw conflict();
    const idempotencyKey = this.idempotencyKey(key);
    const clinic = await this.clinic();
    const runtimeReady = this.runtimeReady(code);
    if ((body.enable || body.isDefault) && !runtimeReady) this.sadadRuntime.settings();
    return this.prisma.$transaction(async (tx) => {
      const config = await tx.paymentProviderConfig.upsert({ where: { clinicId_providerCode: { clinicId: clinic.id, providerCode: code } }, create: { clinicId: clinic.id, providerCode: code }, update: {} });
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${config.id}))`);
      const existing = await tx.paymentProviderConfigRevision.findUnique({ where: { configId_idempotencyKey: { configId: config.id, idempotencyKey } } });
      if (existing) {
        const current = await tx.paymentProviderConfig.findUniqueOrThrow({ where: { id: config.id }, include: { activeRevision: true } });
        return this.response(provider.descriptor, current);
      }
      const latestRevision = await tx.paymentProviderConfigRevision.findFirst({ where: { configId: config.id }, orderBy: { revisionNumber: 'desc' }, select: { revisionNumber: true } });
      const credential = await this.credential(tx, config.id, code, body.credential);
      const creator = await tx.user.findUnique({ where: { id: context.actorUserId }, select: { id: true } });
      const revision = await tx.paymentProviderConfigRevision.create({ data: { configId: config.id, revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1, providerUnit: runtimeReady ? 'RIAL' : 'UNCONFIRMED', goLiveReady: runtimeReady, capabilitySnapshot: provider.descriptor.capabilities, credentialVersionId: credential.id, createdByUserId: creator?.id ?? null, idempotencyKey } });
      const updated = await tx.paymentProviderConfig.update({ where: { id: config.id }, data: { activeRevisionId: revision.id, providerUnit: revision.providerUnit, goLiveReady: revision.goLiveReady, enabled: body.enable === true, isDefault: body.enable === true && body.isDefault === true }, include: { activeRevision: true } });
      if (updated.isDefault) await tx.paymentProviderConfig.updateMany({ where: { clinicId: clinic.id, id: { not: config.id } }, data: { isDefault: false } });
      await this.audit(tx, 'PAYMENT_PROVIDER_CONFIG_REVISION_CREATED', config.id, context, { providerCode: code, revisionNumber: revision.revisionNumber, credentialConfigured: true, goLiveReady: revision.goLiveReady });
      return this.response(provider.descriptor, updated);
    });
  }

  async update(code: string, body: UpdatePaymentProviderConfigDto, context: Context) {
    const provider = this.registry.resolve(code);
    const clinic = await this.clinic();
    return this.prisma.$transaction(async (tx) => {
      let config = await tx.paymentProviderConfig.findUnique({ where: { clinicId_providerCode: { clinicId: clinic.id, providerCode: code } }, include: { activeRevision: true } });
      if (!config) throw missing();
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${config.id}))`);
      config = await tx.paymentProviderConfig.findUniqueOrThrow({ where: { id: config.id }, include: { activeRevision: true } });
      if ((body.enabled || body.isDefault) && !this.runtimeReady(code)) this.sadadRuntime.settings();
      const credentialVersionId = config.activeRevision?.credentialVersionId;
      if ((body.enabled || body.isDefault) && !credentialVersionId) throw conflict();
      if ((body.enabled || body.isDefault) && !config.goLiveReady) {
        const latest = await tx.paymentProviderConfigRevision.findFirst({ where: { configId: config.id }, orderBy: { revisionNumber: 'desc' }, select: { revisionNumber: true } });
        const creator = await tx.user.findUnique({ where: { id: context.actorUserId }, select: { id: true } });
        const revision = await tx.paymentProviderConfigRevision.create({ data: { configId: config.id, revisionNumber: (latest?.revisionNumber ?? 0) + 1, providerUnit: 'RIAL', goLiveReady: true, capabilitySnapshot: provider.descriptor.capabilities, credentialVersionId: credentialVersionId!, createdByUserId: creator?.id ?? null } });
        config = await tx.paymentProviderConfig.update({ where: { id: config.id }, data: { activeRevisionId: revision.id, providerUnit: 'RIAL', goLiveReady: true }, include: { activeRevision: true } });
        await this.audit(tx, 'PAYMENT_PROVIDER_GO_LIVE_READY', config.id, context, { providerCode: code, revisionNumber: revision.revisionNumber });
      }
      const nextEnabled = body.enabled ?? config.enabled;
      if (body.isDefault && !nextEnabled) throw conflict();
      if (body.isDefault) await tx.paymentProviderConfig.updateMany({ where: { clinicId: clinic.id, id: { not: config.id } }, data: { isDefault: false } });
      const updated = await tx.paymentProviderConfig.update({ where: { id: config.id }, data: { ...(body.enabled === undefined ? {} : { enabled: body.enabled }), ...(body.enabled === false ? { isDefault: false } : body.isDefault === undefined ? {} : { isDefault: body.isDefault }) }, include: { activeRevision: true } });
      await this.audit(tx, 'PAYMENT_PROVIDER_CONFIG_UPDATED', config.id, context, { providerCode: code, enabled: updated.enabled, isDefault: updated.isDefault });
      return this.response(provider.descriptor, updated);
    });
  }

  private runtimeReady(code: string) { return code === 'sadad' && this.sadadRuntime.live; }
  private async credential(tx: Prisma.TransactionClient, configId: string, code: string, value: { merchantId: string; terminalId: string; terminalKey: string }) { const normalized = this.normalizedCredential(code, value); const encrypted = this.crypto.encrypt(normalized); const latest = await tx.paymentProviderCredentialVersion.findFirst({ where: { configId }, orderBy: { versionNumber: 'desc' } }); const created = await tx.paymentProviderCredentialVersion.create({ data: { configId, versionNumber: (latest?.versionNumber ?? 0) + 1, encryptedPayload: Uint8Array.from(encrypted.ciphertext), encryptionNonce: Uint8Array.from(encrypted.nonce), authenticationTag: Uint8Array.from(encrypted.tag), encryptionKeyVersion: encrypted.keyVersion } }); await tx.paymentProviderCredentialVersion.updateMany({ where: { configId, id: { not: created.id }, status: 'ACTIVE' }, data: { status: 'RETIRED' } }); return created; }
  private normalizedCredential(code: string, value: { merchantId: string; terminalId: string; terminalKey: string }) { if (code !== 'sadad' || !value || typeof value !== 'object') throw conflict(); const merchantId = value.merchantId?.trim(); const terminalId = value.terminalId?.trim(); const terminalKey = value.terminalKey?.trim(); const keys = Object.keys(value).sort(); const decodedKey = terminalKey && /^[A-Za-z0-9+/]+={0,2}$/u.test(terminalKey) ? Buffer.from(terminalKey, 'base64') : null; if (!merchantId || !terminalId || !terminalKey || merchantId.length > 128 || terminalId.length > 128 || terminalKey.length > 4096 || keys.join(',') !== 'merchantId,terminalId,terminalKey' || decodedKey?.length !== 24) throw conflict(); return { merchantId, terminalId, terminalKey }; }
  private response(descriptor: { code: string; displayName: string; capabilities: Record<string, string> }, config?: { enabled: boolean; isDefault: boolean; providerUnit: string; goLiveReady: boolean; updatedAt: Date; activeRevision: { revisionNumber: number; credentialVersionId: string | null } | null }) { const configured = Boolean(config?.activeRevision?.credentialVersionId); return { code: descriptor.code, displayName: descriptor.displayName, configured, activationAvailable: configured && this.runtimeReady(descriptor.code), enabled: config?.enabled ?? false, isDefault: config?.isDefault ?? false, providerUnit: config?.providerUnit ?? 'UNCONFIRMED', goLiveReady: Boolean(config?.goLiveReady && this.runtimeReady(descriptor.code)), activeRevisionNumber: config?.activeRevision?.revisionNumber ?? null, capabilities: descriptor.capabilities, updatedAt: config?.updatedAt.toISOString() ?? null }; }
  private async clinic() { const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The active clinic was not found.', details: {} }); return clinic; }
  private idempotencyKey(value: string | undefined) { const key = value?.trim(); if (!key || key.length > 240 || !/^[\x21-\x7e]+$/u.test(key)) throw conflict(); return key; }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, context: Context, metadata: Record<string, unknown>) { await tx.auditEvent.create({ data: { action, actorUserId: (await tx.user.findUnique({ where: { id: context.actorUserId }, select: { id: true } }))?.id ?? null, actorSessionId: null, subjectType: 'PAYMENT_PROVIDER_CONFIG', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: metadata as Prisma.InputJsonValue } }); }
}
