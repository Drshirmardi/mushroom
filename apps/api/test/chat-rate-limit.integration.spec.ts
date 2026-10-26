import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { createApiApplication } from '../src/app.factory';
import { sendEngineMessage, auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat send rate limits (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;

  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('enforces five sends per ten seconds and thirty sends per user-minute with stable backpressure', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id as string;
    const send = (index: number) => sendEngineMessage(app, fixture!.tokens.patient, id, { clientMessageId: `a9200000-0000-4000-8000-${String(index).padStart(12, '0')}`, body: `synthetic ${index}` });
    for (let index = 1; index <= 5; index += 1) expect((await send(index)).statusCode).toBe(200);
    const burst = await send(6);
    expect(burst.statusCode).toBe(429); expect(burst.json().code).toBe('CHAT_RATE_LIMITED');

    for (let batch = 0; batch < 5; batch += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10_100));
      for (let offset = 0; offset < 5; offset += 1) expect((await send(7 + batch * 5 + offset)).statusCode).toBe(200);
    }
    const minute = await send(32);
    expect(minute.statusCode).toBe(429); expect(minute.json().code).toBe('CHAT_RATE_LIMITED');
  }, 90_000);

  it('enforces 120 sends per conversation-minute without allowing per-user limits to bypass it', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id as string;
    const issuer = app.get(AccessTokenService);
    const tokens = await Promise.all(Array.from({ length: 24 }, async () => {
      const user = await fixture!.prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
      const role = await fixture!.prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
      await fixture!.prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
      await fixture!.prisma.clinicalClinicAccess.create({ data: { userId: user.id, clinicId: fixture!.clinic.id } });
      const sessionId = randomUUID();
      await fixture!.prisma.session.create({ data: { id: sessionId, userId: user.id, refreshTokenHash: randomUUID().replaceAll('-', '').repeat(2), expiresAt: new Date(Date.now() + 60 * 60_000) } });
      return issuer.issue({ userId: user.id, sessionId, roles: ['ADMIN'] });
    }));
    for (let index = 0; index < 120; index += 1) {
      const response = await sendEngineMessage(app, tokens[index % tokens.length]!, id, { clientMessageId: `a9300000-0000-4000-8000-${String(index).padStart(12, '0')}`, body: `conversation synthetic ${index}` });
      expect(response.statusCode).toBe(200);
    }
    const rejected = await sendEngineMessage(app, tokens[0]!, id, { clientMessageId: 'a9300000-0000-4000-8000-000000000999', body: 'over conversation limit' });
    expect(rejected.statusCode).toBe(429); expect(rejected.json().code).toBe('CHAT_RATE_LIMITED');
  }, 60_000);
});
