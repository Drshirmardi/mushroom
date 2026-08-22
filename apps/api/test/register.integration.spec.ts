import { randomInt } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { normalizeIranianMobile } from '../src/modules/identity/domain/phone-number';
import { verifyPassword } from '../src/modules/identity/infrastructure/password-hasher';

const createLocalPhone = (): string =>
  `09${randomInt(100_000_000, 1_000_000_000)}`;

describe('POST /v1/auth/register (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const createdPhones = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
  }, 30_000);

  afterEach(async () => {
    if (createdPhones.size === 0) return;

    await prisma.user.deleteMany({
      where: { phone: { in: [...createdPhones] } },
    });
    createdPhones.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (phone: string, password: string) => {
    const canonicalPhone = normalizeIranianMobile(phone);
    createdPhones.add(canonicalPhone);

    return app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { phone, password },
    });
  };

  it('creates a patient, credential and role assignment atomically', async () => {
    const phone = createLocalPhone();
    const password = 'correct horse battery staple';
    const canonicalPhone = normalizeIranianMobile(phone);
    const response = await register(phone, password);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      phone: canonicalPhone,
      roles: ['PATIENT'],
    });
    expect(response.json().id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.json().createdAt).toEqual(expect.any(String));
    expect(JSON.stringify(response.json())).not.toMatch(
      /password|hash|token|credential/i,
    );
    expect(response.headers['set-cookie']).toBeUndefined();

    const persistedUser = await prisma.user.findUnique({
      where: { phone: canonicalPhone },
      include: {
        credential: true,
        roles: { include: { role: true } },
      },
    });

    expect(persistedUser?.credential?.passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(
      persistedUser?.credential?.passwordHash ?? '',
      password,
    )).resolves.toBe(true);
    expect(persistedUser?.roles.map(({ role }) => role.code)).toEqual([
      'PATIENT',
    ]);
  });

  it('returns a stable conflict for an equivalent duplicate phone', async () => {
    const phone = createLocalPhone();
    const password = 'correct horse battery staple';
    const firstResponse = await register(phone, password);
    const duplicateResponse = await register(
      `+98${phone.slice(1)}`,
      'another sufficiently long password',
    );

    expect(firstResponse.statusCode).toBe(201);
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({
      code: 'PHONE_ALREADY_REGISTERED',
      message: 'An account with this phone number already exists.',
      details: {},
    });
    expect(duplicateResponse.json().requestId).toEqual(expect.any(String));
  });

  it('keeps one user when equivalent registrations race', async () => {
    const phone = createLocalPhone();
    const canonicalPhone = normalizeIranianMobile(phone);
    const [firstResponse, secondResponse] = await Promise.all([
      register(phone, 'correct horse battery staple'),
      register(`0098${phone.slice(1)}`, 'another sufficiently long password'),
    ]);

    expect([firstResponse.statusCode, secondResponse.statusCode].sort())
      .toEqual([201, 409]);
    await expect(prisma.user.count({ where: { phone: canonicalPhone } }))
      .resolves.toBe(1);
  });

  it('maps invalid phone and password policy errors without echoing secrets', async () => {
    const invalidPhoneResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        phone: '02112345678',
        password: 'correct horse battery staple',
      },
    });
    const weakPassword = 'too-short';
    const weakPasswordResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { phone: createLocalPhone(), password: weakPassword },
    });

    expect(invalidPhoneResponse.statusCode).toBe(422);
    expect(invalidPhoneResponse.json().code).toBe('INVALID_PHONE_NUMBER');
    expect(weakPasswordResponse.statusCode).toBe(422);
    expect(weakPasswordResponse.json().code).toBe('PASSWORD_TOO_SHORT');
    expect(weakPasswordResponse.body).not.toContain(weakPassword);
  });

  it('rejects fields outside the identity registration contract', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        phone: createLocalPhone(),
        password: 'correct horse battery staple',
        name: 'Not owned by identity',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('BAD_REQUEST');
  });

  it('publishes the register contract in OpenAPI', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs-json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().paths['/v1/auth/register']?.post).toBeDefined();
  });
});
