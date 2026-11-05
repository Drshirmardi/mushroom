import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OutboxModule } from '../outbox/outbox.module';
import { AnalyticsService } from './analytics.service';
import { Ga4Transport } from './ga4.transport';
import { AnalyticsWorker } from './analytics.worker';
import { AnalyticsInterceptor } from './analytics.interceptor';

@Module({ imports: [OutboxModule], providers: [Ga4Transport, AnalyticsService, AnalyticsWorker,
  { provide: APP_INTERCEPTOR, useClass: AnalyticsInterceptor }], exports: [AnalyticsService] })
export class AnalyticsModule {}
