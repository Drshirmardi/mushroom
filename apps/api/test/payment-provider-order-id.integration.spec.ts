import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { PaymentProviderOrderIdService } from '../src/modules/commerce/payments/payment-provider-order-id.service';

describe('payment provider order-id allocation (PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let allocator: PaymentProviderOrderIdService;

  beforeAll(async () => { app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); allocator = app.get(PaymentProviderOrderIdService); }, 30_000);
  afterAll(async () => { await app.close(); });

  it('allocates durable positive numeric IDs concurrently', async () => {
    const values = await Promise.all(Array.from({ length: 8 }, () => prisma.$transaction((tx) => allocator.next(tx))));
    expect(values.every((value) => value > 0n)).toBe(true);
    expect(new Set(values.map(String)).size).toBe(values.length);
  });
});
