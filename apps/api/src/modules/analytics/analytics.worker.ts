import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { ANALYTICS_CONTEXT, ANALYTICS_DELIVERY, ANALYTICS_TTL_MS, measurementPayload, retryDelay } from './analytics.protocol';
import { Ga4Transport } from './ga4.transport';

@Injectable()
export class AnalyticsWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private lastDisabledCleanup = 0;
  private readonly logger = new Logger(AnalyticsWorker.name);
  constructor(private readonly db: PrismaService, private readonly outbox: OutboxService, private readonly transport: Ga4Transport) {}
  onModuleInit() { this.timer = setInterval(() => void this.tick().catch(() => this.logger.warn({ code: 'ANALYTICS_WORKER_FAILED' })), 10000); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async tick() {
    if (this.running || !this.transport.enabled && Date.now() - this.lastDisabledCleanup < 60000) return;
    if (!this.transport.enabled) this.lastDisabledCleanup = Date.now();
    this.running = true;
    try {
      // Also purge expired metadata/tombstones when collection was subsequently disabled.
      const now = new Date();
      const expired = await this.db.outboxEvent.findMany({ where: { eventType: { in: [ANALYTICS_CONTEXT, ANALYTICS_DELIVERY] },
        status: { in: ['DELIVERED', 'FAILED'] }, availableAt: { lte: now } }, take: 50, select: { id: true } });
      if (expired.length) await this.db.outboxEvent.deleteMany({ where: { id: { in: expired.map(row => row.id) }, status: { in: ['DELIVERED', 'FAILED'] } } });
      for (const row of await this.outbox.claim(5, 'analytics')) {
        const where = { id: row.id, status: 'PROCESSING' as const, lockedAt: row.lockedAt };
        if (row.eventType === ANALYTICS_CONTEXT) { await this.db.outboxEvent.deleteMany({ where }); continue; }
        const payload = measurementPayload(row.payload, this.transport.measurementId);
        const raw = row.payload as Record<string, unknown>;
        const deadline = Math.min(row.createdAt.getTime() + ANALYTICS_TTL_MS,
          typeof raw?.expiresAt === 'number' && Number.isFinite(raw.expiresAt) ? raw.expiresAt : row.createdAt.getTime() + ANALYTICS_TTL_MS);
        const result = !this.transport.enabled || !payload ? 'permanent' : await this.transport.send(payload);
        if (result === 'retry' && row.attempts < 32 && Date.now() + retryDelay(row.attempts) < deadline && payload) {
          await this.db.outboxEvent.updateMany({ where, data: { status: 'PENDING', lockedAt: null, lastError: 'ANALYTICS_RETRY', availableAt: new Date(Date.now() + retryDelay(row.attempts)) } });
        } else {
          // A submitted request is not proof of ingestion. Keep only a short dedup tombstone.
          await this.db.outboxEvent.updateMany({ where, data: { status: result === 'submitted' ? 'DELIVERED' : 'FAILED', payload: {}, lockedAt: null,
            deliveredAt: result === 'submitted' ? new Date() : null, lastError: result === 'submitted' ? null : 'ANALYTICS_NOT_SUBMITTED', availableAt: new Date(deadline) } });
        }
        this.logger.log({ code: result === 'submitted' ? 'ANALYTICS_SUBMITTED' : result === 'retry' ? 'ANALYTICS_RETRY_OR_EXHAUSTED' : 'ANALYTICS_DROPPED', attempts: row.attempts });
      }
    } finally { this.running = false; }
  }
}
