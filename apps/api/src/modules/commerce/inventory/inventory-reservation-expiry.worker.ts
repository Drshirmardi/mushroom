import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CommerceInventoryService } from './commerce-inventory.service';

const EXPIRY_POLL_INTERVAL_MS = 60_000;

@Injectable()
export class InventoryReservationExpiryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryReservationExpiryWorker.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly inventory: CommerceInventoryService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.runOnce().catch(() => this.logger.error('Inventory reservation expiry run failed.')), EXPIRY_POLL_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(limit = 25) {
    return this.inventory.expireDue(limit);
  }
}
