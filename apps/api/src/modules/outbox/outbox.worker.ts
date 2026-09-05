import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OutboxService } from './outbox.service';
@Injectable() export class OutboxWorker implements OnModuleInit, OnModuleDestroy { private timer?: NodeJS.Timeout; constructor(private readonly outbox: OutboxService) {} onModuleInit() { this.timer = setInterval(() => void this.tick(), 10_000); this.timer.unref(); } onModuleDestroy() { if (this.timer) clearInterval(this.timer); } async tick() { for (const event of await this.outbox.claim()) await this.outbox.retry(event.id, 'No handler registered for event type.'); } }
