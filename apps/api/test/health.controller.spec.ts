import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HealthController } from '../src/common/health/health.controller';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('HealthController', () => {
  const queryRaw = vi.fn();
  const controller = new HealthController(
    { $queryRaw: queryRaw } as unknown as PrismaService,
  );

  beforeEach(() => {
    queryRaw.mockReset();
  });

  it('returns liveness without consulting PostgreSQL', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('returns readiness after PostgreSQL responds', async () => {
    queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it('returns a service unavailable error when PostgreSQL is unreachable', async () => {
    queryRaw.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(controller.ready()).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  });
});
