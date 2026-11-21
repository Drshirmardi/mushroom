import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { ChatCallService } from '../src/modules/communications/chat/chat-call.service';
import { ChatDatabaseService } from '../src/modules/communications/chat/chat-database.service';
import type { ChatService } from '../src/modules/communications/chat/chat.service';
import { ChatRealtimePublisher } from '../src/modules/communications/chat/realtime/chat-realtime.publisher';
import type { PrismaService } from '../src/database/prisma/prisma.service';

it('expires an abandoned call once across concurrent workers and preserves a renewed call', async () => {
  const database = new ChatDatabaseService(new ConfigService());
  const main = { user: { findFirst: async () => ({ id: randomUUID() }) }, userProfile: { findUnique: async () => null } } as unknown as PrismaService;
  const chat = { callAccess: async () => ({ patientUserId: patientIds[1], actor: { kind: 'DOCTOR' } }) } as unknown as ChatService;
  const workers = [0, 1].map(() => new ChatCallService(database, main, chat, new ChatRealtimePublisher()));
  const published = vi.fn();
  const subscriptions = workers.map(worker => worker.incomingChanges.subscribe(published));
  const old = new Date(Date.now() - 120_000);
  const ids = [randomUUID(), randomUUID()];
  const patientIds = [randomUUID(), randomUUID()];
  try {
    await database.client.chatCall.createMany({ data: ids.map((id, index) => ({
      id, appointmentId: randomUUID(), callerUserId: randomUUID(), callerSessionId: randomUUID(),
      callerName: 'Synthetic', callerKind: 'DOCTOR' as const, patientUserId: patientIds[index]!,
      status: 'ACTIVE' as const, ringsUntil: old, answeredAt: old, connectedAt: old,
      callerLeaseAt: index === 0 ? old : new Date(Date.now() - 85_000), patientLeaseAt: new Date(),
    })) });
    await Promise.all(workers.map(worker => worker.expireCalls()));
    const [stale, live] = await Promise.all(ids.map(id => database.client.chatCall.findUniqueOrThrow({ where: { id } })));
    expect(stale).toMatchObject({ status: 'ENDED', endedAt: expect.any(Date), endReason: 'lease_expired' });
    expect(live).toMatchObject({ status: 'ACTIVE', endedAt: null });
    await expect(database.client.chatCall.create({
      data: {
        appointmentId: randomUUID(), callerUserId: live!.callerUserId, callerSessionId: randomUUID(),
        callerName: 'Synthetic', callerKind: 'DOCTOR', patientUserId: randomUUID(),
        status: 'RINGING', ringsUntil: new Date(Date.now() + 45_000),
      },
    })).rejects.toMatchObject({ code: 'P2002' });
    expect(published).toHaveBeenCalledExactlyOnceWith(patientIds[0]);
    const secret = 'synthetic-test-key-for-lease-recovery-not-for-runtime';
    vi.stubEnv('CHAT_VIDEO_ENABLED', 'true');
    vi.stubEnv('CHAT_VIDEO_SECRET', secret);
    vi.stubEnv('CHAT_VIDEO_ORIGIN', 'https://calls.invalid');
    await expect(workers[0]!.bridge(secret, { callId: live!.id, userId: live!.callerUserId, action: 'lease' })).resolves.toEqual({ callId: live!.id });
    const caller = { userId: live!.callerUserId, sessionId: live!.callerSessionId, roles: ['DOCTOR' as const], tokenId: '', issuedAt: 0, expiresAt: 0 };
    const otherSession = { ...caller, sessionId: randomUUID() };
    await expect(workers[0]!.outgoingSnapshot(caller)).resolves.toMatchObject({ id: live!.id });
    await expect(workers[0]!.outgoingSnapshot(otherSession)).resolves.toBeNull();
    await expect(workers[0]!.get(otherSession, live!.id)).rejects.toThrow();
    const renewed = await database.client.chatCall.findUniqueOrThrow({ where: { id: live!.id } });
    expect(renewed.callerLeaseAt!.valueOf()).toBeGreaterThan(live!.callerLeaseAt!.valueOf());
    await expect(workers[0]!.bridge(secret, { callId: stale!.id, userId: stale!.callerUserId, action: 'lease' })).rejects.toThrow();
  } finally {
    vi.unstubAllEnvs();
    for (const subscription of subscriptions) subscription.unsubscribe();
    await database.client.chatCall.deleteMany({ where: { id: { in: ids } } });
    await database.onModuleDestroy();
  }
});

it('publishes the new connection timestamp once after both participants connect', async () => {
  const id = randomUUID();
  const callerUserId = randomUUID();
  const patientUserId = randomUUID();
  const database = new ChatDatabaseService(new ConfigService());
  const main = { user: { findFirst: async () => ({ id: callerUserId }) } } as unknown as PrismaService;
  const chat = { callAccess: async () => ({ patientUserId, actor: { kind: 'DOCTOR' } }) } as unknown as ChatService;
  const worker = new ChatCallService(database, main, chat, new ChatRealtimePublisher());
  const published = vi.fn();
  const subscription = worker.outgoingChanges.subscribe(published);
  const secret = 'synthetic-test-key-for-connection-events-not-for-runtime';
  vi.stubEnv('CHAT_VIDEO_ENABLED', 'true');
  vi.stubEnv('CHAT_VIDEO_SECRET', secret);
  vi.stubEnv('CHAT_VIDEO_ORIGIN', 'https://calls.invalid');
  try {
    await database.client.chatCall.create({ data: {
      id, appointmentId: randomUUID(), callerUserId, callerSessionId: randomUUID(),
      callerName: 'Synthetic', callerKind: 'DOCTOR', patientUserId,
      status: 'ACTIVE', answeredAt: new Date(), ringsUntil: new Date(Date.now() + 45_000),
    } });
    const connect = (userId: string) => worker.bridge(secret, { callId: id, userId, action: 'connected' });
    await connect(callerUserId);
    expect(published).not.toHaveBeenCalled();
    await connect(patientUserId);
    await connect(patientUserId);
    const current = await database.client.chatCall.findUniqueOrThrow({ where: { id } });
    expect(current.connectedAt).toBeInstanceOf(Date);
    expect(published).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id, connectedAt: current.connectedAt }));
  } finally {
    vi.unstubAllEnvs();
    subscription.unsubscribe();
    await database.client.chatCall.deleteMany({ where: { id } });
    await database.onModuleDestroy();
  }
});
