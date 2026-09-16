import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

const blocked = () => new ServiceUnavailableException({ code: 'SADAD_GO_LIVE_BLOCKED', message: 'No payment provider is eligible to create an attempt.', details: {} });
const missing = () => new NotFoundException({ code: 'PAYMENT_ATTEMPT_NOT_FOUND', message: 'Payment attempt was not found.', details: {} });

@Injectable()
export class PaymentAttemptService {
  constructor(private readonly prisma: PrismaService) {}
  async createForOrder(userId: string, orderId: string, _idempotencyKey: string | undefined) { const patient = await this.patient(userId); const order = await this.prisma.commerceOrder.findFirst({ where: { id: orderId, patientId: patient.id }, select: { id: true } }); if (!order) throw new NotFoundException({ code: 'COMMERCE_ORDER_NOT_FOUND', message: 'Commerce order was not found.', details: {} }); throw blocked(); }
  async get(userId: string, attemptId: string) { const patient = await this.patient(userId); const attempt = await this.prisma.paymentAttempt.findFirst({ where: { id: attemptId, patientId: patient.id }, include: { providerConfigRevision: { include: { config: true } } } }); if (!attempt) throw missing(); return { id: attempt.id, providerOrderId: attempt.providerOrderId.toString(), providerCode: attempt.providerConfigRevision.config.providerCode, status: attempt.status, commerceAmountToman: attempt.commerceAmountToman.toString(), providerAmount: attempt.providerAmount?.toString() ?? null, providerUnit: attempt.providerUnit }; }
  callbackDisabled() { throw blocked(); }
  private async patient(userId: string) { const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } }); if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} }); return patient; }
}
