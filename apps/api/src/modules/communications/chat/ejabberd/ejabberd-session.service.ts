import { ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AccessTokenPrincipal } from '../../../../common/auth/access-token.service';
import { isRoleCode, permissionsFor, PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ChatService } from '../chat.service';
import { ChatSocketRegistry } from '../realtime/chat-socket-registry';
import { ChatRealtimePublisher } from '../realtime/chat-realtime.publisher';
import { EjabberdApiClient } from './ejabberd-api.client';
import { EjabberdConfig } from './ejabberd.config';
import type { EjabberdPolicyDto, EjabberdSessionDto } from './ejabberd.dto';

const denied = () => new ForbiddenException({ code: 'CHAT_FORBIDDEN', message: 'The conversation is not available to this account.', details: {} });
const compact = (id: string) => id.replaceAll('-', '');
const uuid = (id: string) => `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

@Injectable()
export class EjabberdSessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EjabberdSessionService.name);
  private readonly leases = new Map<string, NodeJS.Timeout>();
  private readonly conversations = new Map<string, Set<string>>();
  constructor(
    private readonly config: EjabberdConfig,
    private readonly api: EjabberdApiClient,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly sockets: ChatSocketRegistry,
    private readonly publisher: ChatRealtimePublisher,
  ) {}

  onModuleInit() {
    this.publisher.bindEngineVisibility((conversationId, raw) => {
      if (!raw || typeof raw !== 'object') return;
      const event = raw as { id?: unknown; messageId?: unknown; visibility?: unknown };
      const id = event.id ?? event.messageId;
      if (typeof id !== 'string' || !['VISIBLE', 'RESTRICTED'].includes(String(event.visibility))) return;
      for (const [jid, conversations] of this.conversations) {
        if (conversations.has(conversationId)) void this.api.visibility(conversationId, jid, id, event.visibility as 'VISIBLE' | 'RESTRICTED')
          .catch(() => this.logger.warn('Chat visibility delivery deferred to reconciliation.'));
      }
    });
  }
  onModuleDestroy() {
    this.publisher.bindEngineVisibility(undefined);
    for (const timer of this.leases.values()) clearTimeout(timer);
    this.leases.clear(); this.conversations.clear();
  }

  async open(principal: AccessTokenPrincipal, appointmentId: string): Promise<EjabberdSessionDto> {
    this.config.assertReady();
    const conversation = await this.chat.appointmentConversation(principal, appointmentId);
    await this.chat.engineAccess(principal, conversation.id);
    const expires = Math.min(principal.expiresAt, Math.floor(Date.now() / 1000) + 300);
    const jid = `u${compact(principal.userId)}s${compact(principal.sessionId)}x${expires}n${randomBytes(8).toString('hex')}@${this.config.domain}`;
    const room = `c${compact(conversation.id)}`;
    await this.api.ensureRoom(room);
    await this.api.addMember(room, jid);
    // Re-check persisted identity after engine I/O, before returning credentials.
    const current = await this.principal(`${jid}/sabz`);
    const access = await this.chat.engineAccess(current, conversation.id);
    this.track(jid, current, conversation.id);
    return {
      transport: 'ejabberd', conversationId: conversation.id, appointmentId,
      websocketUrl: this.config.websocketUrl, jid, token: this.config.sign(jid, expires),
      resource: 'sabz', roomJid: `${room}@${this.config.conference}`,
      senderKind: access.senderKind, canSend: access.canSend, readOnlyReason: access.readOnlyReason, opensAt: access.opensAt, closedAt: access.closedAt, canClose: access.canClose, expiresAt: new Date(expires * 1000).toISOString(),
      historyUrl: `/v1/chat/conversations/${conversation.id}/messages`,
      visibilityUrl: `/v1/chat/conversations/${conversation.id}/visibility-reconciliation`,
    };
  }

  /** Called only by the authenticated fail-closed engine policy endpoint. */
  async authorize(input: EjabberdPolicyDto) {
    this.config.assertReady();
    // Also fences failed kicks, the three-connection cap and API restarts. A
    // valid JWT alone is insufficient after its tracked lease was released.
    if (!this.leases.has(input.actorJid.split('/')[0]!)) throw denied();
    const principal = await this.principal(input.actorJid);
    if (input.action === 'SESSION') return { allow: true };
    const conversationId = this.conversationId(input.roomJid);
    if (input.action === 'JOIN') {
      await this.chat.authorizeRealtimeSubscription(principal, conversationId);
      return { allow: true };
    }
    if (input.action === 'HISTORY') {
      await this.chat.engineAccess(principal, conversationId);
      return { allow: true };
    }
    if (input.action === 'SEND') {
      if (!permissionsFor(principal.roles).has(PERMISSIONS.CHAT_MESSAGE_SEND) || !input.clientMessageId || input.body === undefined) throw denied();
      const message = await this.chat.send(principal, conversationId, { clientMessageId: input.clientMessageId, body: input.body });
      return this.safeMessage({ ...message, clientMessageId: input.clientMessageId });
    }
    if (!input.messageId) throw denied();
    if (input.action === 'READ' || input.action === 'RECEIPT') {
      await this.chat.engineReceipt(principal, conversationId, input.messageId, input.action === 'READ');
      return { allow: true };
    }
    return this.safeMessage(await this.chat.engineMessage(principal, conversationId, input.messageId));
  }

  private safeMessage(message: Awaited<ReturnType<ChatService['engineMessage']>>) {
    return {
      allow: true, messageId: message.id, sequence: message.sequence, senderKind: message.senderKind,
      clientMessageId: message.clientMessageId,
      createdAt: message.createdAt.toISOString(), visibility: message.visibility,
      body: ('body' in message ? message.body : message.tombstone) ?? 'Conversation content has been restricted under policy.',
    };
  }

  private conversationId(roomJid?: string) {
    if (!roomJid) throw denied();
    const [local, domain, extra] = roomJid.split('@');
    if (extra !== undefined || domain !== this.config.conference || !/^c[0-9a-f]{32}$/u.test(local ?? '')) throw denied();
    return uuid(local!.slice(1));
  }

  private async principal(actorJid: string): Promise<AccessTokenPrincipal> {
    const match = /^u([0-9a-f]{32})s([0-9a-f]{32})x([0-9]{10})n[0-9a-f]{16}@([a-z0-9.-]+)\/sabz$/u.exec(actorJid);
    const expires = Number(match?.[3]);
    const now = Math.floor(Date.now() / 1000);
    if (!match || match[4] !== this.config.domain || expires <= now || expires > now + 600) throw denied();
    const userId = uuid(match[1]!); const sessionId = uuid(match[2]!);
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() }, user: { status: 'ACTIVE' } },
      select: { user: { select: { roles: { select: { role: { select: { code: true } } } } } } },
    });
    const roles = session?.user.roles.map(item => item.role.code).filter(isRoleCode) ?? [];
    if (!permissionsFor(roles).has(PERMISSIONS.CHAT_CONVERSATION_READ)) throw denied();
    return { userId, sessionId, roles, tokenId: sessionId, issuedAt: 0, expiresAt: expires };
  }

  private track(jid: string, principal: AccessTokenPrincipal, conversationId: string) {
    const id = `ejabberd:${jid}`;
    const previous = this.leases.get(jid); if (previous) clearTimeout(previous);
    const conversations = this.conversations.get(jid) ?? new Set<string>();
    conversations.add(conversationId); this.conversations.set(jid, conversations);
    this.sockets.register({ id, disconnect: () => {
      this.release(jid);
      // Current DB policy also fences every delivery; a failed kick cannot grant access.
      void this.api.disconnect(jid).catch(() => this.logger.warn('Chat engine session disconnect deferred.'));
    } }, principal.userId, principal.sessionId);
    const timer = setTimeout(() => {
      this.release(jid);
      void this.api.disconnect(jid).catch(() => this.logger.warn('Chat engine lease disconnect deferred.'));
    }, Math.max(1, principal.expiresAt * 1000 - Date.now()));
    timer.unref(); this.leases.set(jid, timer);
  }

  private release(jid: string) {
    const timer = this.leases.get(jid); if (timer) clearTimeout(timer);
    for (const conversationId of this.conversations.get(jid) ?? []) {
      void this.api.removeMember(`c${compact(conversationId)}`, jid)
        .catch(() => this.logger.warn('Expired chat membership cleanup requires retry.'));
    }
    this.leases.delete(jid); this.conversations.delete(jid); this.sockets.unregister(`ejabberd:${jid}`);
  }
}
