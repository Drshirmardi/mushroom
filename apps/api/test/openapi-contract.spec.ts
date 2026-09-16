import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';

const operationIds = [
  'authRegister',
  'authLogin',
  'authRefresh',
  'authLogout',
  'authLogoutAll',
  'authListSessions',
  'authRevokeSession',
  'accountGetCurrent',
  'accountUpdateCurrent',
  'accountChangePassword',
] as const;

const identityOperations = [
  ['/v1/auth/register', 'post'],
  ['/v1/auth/login', 'post'],
  ['/v1/auth/refresh', 'post'],
  ['/v1/auth/logout', 'post'],
  ['/v1/auth/logout-all', 'post'],
  ['/v1/auth/sessions', 'get'],
  ['/v1/auth/sessions/{id}', 'delete'],
  ['/v1/me', 'get'],
  ['/v1/me', 'patch'],
  ['/v1/me/change-password', 'post'],
] as const;

describe('identity OpenAPI contract', () => {
  let app: NestFastifyApplication;
  let document: Record<string, any>;

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    const response = await app.inject({ method: 'GET', url: '/docs-json' });
    expect(response.statusCode).toBe(200);
    document = response.json();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps the checked-in client source synchronized with the runtime document', async () => {
    const generatedSource = JSON.parse(await readFile(
      resolve(process.cwd(), '../../packages/api-client/openapi.json'),
      'utf8',
    ));

    expect(document).toEqual(generatedSource);
  });

  it('publishes stable unique operation ids and typed error envelopes', () => {
    const operations = identityOperations.map(([path, method]) =>
      document.paths[path][method]);

    expect(operations.map((operation) => operation.operationId)).toEqual(
      operationIds,
    );
    expect(new Set(operationIds).size).toBe(operationIds.length);

    for (const operation of operations) {
      for (const [status, response] of Object.entries(operation.responses)) {
        if (Number(status) < 400) continue;
        expect(response).toMatchObject({
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiErrorResponseDto' },
            },
          },
        });
      }
    }
  });

  it('documents bearer and refresh-cookie security without a refresh request body', () => {
    const refresh = document.paths['/v1/auth/refresh'].post;
    const protectedOperations = identityOperations
      .slice(3)
      .map(([path, method]) => document.paths[path][method]);

    expect(document.components.securitySchemes).toMatchObject({
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      refreshCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: '__Host-sz_refresh',
      },
    });
    expect(refresh.security).toEqual([{ refreshCookie: [] }]);
    expect(refresh.requestBody).toBeUndefined();
    for (const operation of protectedOperations) {
      expect(operation.security).toEqual([{ bearerAuth: [] }]);
      expect(operation.responses['401']).toBeDefined();
      expect(operation.responses['403']).toBeDefined();
    }
  });

  it('keeps browser Origin optional and documents refresh-cookie response headers', () => {
    const browserOperations = identityOperations
      .filter(([path, method]) =>
        !(path === '/v1/auth/sessions' && method === 'get')
        && !(path === '/v1/me' && method === 'get'))
      .map(([path, method]) => document.paths[path][method]);

    for (const operation of browserOperations) {
      const origin = operation.parameters.filter(
        (parameter: Record<string, unknown>) =>
          String(parameter.name).toLowerCase() === 'origin',
      );
      expect(origin).toHaveLength(1);
      expect(origin[0].required).toBe(false);
    }

    expect(document.paths['/v1/auth/login'].post.responses['200'].headers)
      .toHaveProperty('Set-Cookie');
    expect(document.paths['/v1/auth/refresh'].post.responses['200'].headers)
      .toHaveProperty('Set-Cookie');
    expect(document.paths['/v1/auth/logout'].post.responses['204'].headers)
      .toHaveProperty('Set-Cookie');
    expect(
      document.paths['/v1/me/change-password'].post.responses['204'].headers,
    )
      .toHaveProperty('Set-Cookie');
  });

  it('marks credentials write-only and emits finite role and error-code unions', () => {
    const schemas = document.components.schemas;

    expect(schemas.RegisterRequestDto.properties.password.writeOnly).toBe(true);
    expect(schemas.LoginRequestDto.properties.password.writeOnly).toBe(true);
    expect(schemas.ChangePasswordDto.properties.currentPassword.writeOnly)
      .toBe(true);
    expect(schemas.ChangePasswordDto.properties.newPassword.writeOnly)
      .toBe(true);
    expect(schemas.AuthenticatedUserDto.properties.roles.items.enum).toEqual([
      'PATIENT',
      'DOCTOR',
      'STAFF',
      'ADMIN',
    ]);
    expect(schemas.ApiErrorResponseDto.properties.code.enum).toContain(
      'FORBIDDEN',
    );
  });

  it('publishes the frozen patient-commerce paths with bearer protection', () => {
    const paths = document.paths;
    for (const [path, method] of [
      ['/v1/commerce/products', 'get'],
      ['/v1/commerce/products/{productId}', 'get'],
      ['/v1/patients/me/cart', 'get'],
      ['/v1/patients/me/cart', 'put'],
      ['/v1/patients/me/wishlist', 'get'],
      ['/v1/patients/me/wishlist', 'put'],
    ]) {
      expect(paths[path][method].security).toEqual([{ bearerAuth: [] }]);
    }
    expect(paths['/v1/commerce/products'].get.operationId).toBe('patientCommerceProductsList');
    expect(paths['/v1/patients/me/cart'].put.operationId).toBe('patientCommerceCartUpdate');
    expect(document.components.schemas.PatientCommerceSkuDto.properties.currentPriceToman.description).toBe('Integer TOMAN.');
  });
});
