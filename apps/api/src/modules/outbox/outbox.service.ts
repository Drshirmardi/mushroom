import { Injectable } from '@nestjs/common';
import { OutboxEventStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}
  async enqueue(tx: Prisma.TransactionClient, input: { eventType: string; aggregateType: string; aggregateId: string; idempotencyKey: string; payload: Prisma.InputJsonValue; availableAt?: Date }) { return tx.outboxEvent.upsert({ where: { idempotencyKey: input.idempotencyKey }, create: { ...input, availableAt: input.availableAt ?? new Date() }, update: {} }); }
  async claim(limit = 25) { const now = new Date(); return this.prisma.$transaction(async tx => { const rows = await tx.outboxEvent.findMany({ where: { status: OutboxEventStatus.PENDING, availableAt: { lte: now } }, orderBy: [{ availableAt: 'asc' }, { id: 'asc' }], take: limit }); const ids = rows.map(x => x.id); if (ids.length) await tx.outboxEvent.updateMany({ where: { id: { in: ids }, status: OutboxEventStatus.PENDING }, data: { status: OutboxEventStatus.PROCESSING, lockedAt: now, attempts: { increment: 1 } } }); return tx.outboxEvent.findMany({ where: { id: { in: ids }, status: OutboxEventStatus.PROCESSING, lockedAt: now } }); }); }
  async delivered(id: string) { await this.prisma.outboxEvent.updateMany({ where: { id, status: OutboxEventStatus.PROCESSING }, data: { status: OutboxEventStatus.DELIVERED, deliveredAt: new Date(), lockedAt: null } }); }
  async retry(id: string, message: string, delayMs = 60_000) { await this.prisma.outboxEvent.updateMany({ where: { id, status: OutboxEventStatus.PROCESSING }, data: { status: OutboxEventStatus.PENDING, lockedAt: null, lastError: message.slice(0, 500), availableAt: new Date(Date.now() + delayMs) } }); }
}
