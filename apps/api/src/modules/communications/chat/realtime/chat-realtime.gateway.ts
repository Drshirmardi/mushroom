import { UnauthorizedException } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { AccessTokenService, type AccessTokenPrincipal } from '../../../../common/auth/access-token.service';
import { ChatService } from '../chat.service';
import { ChatRealtimePublisher } from './chat-realtime.publisher';

type JoinRequest = { conversationId?: string; lastSequence?: string };
type ReceiptRequest = { conversationId?: string; lastDeliveredSequence?: string; lastReadSequence?: string };
type RealtimeSocket = Socket & { data: { chatPrincipal?: AccessTokenPrincipal; expiryTimer?: NodeJS.Timeout } };

@WebSocketGateway({ namespace: '/chat', transports: ['websocket'] })
export class ChatRealtimeGateway {
  @WebSocketServer() server!: Server;
  private readonly socketsByUser = new Map<string, Set<string>>();

  constructor(private readonly tokens: AccessTokenService, private readonly chat: ChatService, private readonly publisher: ChatRealtimePublisher) {}

  afterInit(server: Server) { this.publisher.bind(server); }

  async handleConnection(client: RealtimeSocket) {
    try {
      if (Object.keys(client.handshake.query).some((key) => /token|auth/i.test(key))) throw new UnauthorizedException();
      const token = client.handshake.auth?.token;
      if (typeof token !== 'string') throw new UnauthorizedException();
      const principal = await this.tokens.verify(token);
      client.data.chatPrincipal = principal;
      const sockets = this.socketsByUser.get(principal.userId) ?? new Set<string>();
      sockets.add(client.id); this.socketsByUser.set(principal.userId, sockets);
      if (sockets.size > 3) {
        const oldest = sockets.values().next().value as string;
        sockets.delete(oldest); this.server.sockets.sockets.get(oldest)?.disconnect(true);
      }
      client.data.expiryTimer = setTimeout(() => client.disconnect(true), Math.max(0, principal.expiresAt * 1000 + 5000 - Date.now()));
    } catch { client.disconnect(true); }
  }

  handleDisconnect(client: RealtimeSocket) {
    if (client.data.expiryTimer) clearTimeout(client.data.expiryTimer);
    const userId = client.data.chatPrincipal?.userId;
    const sockets = userId ? this.socketsByUser.get(userId) : undefined;
    sockets?.delete(client.id); if (sockets?.size === 0 && userId) this.socketsByUser.delete(userId);
  }

  @SubscribeMessage('conversation:join')
  async join(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: JoinRequest) {
    const principal = client.data.chatPrincipal;
    if (!principal || typeof input?.conversationId !== 'string') return { ok: false, code: 'CHAT_FORBIDDEN' };
    try {
      const sync = await this.chat.realtimeSync(principal, input.conversationId, this.sequence(input.lastSequence));
      await client.join(`conversation:${input.conversationId}`);
      return { ok: true, ...sync };
    } catch { return { ok: false, code: 'CHAT_FORBIDDEN' }; }
  }

  @SubscribeMessage('conversation:sync')
  async sync(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: JoinRequest) {
    const principal = client.data.chatPrincipal;
    if (!principal || typeof input?.conversationId !== 'string') return { ok: false, code: 'CHAT_FORBIDDEN' };
    try { return { ok: true, ...(await this.chat.realtimeSync(principal, input.conversationId, this.sequence(input.lastSequence))) }; }
    catch { return { ok: false, code: 'CHAT_FORBIDDEN' }; }
  }

  @SubscribeMessage('receipt:ack')
  async receipt(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: ReceiptRequest) {
    const principal = client.data.chatPrincipal;
    if (!principal || typeof input?.conversationId !== 'string') return { ok: false, code: 'CHAT_FORBIDDEN' };
    try {
      return { ok: true, ...(await this.chat.acknowledgeReceipt(principal, input.conversationId, this.sequence(input.lastDeliveredSequence), this.sequence(input.lastReadSequence))) };
    } catch { return { ok: false, code: 'CHAT_FORBIDDEN' }; }
  }

  private sequence(value: unknown) { if (value === undefined) return 0n; if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('invalid sequence'); return BigInt(value); }
}
