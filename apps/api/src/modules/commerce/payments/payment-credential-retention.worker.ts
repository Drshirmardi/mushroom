import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentCredentialRetentionService } from './payment-credential-retention.service';

const RETENTION_POLL_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PaymentCredentialRetentionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentCredentialRetentionWorker.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly retention: PaymentCredentialRetentionService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.retention.shredDue().catch(() => this.logger.error('Payment credential retention run failed.')), RETENTION_POLL_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
