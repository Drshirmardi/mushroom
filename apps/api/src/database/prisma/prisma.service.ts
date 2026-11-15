import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');

    // Phase 10 accepts 20 concurrent committed chat messages per second. Keep a bounded pool
    // large enough for independent transactional sends without turning realtime connections
    // into database connections; Phase 12 owns any multi-instance sizing change.
    super({
      adapter: new PrismaPg({ connectionString, max: 20 }),
      ...(process.env.PATIENT_HOME_BENCHMARK === '1' && process.env.PATIENT_JOURNEY_TEST_ISOLATED === '1'
        ? { log: [{ emit: 'event', level: 'query' }] }
        : {}),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
