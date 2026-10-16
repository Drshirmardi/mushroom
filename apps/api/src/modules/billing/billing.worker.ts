import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingGatewayService } from './billing-gateway.service';

@Injectable()
export class BillingWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly logger = new Logger(BillingWorker.name);
  constructor(private readonly billing: BillingService, private readonly gateway: BillingGatewayService) {}
  onModuleInit() { this.timer = setInterval(() => void this.tick(), 30_000); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async tick() {
    if (this.running) return;
    this.running = true;
    try { await this.billing.expire(); await this.gateway.maintain(); }
    catch { this.logger.error('Billing maintenance deferred; financial state retained for retry.'); }
    finally { this.running = false; }
  }
}
