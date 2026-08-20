import 'reflect-metadata';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';

describe('health endpoints (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves liveness without a database query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health/live',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('verifies readiness against the configured PostgreSQL database', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health/ready',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
