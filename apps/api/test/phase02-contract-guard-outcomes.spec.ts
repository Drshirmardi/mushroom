import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';

const phase02Operations = [
  ['/v1/patients/me', 'get'],
  ['/v1/patients/me', 'patch'],
  ['/v1/patients/me/onboarding-status', 'get'],
  ['/v1/patients/me/consent-policy', 'get'],
  ['/v1/patients/me/consents', 'post'],
  ['/v1/patients/me/consents/{consentRecordId}/withdraw', 'post'],
  ['/v1/patients/me/medical-intake', 'get'],
  ['/v1/patients/me/medical-intake', 'put'],
  ['/v1/patients/me/medical-intake/complete', 'post'],
  ['/v1/admin/patients', 'get'],
  ['/v1/admin/patients', 'post'],
  ['/v1/admin/patients/onboarding-summary', 'get'],
  ['/v1/admin/patients/{patientId}', 'get'],
  ['/v1/admin/patients/{patientId}', 'patch'],
  ['/v1/admin/patients/{patientId}/medical-intake', 'patch'],
] as const;

describe('Phase 02 protected OpenAPI guard outcomes', () => {
  let app: NestFastifyApplication;
  let document: Record<string, any>;

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    document = (await app.inject({ method: 'GET', url: '/docs-json' })).json();
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents bearer authentication plus typed 401 and 403 guard failures for every protected operation', () => {
    for (const [path, method] of phase02Operations) {
      const operation = document.paths[path][method];
      expect(operation.security).toEqual([{ bearerAuth: [] }]);

      for (const status of ['401', '403']) {
        expect(operation.responses[status]).toMatchObject({
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiErrorResponseDto' },
            },
          },
        });
      }
    }
  });
});
