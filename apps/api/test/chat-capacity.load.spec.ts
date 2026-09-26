import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { io, type Socket } from 'socket.io-client';
import { afterAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

type Participant = { conversationId: string; token: string };
type Connected = Participant & { socket: Socket };

const connect = (url: string, participant: Participant, lastSequence: string) => new Promise<Connected>((resolve, reject) => {
  const socket = io(`${url}/chat`, { auth: { token: participant.token }, transports: ['websocket'], reconnection: false });
  socket.once('connect_error', reject);
  socket.once('connect', () => socket.timeout(10_000).emit('conversation:join', { conversationId: participant.conversationId, lastSequence }, (error: Error | null, result: { ok?: boolean }) => {
    if (error || !result?.ok) { socket.disconnect(); reject(error ?? new Error('CHAT_FORBIDDEN')); return; }
    resolve({ ...participant, socket });
  }));
});

async function inChunks<T>(values: readonly T[], chunkSize: number, work: (value: T, index: number) => Promise<void>) {
  for (let start = 0; start < values.length; start += chunkSize) await Promise.all(values.slice(start, start + chunkSize).map((value, index) => work(value, start + index)));
}

describe('chat capacity and reconnect load (synthetic PostgreSQL/Socket.IO)', () => {
  let app: NestFastifyApplication;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const databaseName = `sabz_zendegi_chat_capacity_${randomUUID().replaceAll('-', '')}`;
  let adminClient: Client | undefined;
  const fixtures: ChatFixture[] = [];
  const sockets: Connected[] = [];

  const databaseUrl = () => {
    if (!originalDatabaseUrl) throw new Error('DATABASE_URL is required for chat capacity testing.');
    const url = new URL(originalDatabaseUrl); url.pathname = `/${databaseName}`; return url.toString();
  };

  const prepareDatabase = async () => {
    if (!originalDatabaseUrl) throw new Error('DATABASE_URL is required for chat capacity testing.');
    const adminUrl = new URL(originalDatabaseUrl); adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() }); await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js');
    const env = { ...process.env, DATABASE_URL: databaseUrl(), DEV_DASHBOARD_ADMIN_PHONE: '', DEV_DASHBOARD_ADMIN_PASSWORD: '' };
    const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'], { cwd: process.cwd(), env, encoding: 'utf8' });
    expect(migration.status, migration.stderr).toBe(0);
    const seed = spawnSync(process.execPath, ['prisma/seed.mjs'], { cwd: process.cwd(), env, encoding: 'utf8' });
    expect(seed.status, seed.stderr).toBe(0);
    process.env.DATABASE_URL = databaseUrl();
  };

  afterAll(async () => {
    sockets.forEach(({ socket }) => socket.disconnect());
    for (const fixture of fixtures) await destroyChatFixture(fixture);
    await app?.close();
    if (adminClient) { await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined); await adminClient.end().catch(() => undefined); }
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('holds 100 consultations, 300 authenticated participants and 600 connections, then recovers a 300-participant storm', async () => {
    await prepareDatabase();
    const { createApiApplication } = await import('../src/app.factory.js');
    app = await createApiApplication(); await app.listen({ host: '127.0.0.1', port: 0 });
    for (let index = 0; index < 100; index += 1) fixtures.push(await createChatFixture(app));
    const participants: Participant[] = [];
    for (const fixture of fixtures) {
      const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
      expect(conversation.statusCode).toBe(200);
      const conversationId = conversation.json().id as string;
      participants.push({ conversationId, token: fixture.tokens.patient }, { conversationId, token: fixture.tokens.doctor }, { conversationId, token: fixture.tokens.admin });
    }
    expect(participants).toHaveLength(300);
    const url = await app.getUrl();
    await inChunks(Array.from({ length: 2 }, () => participants).flat(), 25, async (participant) => { sockets.push(await connect(url, participant, '0')); });
    expect(sockets).toHaveLength(600);

    const sentIds = new Set<string>(); const delivered = new Set<string>();
    sockets.forEach(({ socket }, socketIndex) => socket.on('message:committed', (message: { id: string }) => delivered.add(`${socketIndex}:${message.id}`)));
    await inChunks(fixtures, 20, async (fixture, index) => {
      const conversationId = participants[index * 3]?.conversationId;
      const response = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversationId}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: `a9500000-0000-4000-8000-${String(index).padStart(12, '0')}`, body: 'synthetic capacity signal' } });
      expect(response.statusCode).toBe(201); sentIds.add(response.json().id);
    });
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const relevant = [...delivered].filter((event) => sentIds.has(event.slice(event.indexOf(':') + 1)));
    expect(relevant.length).toBeGreaterThanOrEqual(Math.ceil(600 * 0.95));

    const originals = sockets.splice(0, 300);
    originals.forEach(({ socket }) => socket.disconnect());
    const started = Date.now();
    await inChunks(originals, 25, async ({ conversationId, token }) => { sockets.push(await connect(url, { conversationId, token }, '1')); });
    expect(Date.now() - started).toBeLessThan(60_000);
    expect(sockets).toHaveLength(600);
    sockets.splice(0).forEach(({ socket }) => socket.disconnect());
  }, 180_000);

  it('commits 20 messages/second for 30 minutes and 50 messages/second for 5 minutes without a durable gap', async () => {
    const conversations = await Promise.all(fixtures.map(async (fixture) => {
      const response = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
      expect(response.statusCode).toBe(200); return response.json().id as string;
    }));
    await Promise.all(fixtures.map((fixture) => fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { endsAt: new Date(Date.now() + 75 * 60_000) } })));
    const issuer = app.get(AccessTokenService);
    const sessionIds = await Promise.all(fixtures.map(async (fixture) => [
      (await issuer.verify(fixture.tokens.patient)).sessionId,
      (await issuer.verify(fixture.tokens.doctor)).sessionId,
    ] as const));
    let tokens = fixtures.map((fixture) => [fixture.tokens.patient, fixture.tokens.doctor] as const);
    let refreshAt = Date.now() + 8 * 60_000;
    let sequence = 0;
    const send = async (fixtureIndex: number, senderIndex: 0 | 1) => {
      const response = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversations[fixtureIndex]}/messages`, headers: auth(tokens[fixtureIndex]![senderIndex]), payload: { clientMessageId: randomUUID(), body: 'synthetic load message' } });
      expect(response.statusCode).toBe(201);
    };
    const runRate = async (rate: number, seconds: number) => {
      for (let second = 0; second < seconds; second += 1) {
        const began = Date.now();
        if (began >= refreshAt) {
          tokens = await Promise.all(fixtures.map(async (fixture, index) => [
            await issuer.issue({ userId: fixture.users.patient.id, sessionId: sessionIds[index]![0], roles: ['PATIENT'] }),
            await issuer.issue({ userId: fixture.users.doctor.id, sessionId: sessionIds[index]![1], roles: ['DOCTOR'] }),
          ] as const));
          refreshAt = Date.now() + 8 * 60_000;
        }
        await Promise.all(Array.from({ length: rate }, (_, offset) => {
          const messageIndex = sequence + offset;
          return send(messageIndex % fixtures.length, Math.floor(messageIndex / fixtures.length) % 2 as 0 | 1);
        }));
        sequence += rate;
        const elapsed = Date.now() - began;
        expect(elapsed).toBeLessThanOrEqual(1_000);
        if (elapsed < 1_000) await new Promise((resolve) => setTimeout(resolve, 1_000 - elapsed));
      }
    };
    await runRate(20, 30 * 60);
    await new Promise((resolve) => setTimeout(resolve, 61_000));
    await runRate(50, 5 * 60);
    const summaries = await Promise.all(conversations.map(async (conversationId) => {
      const [count, max] = await Promise.all([
        fixtures[0]!.prisma.chatMessage.count({ where: { conversationId } }),
        fixtures[0]!.prisma.chatMessage.aggregate({ where: { conversationId }, _max: { sequence: true } }),
      ]);
      return { count, max: Number(max._max.sequence ?? 0n) };
    }));
    expect(summaries.every(({ count, max }) => count === max && count === 511)).toBe(true);
  }, 2_400_000);
});
