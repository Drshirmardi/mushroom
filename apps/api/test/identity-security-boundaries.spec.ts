import 'reflect-metadata';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createApiApplication,
  SWAGGER_UI_OPTIONS,
} from '../src/app.factory';
import { createFastifyLoggingOptions } from '../src/common/logging/fastify-logging.config';

const frontendOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
] as const;

describe('identity security boundaries', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(frontendOrigins)(
    'allows credentialed CORS preflight for %s',
    async (origin) => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/v1/auth/refresh',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization,content-type',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers.vary).toContain('Origin');
    },
  );

  it.each(['PATCH', 'PUT', 'DELETE'] as const)(
    'allows browser preflight for the %s method',
    async (method) => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/v1/patients/me',
        headers: {
          origin: 'http://localhost:3001',
          'access-control-request-method': method,
          'access-control-request-headers': 'authorization,content-type',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );
      expect(response.headers['access-control-allow-methods']).toContain(method);
    },
  );

  it('does not grant CORS access to an unknown origin', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/auth/refresh',
      headers: {
        origin: 'https://evil.example',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('redacts browser credentials and secret-bearing request fields from logs', () => {
    const options = createFastifyLoggingOptions('info');

    expect(options.logger.redact).toMatchObject({
      censor: '[REDACTED]',
      paths: expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.token',
        'req.body.invitationToken',
        'req.body.recipientPhone',
        'req.body.recipientPatientId',
        'req.body.provenance',
        'req.body.safety',
        'req.body.refreshToken',
        'req.body.accessToken',
      ]),
    });
  });

  it('does not persist bearer authorization in Swagger UI', () => {
    expect(SWAGGER_UI_OPTIONS.persistAuthorization).toBe(false);
  });
});
