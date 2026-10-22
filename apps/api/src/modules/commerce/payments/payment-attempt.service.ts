import { Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { BillingGatewayService } from '../../billing/billing-gateway.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentAttemptOrchestrationService } from './payment-attempt-orchestration.service';
import { PaymentCredentialCryptoService } from './payment-credential-crypto.service';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { buildSadadRedirect, toSadadRial } from './sadad-payment-provider.adapter';
import { SadadRuntimeConfigService } from './sadad-runtime-config.service';
import { PaymentGatewayDiagnosticsService } from './payment-gateway-diagnostics.service';

const blocked = () => new ServiceUnavailableException({ code: 'SADAD_GO_LIVE_BLOCKED', message: 'No live, enabled payment provider is available.', details: {} });
const missing = () => new NotFoundException({ code: 'PAYMENT_ATTEMPT_NOT_FOUND', message: 'Payment attempt was not found.', details: {} });

@Injectable()
export class PaymentAttemptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentProviderRegistry,
    private readonly orchestration: PaymentAttemptOrchestrationService,
    private readonly crypto: PaymentCredentialCryptoService,
    private readonly sadadRuntime: SadadRuntimeConfigService,
    private readonly billingGateway: BillingGatewayService,
    @Optional() private readonly diagnostics?: PaymentGatewayDiagnosticsService,
  ) {}

  async createForOrder(userId: string, orderId: string, idempotencyKey: string | undefined) {
    const runtime = this.sadadRuntime.settings();
    const patient = await this.patient(userId);
    const order = await this.prisma.commerceOrder.findFirst({ where: { id: orderId, patientId: patient.id, status: 'PENDING_PAYMENT' }, select: { id: true, clinicId: true, totalAmountToman: true } });
    if (!order) throw new NotFoundException({ code: 'COMMERCE_ORDER_NOT_FOUND', message: 'Commerce order was not found.', details: {} });
    const config = await this.prisma.paymentProviderConfig.findFirst({ where: { clinicId: order.clinicId, enabled: true, isDefault: true, goLiveReady: true }, include: { activeRevision: { include: { credentialVersion: true } } } });
    const revision = config?.activeRevision; const credentialVersion = revision?.credentialVersion;
    if (!config || config.providerCode !== 'sadad' || !revision?.goLiveReady || revision.providerUnit !== 'RIAL' || !credentialVersion) throw blocked();
    const provider = this.registry.resolve(config.providerCode);
    const credential = this.crypto.decrypt({ encryptedPayload: credentialVersion.encryptedPayload ? Buffer.from(credentialVersion.encryptedPayload) : null, encryptionNonce: credentialVersion.encryptionNonce ? Buffer.from(credentialVersion.encryptionNonce) : null, authenticationTag: credentialVersion.authenticationTag ? Buffer.from(credentialVersion.authenticationTag) : null, encryptionKeyVersion: credentialVersion.encryptionKeyVersion });
    const attempt = await this.orchestration.createAttempt({ patientId: patient.id, orderId: order.id, providerConfigRevisionId: revision.id, provider, idempotencyKey: idempotencyKey ?? '', providerAmount: toSadadRial(order.totalAmountToman), providerUnit: 'RIAL', credential, returnUrl: runtime.returnUrl, redirectProfile: runtime.redirectProfile, requestTimeoutMs: runtime.timeoutMs });
    return this.response(attempt, config.providerCode, runtime.redirectProfile);
  }

  async get(userId: string, attemptId: string) {
    const patient = await this.patient(userId);
    const attempt = await this.prisma.paymentAttempt.findFirst({ where: { id: attemptId, patientId: patient.id }, include: { providerConfigRevision: { include: { config: true } } } });
    if (!attempt) throw missing();
    const profile = this.sadadRuntime.live ? this.sadadRuntime.settings().redirectProfile : null;
    return this.response(attempt, attempt.providerConfigRevision.config.providerCode, profile);
  }

  async processSadadCallback(body: Record<string, unknown>) {
    const runtime = this.sadadRuntime.settings();
    const provider = this.registry.resolve('sadad');
    const callback = provider.parseCallback(body);
    await this.diagnostics?.record(callback.providerOrderId, 'CALLBACK', Date.now(), callback.resultCode);
    if (await this.billingGateway.owns(callback.providerOrderId)) return this.billingGateway.callback(body);
    await this.orchestration.processCallback(callback);
    let attempt = await this.prisma.paymentAttempt.findUnique({ where: { providerOrderId: callback.providerOrderId }, include: { providerConfigRevision: { include: { config: true, credentialVersion: true } } } });
    if (!attempt || attempt.providerConfigRevision.config.providerCode !== 'sadad') throw missing();
    const retryTimedOutVerify = attempt.status === 'REQUIRES_RECONCILIATION' && attempt.providerResultCode === 'TIMEOUT' && Boolean(attempt.providerToken);
    if (attempt.status === 'VERIFYING' || retryTimedOutVerify) {
      const version = attempt.providerConfigRevision.credentialVersion;
      if (!version) throw blocked();
      const credential = this.crypto.decrypt({ encryptedPayload: version.encryptedPayload ? Buffer.from(version.encryptedPayload) : null, encryptionNonce: version.encryptionNonce ? Buffer.from(version.encryptionNonce) : null, authenticationTag: version.authenticationTag ? Buffer.from(version.authenticationTag) : null, encryptionKeyVersion: version.encryptionKeyVersion });
      const verifyInput = { attemptId: attempt.id, provider, providerUnit: attempt.providerUnit, credential, now: new Date() };
      if (retryTimedOutVerify) await this.orchestration.retryTimedOutVerify(verifyInput);
      else await this.orchestration.verifyAttempt(verifyInput);
      attempt = await this.prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id }, include: { providerConfigRevision: { include: { config: true, credentialVersion: true } } } });
    }
    const redirect = new URL(runtime.resultUrl);
    redirect.searchParams.set('orderId', attempt.orderId);
    return { redirectUrl: redirect.toString(), status: attempt.status };
  }

  private response(attempt: { id: string; providerOrderId: bigint; status: string; commerceAmountToman: bigint; providerAmount: bigint | null; providerUnit: string; providerToken: string | null }, providerCode: string, profile: Parameters<typeof buildSadadRedirect>[0] | null) {
    return { id: attempt.id, providerOrderId: attempt.providerOrderId.toString(), providerCode, status: attempt.status, commerceAmountToman: attempt.commerceAmountToman.toString(), providerAmount: attempt.providerAmount?.toString() ?? null, providerUnit: attempt.providerUnit, redirectUrl: attempt.status === 'REDIRECT_READY' && attempt.providerToken && profile ? buildSadadRedirect(profile, attempt.providerToken) : null };
  }

  private async patient(userId: string) { const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } }); if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} }); return patient; }
}
