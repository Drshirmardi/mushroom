import { chatVideoEnabled } from './chat-video-enabled';
import { ConflictException, ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Subject } from 'rxjs';
import { ChatRealtimePublisher } from './realtime/chat-realtime.publisher';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AccessTokenPrincipal } from '../../../common/auth/access-token.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { ChatCall } from '../../../generated/chat-prisma/client';
import { ChatDatabaseService } from './chat-database.service';
import { ChatService } from './chat.service';

type IncomingLease = {
  id: string;
  sessionId: string;
  visible: boolean;
  visibleUntil: number;
  expires: number;
  close?: () => void;
};

@Injectable()
export class ChatCallService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatCallService.name);
  private expirationTimer?: ReturnType<typeof setInterval>;
  private expiring = false;

  onModuleInit() {
    if (!this.database.configured) return;
    this.expirationTimer = setInterval(() => void this.expireCalls(), 15_000);
    this.expirationTimer.unref();
  }

  onModuleDestroy() { clearInterval(this.expirationTimer); }

  private expiryRules(now: Date) {
    return [
      { where: { status: 'RINGING' as const, ringsUntil: { lte: now } }, status: 'MISSED' as const },
      { where: { status: 'ACTIVE' as const, connectedAt: null, answeredAt: { lte: new Date(+now - 60_000) } }, status: 'FAILED' as const },
      { where: { status: 'ACTIVE' as const, connectedAt: { not: null }, OR: [
        ...(['callerLeaseAt', 'patientLeaseAt'] as const).flatMap(field => [
          { [field]: { lte: new Date(+now - 90_000) } },
          { [field]: null, connectedAt: { lte: new Date(+now - 90_000) } },
        ]),
      ] }, status: 'ENDED' as const },
    ];
  }

  async expireCalls() {
    if (this.expiring) return;
    this.expiring = true;
    try {
      const now = new Date();
      for (const rule of this.expiryRules(now)) {
        const changed = await this.database.client.chatCall.updateManyAndReturn({
          where: rule.where, data: { status: rule.status, endedAt: now, ...(rule.status === 'ENDED' ? { endReason: 'lease_expired' } : {}) },
        });
        for (const call of changed) await this.callChanged(call);
      }
    } catch {
      this.logger.warn('Unable to expire consultation calls');
    } finally { this.expiring = false; }
  }

  readonly outgoingChanges = new Subject<ChatCall>();
  readonly patientEndings = new Subject<ChatCall>();
  readonly incomingChanges = new Subject<string>();
  private readonly streams = new Map<string, IncomingLease>();
  private readonly online = new Map<string, number>();
  private readonly grants = new Map<string, { id: string; userId: string; expires: number }>();

  constructor(private readonly database: ChatDatabaseService, private readonly main: PrismaService, private readonly chat: ChatService, private readonly publisher: ChatRealtimePublisher) {}

  get available() {
    return chatVideoEnabled() && !!process.env.CHAT_VIDEO_ORIGIN && (process.env.CHAT_VIDEO_SECRET?.length ?? 0) >= 43;
  }

  async start(principal: AccessTokenPrincipal, appointmentId: string, mode: 'AUDIO' | 'VIDEO' = 'VIDEO') {
    if (!this.available) throw new ServiceUnavailableException('Video is unavailable');
    const { actor, patientUserId, conversation } = await this.chat.callAccess(principal, appointmentId);
    if (actor.kind === 'PATIENT' || patientUserId === actor.userId) throw new ForbiddenException();
    const name = await this.main.userProfile.findUnique({ where: { userId: actor.userId }, select: { firstName: true, lastName: true } });
    const database = this.database.client;
    const staleCalls = await database.chatCall.findMany({ where: { status: 'ACTIVE', OR: [{ appointmentId }, { callerUserId: actor.userId }] } });
    for (const stale of staleCalls) await this.current(stale);
    const call = await database.$transaction(async tx => {
      await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text', 'chat:call:' + appointmentId);
      const now = new Date();
      await tx.chatCall.updateMany({ where: { appointmentId, status: 'RINGING', ringsUntil: { lte: now } }, data: { status: 'MISSED', endedAt: now } });
      await tx.chatCall.updateMany({ where: { callerUserId: actor.userId, status: 'RINGING', ringsUntil: { lte: now } }, data: { status: 'MISSED', endedAt: now } });
      const existing = await tx.chatCall.findFirst({ where: { appointmentId, status: { in: ['ACTIVE', 'RINGING'] } } });
      if (existing?.callerUserId === actor.userId && existing.callerSessionId === principal.sessionId) return existing;
      if (existing) throw new ConflictException('Appointment already has a call');
      const stream = this.streams.get(patientUserId);
      const reachableUntil = Math.max(this.online.get(patientUserId) ?? 0, stream?.visibleUntil ?? 0, stream?.expires ?? 0);
      if (reachableUntil <= now.valueOf()) throw new ConflictException({ code: 'CHAT_PATIENT_OFFLINE', message: 'Patient is offline' });
      const created = await tx.chatCall.create({ data: {
        appointmentId, callerUserId: actor.userId, callerSessionId: principal.sessionId, patientUserId,
        callerKind: actor.kind, callerName: [name?.firstName, name?.lastName].filter(Boolean).join(' '),
        mode, status: 'RINGING', ringsUntil: new Date(now.valueOf() + 45_000),
      } });
      const lock = 'chat:conversation:' + conversation.id;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))::text AS locked`;
      const latest = await tx.chatMessage.aggregate({ where: { conversationId: conversation.id }, _max: { sequence: true } });
      await tx.chatMessage.create({ data: {
        clinicId: conversation.clinicId, conversationId: conversation.id, sequence: (latest._max.sequence ?? 0n) + 1n,
        senderUserId: actor.userId, senderKind: actor.kind, clientMessageId: created.id, callId: created.id,
        requestPayloadHash: createHash('sha256').update('call:' + created.id).digest('hex'), body: '', createdAt: created.createdAt,
      } });
      return created;
    }).catch(error => {
      if (error?.code === 'P2002') throw new ConflictException({ code: 'CHAT_CALL_ALREADY_ACTIVE', message: 'Caller already has a live call' });
      throw error;
    });
    await this.callChanged(call);
    return this.view(call);
  }

  async openIncoming(principal: AccessTokenPrincipal) {
    if (!this.available) throw new ServiceUnavailableException();
    if (!principal.roles.includes('PATIENT')) throw new ForbiddenException();
    await this.livePrincipal(principal.userId, principal.sessionId, 'PATIENT');
    if ((this.streams.get(principal.userId)?.expires ?? 0) > Date.now()) throw new ConflictException('Incoming stream already open');
    const entry: IncomingLease = { id: randomBytes(16).toString('hex'), sessionId: principal.sessionId, visible: false, visibleUntil: 0, expires: Date.now() + 30_000 };
    this.streams.set(principal.userId, entry);
    this.online.delete(principal.userId);
    return {
      id: entry.id,
      bindClose: (close: () => void) => { entry.close = close; },
      validate: () => this.livePrincipal(principal.userId, principal.sessionId, 'PATIENT'),
      renew: () => {
        entry.expires = Date.now() + 30_000;
        if (entry.visible) entry.visibleUntil = entry.expires;
      },
      release: () => { if (this.streams.get(principal.userId) === entry) this.streams.delete(principal.userId); },
    };
  }

  setIncomingVisibility(principal: AccessTokenPrincipal, id: string | undefined, visible: boolean, closed = false) {
    const entry = this.streams.get(principal.userId);
    if (!entry || entry.id !== id || entry.sessionId !== principal.sessionId) throw new ForbiddenException();
    if (closed) { entry.close?.(); return; }
    entry.visible = visible;
    entry.visibleUntil = visible ? Date.now() + 30_000 : 0;
  }

  async incoming(principal: AccessTokenPrincipal, registerPresence = true) {
    if (!this.available || !principal.roles.includes('PATIENT')) return null;
    await this.livePrincipal(principal.userId, principal.sessionId, 'PATIENT');
    if (registerPresence) this.online.set(principal.userId, Date.now() + 30_000);
    if (this.online.size > 128) for (const [id, until] of this.online) if (until < Date.now()) this.online.delete(id);
    const call = await this.database.client.chatCall.findFirst({
      where: { patientUserId: principal.userId, OR: [
        { status: 'ACTIVE', patientSessionId: principal.sessionId }, { status: 'RINGING', ringsUntil: { gt: new Date() } },
      ] },
      orderBy: { createdAt: 'asc' },
    });
    if (!call) return null;
    await this.chat.callAccess(principal, call.appointmentId);
    const current = await this.current(call);
    return ['ACTIVE', 'RINGING'].includes(current.status) ? this.view(current) : null;
  }

  async history(principal: AccessTokenPrincipal, conversationId: string, id: string) {
    const appointmentId = await this.chat.callHistoryAccess(principal, conversationId, id);
    const call = await this.database.client.chatCall.findFirst({ where: { id, appointmentId } });
    if (!call) throw new ForbiddenException();
    return this.view(await this.current(call));
  }

  authorizeOutgoing(principal: AccessTokenPrincipal) {
    if (!this.available) throw new ServiceUnavailableException();
    if (principal.roles.includes('ADMIN')) return this.livePrincipal(principal.userId, principal.sessionId, 'CLINIC_OPERATOR');
    if (principal.roles.includes('DOCTOR')) return this.livePrincipal(principal.userId, principal.sessionId, 'DOCTOR');
    throw new ForbiddenException();
  }

  async outgoingSnapshot(principal: AccessTokenPrincipal) {
    await this.authorizeOutgoing(principal);
    const call = await this.database.client.chatCall.findFirst({
      where: { callerUserId: principal.userId, callerSessionId: principal.sessionId, status: { in: ['ACTIVE', 'RINGING'] } },
    });
    const current = call && await this.current(call);
    return current && ['ACTIVE', 'RINGING'].includes(current.status) ? this.outgoingView(current) : null;
  }

  async outgoingView(call: ChatCall) {
    const [conversation, profile] = await Promise.all([
      this.database.client.chatConversation.findFirst({ where: { appointmentId: call.appointmentId }, select: { id: true, patientId: true } }),
      this.main.userProfile.findUnique({ where: { userId: call.patientUserId }, select: { firstName: true, lastName: true } }),
    ]);
    return {
      ...this.view(call), conversationId: conversation?.id ?? null, patientId: conversation?.patientId ?? null,
      patientName: [profile?.firstName, profile?.lastName].filter(Boolean).join(' '),
    };
  }

  async outgoing(principal: AccessTokenPrincipal, appointmentId: string) {
    const call = await this.database.client.chatCall.findFirst({
      where: { appointmentId, callerUserId: principal.userId, callerSessionId: principal.sessionId, status: { in: ['ACTIVE', 'RINGING'] } },
    });
    if (!call) return null;
    const current = await this.current(await this.owned(principal, call.id));
    return ['ACTIVE', 'RINGING'].includes(current.status) ? this.view(current) : null;
  }

  async get(principal: AccessTokenPrincipal, id: string) {
    return this.view(await this.current(await this.owned(principal, id)));
  }

  async action(principal: AccessTokenPrincipal, id: string, action: 'answer' | 'decline' | 'end', reason?: 'switched') {
    const call = await this.current(await this.owned(principal, id));
    const patient = call.patientUserId === principal.userId;
    if (action !== 'end' && !patient) throw new ForbiddenException();
    if (patient && call.patientSessionId && call.patientSessionId !== principal.sessionId) throw new ForbiddenException();
    if (reason && (patient || action !== 'end')) throw new ForbiddenException();
    const endReason = reason ?? (patient ? 'patient_ended' : 'staff_ended');
    const now = new Date();
    if (action === 'answer' || action === 'decline') {
      await this.chat.callAccess(principal, call.appointmentId);
      const update = await this.database.client.chatCall.updateMany({
        where: { id, status: 'RINGING', ringsUntil: { gt: now } },
        data: action === 'answer' ? { status: 'ACTIVE', patientSessionId: principal.sessionId, answeredAt: now } : { status: 'DECLINED', endedAt: now },
      });
      if (!update.count) throw new ConflictException('Call is no longer ringing');
    } else {
      await this.database.client.$transaction(async tx => {
        await tx.chatCall.updateMany({
          where: { id, status: 'RINGING' }, data: { status: patient ? 'DECLINED' : 'CANCELLED', endedAt: now, endReason },
        });
        await tx.chatCall.updateMany({
          where: { id, status: 'ACTIVE' }, data: { status: 'ENDED', endedAt: now, endReason },
        });
      });
    }
    const updated = await this.database.client.chatCall.findUniqueOrThrow({ where: { id } });
    await this.callChanged(updated);
    return this.view(updated);
  }

  async grant(principal: AccessTokenPrincipal, id: string) {
    const call = await this.current(await this.owned(principal, id));
    if (call.status !== 'ACTIVE') throw new ForbiddenException();
    if (call.patientUserId === principal.userId && call.patientSessionId !== principal.sessionId) throw new ForbiddenException();
    const expires = Date.now() + 45_000;
    for (const [key, grant] of this.grants) if (grant.expires <= Date.now()) this.grants.delete(key);
    const code = randomBytes(32).toString('base64url');
    this.grants.set(this.hash(code), { id, userId: principal.userId, expires });
    const url = new URL('/mushroom-call.html', process.env.CHAT_VIDEO_ORIGIN);
    url.searchParams.set('mode', call.mode);
    if (process.env.CHAT_VIDEO_ENABLED !== 'true' && chatVideoEnabled()) url.searchParams.set('relayOnly', 'true');
    url.hash = code;
    return { url: url.href };
  }

  async bridge(secret: string, body: { code?: string; callId?: string; userId?: string; action?: 'end' | 'connected' | 'lease' }) {
    const expected = process.env.CHAT_VIDEO_SECRET;
    if (!this.available || !expected || !timingSafeEqual(Buffer.from(this.hash(secret)), Buffer.from(this.hash(expected)))) throw new ForbiddenException();
    let callId = body.callId;
    let userId = body.userId;
    if (body.code) {
      const key = this.hash(body.code);
      const grant = this.grants.get(key);
      this.grants.delete(key);
      if (!grant || grant.expires <= Date.now()) throw new ForbiddenException();
      callId = grant.id;
      userId = grant.userId;
    }
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!callId || !uuid.test(callId) || !userId) throw new ForbiddenException();
    const record = await this.database.client.chatCall.findUnique({ where: { id: callId } });
    if (!record || ![record.callerUserId, record.patientUserId].includes(userId)) throw new ForbiddenException();
    const call = await this.current(record);
    if (call.status !== 'ACTIVE') throw new ForbiddenException({ code: 'CHAT_CALL_ENDED', details: { endReason: call.endReason } });
    if (body.action === 'lease') {
      const now = new Date();
      const field = call.callerUserId === userId ? 'callerLeaseAt' : 'patientLeaseAt';
      if (!call[field] || +now - +call[field] >= 25_000) {
        await this.database.client.chatCall.updateMany({
          where: { id: call.id, status: 'ACTIVE', OR: [
            { [field]: null }, { [field]: { lte: new Date(+now - 25_000) } },
          ] },
          data: { [field]: now },
        });
      }
      return { callId };
    }
    if (body.action === 'end') {
      const [ended] = await this.database.client.chatCall.updateManyAndReturn({
        where: { id: call.id, status: 'ACTIVE' },
        data: { status: 'ENDED', endedAt: new Date(), endReason: call.callerUserId === userId ? 'staff_ended' : 'patient_ended' },
      });
      if (ended) await this.callChanged(ended);
      return { ended: true };
    }
    if (body.action === 'connected') {
      const now = new Date();
      const field = call.callerUserId === userId ? 'callerConnectedAt' : 'patientConnectedAt';
      const result = await this.database.client.$transaction(async tx => {
        await tx.chatCall.updateMany({ where: { id: call.id, status: 'ACTIVE', [field]: null }, data: { [field]: now } });
        return tx.chatCall.updateManyAndReturn({
          where: { id: call.id, status: 'ACTIVE', connectedAt: null, callerConnectedAt: { not: null }, patientConnectedAt: { not: null } },
          data: { connectedAt: now },
        });
      });
      if (result[0]) await this.callChanged(result[0]);
      return { connected: true };
    }
    const turn = process.env.CHAT_TURN_SECRET;
    const iceServers = [];
    if (process.env.CHAT_STUN_URL) iceServers.push({ urls: process.env.CHAT_STUN_URL });
    if (turn && process.env.CHAT_TURN_URLS) {
      const username = Math.floor(Date.now() / 1000 + 3600) + ':' + callId;
      iceServers.push({ urls: process.env.CHAT_TURN_URLS.split(',').map(url => url.trim()), username, credential: createHmac('sha1', turn).update(username).digest('base64') });
    }
    return { callId, userId, mode: call.mode, iceServers };
  }

  private async callChanged(call: ChatCall) {
    this.outgoingChanges.next(call);
    if (call.endedAt) this.patientEndings.next(call);
    this.incomingChanges.next(call.patientUserId);
    const conversation = await this.database.client.chatConversation.findFirst({
      where: { appointmentId: call.appointmentId }, select: { id: true },
    });
    if (conversation) this.publisher.conversationChanged(conversation.id, 'call', call.id);
  }

  private hash(value: string) {
    return createHmac('sha256', process.env.CHAT_VIDEO_SECRET ?? '').update(value).digest('hex');
  }

  private async owned(principal: AccessTokenPrincipal, id: string) {
    if (!this.available) throw new ServiceUnavailableException();
    const call = await this.database.client.chatCall.findUnique({ where: { id } });
    if (!call) throw new ForbiddenException();
    if (call.callerUserId === principal.userId && call.callerSessionId === principal.sessionId) {
      await this.livePrincipal(principal.userId, principal.sessionId, call.callerKind);
      return call;
    }
    if (call.patientUserId !== principal.userId || (call.patientSessionId && call.patientSessionId !== principal.sessionId)) throw new ForbiddenException();
    await this.livePrincipal(principal.userId, principal.sessionId, 'PATIENT');
    return call;
  }

  private async current(call: ChatCall): Promise<ChatCall> {
    if (call.status === 'ACTIVE' && call.connectedAt && Date.now() - Math.min(+(call.callerLeaseAt ?? call.connectedAt), +(call.patientLeaseAt ?? call.connectedAt)) >= 90_000) {
      const now = new Date();
      const [ended] = await this.database.client.chatCall.updateManyAndReturn({
        where: { ...this.expiryRules(now)[2]!.where, id: call.id },
        data: { status: 'ENDED', endedAt: now, endReason: 'lease_expired' },
      });
      if (ended) { await this.callChanged(ended); return ended; }
      return this.database.client.chatCall.findUniqueOrThrow({ where: { id: call.id } });
    }
    const expired = call.status === 'RINGING' && call.ringsUntil.valueOf() <= Date.now();
    const failed = call.status === 'ACTIVE' && !call.connectedAt && call.answeredAt && Date.now() - call.answeredAt.valueOf() > 60_000;
    if (!['RINGING', 'ACTIVE'].includes(call.status)) return call;
    if (!expired && !failed) {
      try {
        const caller = await this.livePrincipal(call.callerUserId, call.callerSessionId, call.callerKind);
        const access = await this.chat.callAccess(caller, call.appointmentId);
        if (access.patientUserId !== call.patientUserId || access.actor.kind !== call.callerKind) throw new ForbiddenException();
        if (call.patientSessionId) {
          const patient = await this.livePrincipal(call.patientUserId, call.patientSessionId, 'PATIENT');
          await this.chat.callAccess(patient, call.appointmentId);
        }
        return call;
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error;
      }
    }
    const updated = await this.database.client.chatCall.updateMany({
      where: { id: call.id, status: call.status, ...(failed ? { connectedAt: null } : {}) }, data: { status: expired ? 'MISSED' : failed ? 'FAILED' : call.status === 'RINGING' ? 'CANCELLED' : 'ENDED', endedAt: new Date() },
    });
    const fresh = await this.database.client.chatCall.findUniqueOrThrow({ where: { id: call.id } });
    if (updated.count) await this.callChanged(fresh);
    return fresh;
  }

  private async livePrincipal(userId: string, sessionId: string, kind: ChatCall['callerKind']): Promise<AccessTokenPrincipal> {
    const role = kind === 'CLINIC_OPERATOR' ? 'ADMIN' : kind;
    const user = await this.main.user.findFirst({ where: {
      id: userId, status: 'ACTIVE', roles: { some: { role: { code: role } } },
      sessions: { some: { id: sessionId, revokedAt: null, expiresAt: { gt: new Date() } } },
    }, select: { id: true } });
    if (!user) throw new ForbiddenException();
    return { userId, sessionId, roles: [role], tokenId: '', issuedAt: 0, expiresAt: 0 };
  }

  private view(call: ChatCall) {
    const { id, appointmentId, callerName, callerKind, status, ringsUntil, mode, connectedAt, endedAt, endReason } = call;
    return { id, appointmentId, callerName, callerKind, status, ringsUntil, mode, connectedAt, endedAt, endReason };
  }
}
