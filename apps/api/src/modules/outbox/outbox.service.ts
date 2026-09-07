import { Injectable } from '@nestjs/common';
import { OutboxEventStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

const CLAIM_LEASE_MS = 60_000;

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}
  async transaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(run); }
  async enqueue(tx: Prisma.TransactionClient, input: { eventType: string; aggregateType: string; aggregateId: string; idempotencyKey: string; payload: Prisma.InputJsonValue; availableAt?: Date }) { return tx.outboxEvent.upsert({ where: { idempotencyKey: input.idempotencyKey }, create: { ...input, availableAt: input.availableAt ?? new Date() }, update: {} }); }
  async claim(limit = 25) { const now = new Date(); const staleBefore = new Date(now.getTime() - CLAIM_LEASE_MS); return this.prisma.$transaction(async tx => { await tx.outboxEvent.updateMany({ where: { status: OutboxEventStatus.PROCESSING, lockedAt: { lt: staleBefore } }, data: { status: OutboxEventStatus.PENDING, lockedAt: null, availableAt: now, lastError: 'Worker claim lease expired; recovered for retry.' } }); const rows = await tx.outboxEvent.findMany({ where: { status: OutboxEventStatus.PENDING, availableAt: { lte: now } }, orderBy: [{ availableAt: 'asc' }, { id: 'asc' }], take: limit }); const ids = rows.map(x => x.id); if (ids.length) await tx.outboxEvent.updateMany({ where: { id: { in: ids }, status: OutboxEventStatus.PENDING }, data: { status: OutboxEventStatus.PROCESSING, lockedAt: now, attempts: { increment: 1 } } }); return tx.outboxEvent.findMany({ where: { id: { in: ids }, status: OutboxEventStatus.PROCESSING, lockedAt: now } }); }); }
  async delivered(tx: Prisma.TransactionClient, id: string) { const result = await tx.outboxEvent.updateMany({ where: { id, status: OutboxEventStatus.PROCESSING }, data: { status: OutboxEventStatus.DELIVERED, deliveredAt: new Date(), lockedAt: null } }); if (result.count !== 1) throw new Error('Outbox event is no longer available for delivery.'); }
  async retry(id: string, message: string, delayMs = 60_000) { await this.prisma.outboxEvent.updateMany({ where: { id, status: OutboxEventStatus.PROCESSING }, data: { status: OutboxEventStatus.PENDING, lockedAt: null, lastError: message.slice(0, 500), availableAt: new Date(Date.now() + delayMs) } }); }
  async cancel(tx: Prisma.TransactionClient, aggregateType: string, aggregateId: string, reason: string) { await tx.outboxEvent.updateMany({ where: { eventType: 'PATIENT_REMINDER', aggregateType, aggregateId, status: OutboxEventStatus.PENDING }, data: { status: OutboxEventStatus.FAILED, lastError: reason.slice(0, 500) } }); }
}
