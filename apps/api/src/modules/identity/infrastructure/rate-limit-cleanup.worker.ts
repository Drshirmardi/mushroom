import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class RateLimitCleanupWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitCleanupWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => void this.runOnce().catch(() => {
      this.logger.warn('Expired rate limit cleanup failed');
    }), 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      return await this.prisma.$executeRaw`
        WITH expired AS (
          SELECT key FROM auth_rate_limit_buckets
          WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
          ORDER BY updated_at
          LIMIT 1000
          FOR UPDATE SKIP LOCKED
        )
        DELETE FROM auth_rate_limit_buckets AS bucket
        USING expired WHERE bucket.key = expired.key
      `;
    } finally {
      this.running = false;
    }
  }
}
