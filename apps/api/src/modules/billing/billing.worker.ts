import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingGatewayService } from './billing-gateway.service';
import { BaleWalletBillingService } from './bale-wallet-billing.service';

@Injectable()
export class BillingWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly logger = new Logger(BillingWorker.name);
  constructor(private readonly billing: BillingService, private readonly gateway: BillingGatewayService, private readonly bale: BaleWalletBillingService) {}
  onModuleInit() { this.timer = setInterval(() => void this.tick(), 30_000); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const tasks = [
        ['expiration', () => this.billing.expire()],
        ['Sadad reconciliation', () => this.gateway.maintain()],
        ['Bale reconciliation', () => this.bale.maintain()],
      ] as const;
      // One provider outage must never suppress the other provider's recovery.
      for (const [name, run] of tasks) {
        try { await run(); }
        catch { this.logger.error(`${name} deferred; financial state retained for retry.`); }
      }
    } finally { this.running = false; }
  }
}
