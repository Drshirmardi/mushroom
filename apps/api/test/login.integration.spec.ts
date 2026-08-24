import { randomInt } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import {
  InvalidCredentialsError,
  LoginRateLimitedError,
  LoginUserUseCase,
} from '../src/modules/identity/application/login-user.use-case';
import { LoginRepository } from '../src/modules/identity/application/ports/login.repository';
import { normalizeIranianMobile } from '../src/modules/identity/domain/phone-number';

const createLocalPhone = (): string =>
  `09${randomInt(100_000_000, 1_000_000_000)}`;
const createIpAddress = (): string =>
  `198.51.100.${randomInt(1, 255)}`;

describe('Login core (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let login: LoginUserUseCase;
  let loginRepository: LoginRepository;
  const createdPhones = new Set<string>();
  const usedIpAddresses = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    login = app.get(LoginUserUseCase);
    loginRepository = app.get(LoginRepository);
  }, 30_000);

  afterEach(async () => {
    await prisma.authRateLimitBucket.deleteMany();
    if (usedIpAddresses.size > 0) {
      await prisma.loginAttempt.deleteMany({
        where: { ipAddress: { in: [...usedIpAddresses] } },
      });
    }
    if (createdPhones.size > 0) {
      await prisma.user.deleteMany({
        where: { phone: { in: [...createdPhones] } },
      });
    }
    createdPhones.clear();
    usedIpAddresses.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (
    password = 'correct horse battery staple',
  ): Promise<string> => {
    const phone = createLocalPhone();
    const canonicalPhone = normalizeIranianMobile(phone);
    createdPhones.add(canonicalPhone);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { phone, password },
    });

    expect(response.statusCode).toBe(201);
    return canonicalPhone;
  };

  const nextIp = (): string => {
    const ipAddress = createIpAddress();
    usedIpAddresses.add(ipAddress);
    return ipAddress;
  };

  it('authenticates valid credentials and persists a successful attempt', async () => {
    const password = 'correct horse battery staple';
    const phone = await register(password);
    const ipAddress = nextIp();

    await expect(login.execute({ phone, password, ipAddress })).resolves
      .toMatchObject({ phone, roles: ['PATIENT'] });

    await expect(prisma.loginAttempt.findFirst({
      where: { phone, ipAddress },
      select: { outcome: true, userId: true },
    })).resolves.toMatchObject({
      outcome: 'SUCCESS',
      userId: expect.any(String),
    });
  });

  it('uses one public error while retaining security-relevant outcomes', async () => {
    const password = 'correct horse battery staple';
    const phone = await register(password);
    const wrongPasswordIp = nextIp();
    const disabledIp = nextIp();
    const unknownIp = nextIp();

    await expect(login.execute({
      phone,
      password: 'incorrect but sufficiently long',
      ipAddress: wrongPasswordIp,
    })).rejects.toEqual(new InvalidCredentialsError());

    await prisma.user.update({
      where: { phone },
      data: { status: 'DISABLED' },
    });
    await expect(login.execute({ phone, password, ipAddress: disabledIp }))
      .rejects.toEqual(new InvalidCredentialsError());

    await expect(login.execute({
      phone: createLocalPhone(),
      password,
      ipAddress: unknownIp,
    })).rejects.toEqual(new InvalidCredentialsError());

    const outcomes = await prisma.loginAttempt.findMany({
      where: {
        ipAddress: { in: [wrongPasswordIp, disabledIp, unknownIp] },
      },
      orderBy: { createdAt: 'asc' },
      select: { outcome: true },
    });
    expect(outcomes.map(({ outcome }) => outcome)).toEqual([
      'INVALID_CREDENTIALS',
      'ACCOUNT_DISABLED',
      'INVALID_CREDENTIALS',
    ]);
  });

  it('limits a phone after five failed attempts and records the denial', async () => {
    const phone = await register();
    const ipAddress = nextIp();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(login.execute({
        phone,
        password: `incorrect password attempt ${attempt}`,
        ipAddress,
      })).rejects.toBeInstanceOf(InvalidCredentialsError);
    }

    await expect(login.execute({
      phone,
      password: 'correct horse battery staple',
      ipAddress,
    })).rejects.toEqual(new LoginRateLimitedError());

    const groupedAttempts = await prisma.loginAttempt.groupBy({
      by: ['outcome'],
      where: { phone, ipAddress },
      _count: true,
    });
    expect(Object.fromEntries(groupedAttempts.map(({ outcome, _count }) => [
      outcome,
      _count,
    ]))).toEqual({ INVALID_CREDENTIALS: 5, RATE_LIMITED: 1 });
  });

  it('reserves no more than five concurrent attempts for one phone', async () => {
    const phone = normalizeIranianMobile(createLocalPhone());
    const ipAddress = nextIp();
    createdPhones.add(phone);
    const request = {
      phone,
      recordedPhone: phone,
      ipAddress,
      windowStartedAt: new Date(Date.now() - 15 * 60 * 1_000),
      phoneLimit: 5,
      ipLimit: 30,
    };

    const reservations = await Promise.all(
      Array.from({ length: 12 }, () => loginRepository.reserveAttempt(request)),
    );

    expect(reservations.filter(({ allowed }) => allowed)).toHaveLength(5);
    expect(reservations.filter(({ allowed }) => !allowed)).toHaveLength(7);
    await expect(prisma.loginAttempt.count({
      where: { phone, outcome: 'PENDING' },
    })).resolves.toBe(5);
    await expect(prisma.loginAttempt.count({
      where: { phone, outcome: 'RATE_LIMITED' },
    })).resolves.toBe(7);
  });

  it('limits failures from one IP across distinct phone numbers', async () => {
    const ipAddress = nextIp();
    const reservations = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const phone = normalizeIranianMobile(createLocalPhone());
      reservations.push(await loginRepository.reserveAttempt({
        phone,
        recordedPhone: phone,
        ipAddress,
        windowStartedAt: new Date(Date.now() - 15 * 60 * 1_000),
        phoneLimit: 5,
        ipLimit: 5,
      }));
    }

    expect(reservations.filter(({ allowed }) => allowed)).toHaveLength(5);
    expect(reservations.filter(({ allowed }) => !allowed)).toHaveLength(1);
  });
});
