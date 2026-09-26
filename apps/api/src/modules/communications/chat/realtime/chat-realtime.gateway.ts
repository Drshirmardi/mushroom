import { UnauthorizedException } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { AccessTokenService, type AccessTokenPrincipal } from '../../../../common/auth/access-token.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import type { Prisma } from '../../../../generated/prisma/client';
import { ChatService } from '../chat.service';
import { ChatRealtimePublisher } from './chat-realtime.publisher';
import { ChatSocketRegistry } from './chat-socket-registry';

type JoinRequest = { conversationId?: string; lastSequence?: string };
type ReceiptRequest = { conversationId?: string; lastDeliveredSequence?: string; lastReadSequence?: string };
type PresenceRequest = { conversationId?: string; lastSequence?: string };
type RealtimeSocket = Socket & { data: { chatPrincipal?: AccessTokenPrincipal; expiryTimer?: NodeJS.Timeout } };

@WebSocketGateway({ namespace: '/chat', transports: ['websocket'] })
export class ChatRealtimeGateway {
  @WebSocketServer() server!: Server;
  private readonly presenceLeases = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly tokens: AccessTokenService,
    private readonly chat: ChatService,
    private readonly publisher: ChatRealtimePublisher,
    private readonly sockets: ChatSocketRegistry,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.publisher.bind(server);
    server.use((client, next) => {
      void this.authenticate(client as RealtimeSocket)
        .then(() => next())
        .catch(() => next(new Error('CHAT_UNAUTHORIZED')));
    });
  }

  handleConnection(client: RealtimeSocket) {
    if (!client.data.chatPrincipal) client.disconnect(true);
  }

  handleDisconnect(client: RealtimeSocket) {
    if (client.data.expiryTimer) clearTimeout(client.data.expiryTimer);
    const userId = client.data.chatPrincipal?.userId;
    this.sockets.unregister(client.id);
    for (const [key, lease] of this.presenceLeases) {
      if (!key.endsWith(`:${client.id}`)) continue;
      clearTimeout(lease);
      this.presenceLeases.delete(key);
      const conversationId = key.slice(0, -(client.id.length + 1));
      if (userId) client.to(`conversation:${conversationId}`).emit('presence:updated', { userId, state: 'OFFLINE' });
    }
  }

  @SubscribeMessage('conversation:join')
  async join(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: JoinRequest) {
    const principal = client.data.chatPrincipal;
    if (!principal || typeof input?.conversationId !== 'string') return { ok: false, code: 'CHAT_FORBIDDEN' };
    try {
      const room = `conversation:${input.conversationId}`;
      await this.chat.authorizeRealtimeSubscription(principal, input.conversationId);
      await client.join(room);
      let sync;
      try { sync = await this.chat.realtimeSync(principal, input.conversationId, this.sequence(input.lastSequence)); }
      catch (error) { await client.leave(room); throw error; }
      this.renewPresence(client, input.conversationId);
      return { ok: true, ...sync };
    } catch { this.revoke(client); return { ok: false, code: 'CHAT_FORBIDDEN' }; }
  }

  @SubscribeMessage('conversation:sync')
  async sync(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: JoinRequest) {
    const principal = client.data.chatPrincipal;
    if (!principal || typeof input?.conversationId !== 'string') return { ok: false, code: 'CHAT_FORBIDDEN' };
    try { return { ok: true, ...(await this.chat.realtimeSync(principal, input.conversationId, this.sequence(input.lastSequence))) }; }
    catch { this.revoke(client); return { ok: false, code: 'CHAT_FORBIDDEN' }; }
  }

  @SubscribeMessage('receipt:ack')
  async receipt(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: ReceiptRequest) {
    const principal = client.data.chatPrincipal;
    if (!principal || typeof input?.conversationId !== 'string') return { ok: false, code: 'CHAT_FORBIDDEN' };
    try {
      return { ok: true, ...(await this.chat.acknowledgeReceipt(principal, input.conversationId, this.sequence(input.lastDeliveredSequence), this.sequence(input.lastReadSequence))) };
    } catch { this.revoke(client); return { ok: false, code: 'CHAT_FORBIDDEN' }; }
  }

  @SubscribeMessage('presence:heartbeat')
  async heartbeat(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: PresenceRequest) {
    const principal = client.data.chatPrincipal;
    if (!principal || typeof input?.conversationId !== 'string') return { ok: false, code: 'CHAT_FORBIDDEN' };
    try { await this.chat.realtimeSync(principal, input.conversationId, this.sequence(input.lastSequence)); this.renewPresence(client, input.conversationId); return { ok: true, leaseSeconds: 45 }; }
    catch { this.revoke(client); return { ok: false, code: 'CHAT_FORBIDDEN' }; }
  }

  private sequence(value: unknown) { if (value === undefined) return 0n; if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('invalid sequence'); return BigInt(value); }

  /**
   * The share lock serializes admission with every session revocation update.
   * The transaction retains it through registry registration: a revocation
   * therefore either observes the registered socket and evicts it after its
   * commit, or commits first and causes this handshake to fail closed.
   */
  private async assertActiveSession(principal: AccessTokenPrincipal, prisma: Pick<Prisma.TransactionClient, '$queryRaw'> = this.prisma) {
    const sessions = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "sessions"
      WHERE "id" = ${principal.sessionId}::uuid
        AND "user_id" = ${principal.userId}::uuid
        AND "revoked_at" IS NULL
        AND "expires_at" > CURRENT_TIMESTAMP
      FOR SHARE
    `;
    if (!sessions[0]) throw new UnauthorizedException();
  }

  private async authenticate(client: RealtimeSocket): Promise<AccessTokenPrincipal> {
    if (Object.keys(client.handshake.query).some((key) => /token|auth/i.test(key))) throw new UnauthorizedException();
    const token = client.handshake.auth?.token;
    if (typeof token !== 'string') throw new UnauthorizedException();
    const principal = await this.tokens.verify(token);
    try {
      await this.prisma.$transaction(async (transaction) => {
        const users = await transaction.$queryRaw<{ id: string; status: 'ACTIVE' | 'DISABLED' }[]>`
          SELECT "id", "status"
          FROM "users"
          WHERE "id" = ${principal.userId}::uuid
          FOR SHARE
        `;
        if (users[0]?.status !== 'ACTIVE') throw new UnauthorizedException();
        await this.assertActiveSession(principal, transaction);
        client.data.chatPrincipal = principal;
        // Registration occurs while the user row lock is held. A concurrent durable
        // deactivation must either be observed above or wait and evict this socket.
        this.register(client, principal);
      });
    } catch (error) {
      clearTimeout(client.data.expiryTimer);
      this.sockets.unregister(client.id);
      delete client.data.chatPrincipal;
      throw error;
    }
    return principal;
  }

  /** Register only after all persisted identity checks, while middleware still blocks event dispatch. */
  private register(client: RealtimeSocket, principal: AccessTokenPrincipal) {
    this.sockets.register(client, principal.userId, principal.sessionId);
    client.data.expiryTimer = setTimeout(() => client.disconnect(true), Math.max(0, principal.expiresAt * 1000 + 5000 - Date.now()));
  }

  /** Current authorization loss invalidates every protected room on this socket before another room fan-out can reach it. */
  private revoke(client: RealtimeSocket) { client.disconnect(true); }

  private renewPresence(client: RealtimeSocket, conversationId: string) {
    const principal = client.data.chatPrincipal!; const key = `${conversationId}:${client.id}`;
    const previous = this.presenceLeases.get(key); if (previous) clearTimeout(previous);
    client.to(`conversation:${conversationId}`).emit('presence:updated', { userId: principal.userId, state: 'ONLINE' });
    this.presenceLeases.set(key, setTimeout(() => { this.presenceLeases.delete(key); client.to(`conversation:${conversationId}`).emit('presence:updated', { userId: principal.userId, state: 'OFFLINE' }); }, 45_000));
  }
}
