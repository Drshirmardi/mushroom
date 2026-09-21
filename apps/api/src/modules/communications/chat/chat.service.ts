import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

import {
  AppointmentStatus,
  ChatAuditAction,
  ChatBlockScope,
  ChatBlockStatus,
  ChatMessageModerationActionType,
  ChatMessageVisibility,
  ChatParticipantKind,
  ChatReportResolution,
  ChatReportResolutionAction,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { AccessTokenPrincipal } from '../../../common/auth/access-token.service';
import type {
  ChangeChatVisibilityDto,
  CreateChatReportDto,
  ResolveChatReportDto,
  SendChatMessageDto,
} from './chat.dto';
import { ChatRealtimePublisher } from './realtime/chat-realtime.publisher';

type Db = PrismaService | Prisma.TransactionClient;
type ChatActor = { userId: string; kind: ChatParticipantKind; isAdmin: boolean };
type Conversation = Awaited<ReturnType<ChatService['conversation']>>;
/**
 * The post-commit fact consumed by realtime delivery. It intentionally has no
 * message body: a visibility transition must be safe even if it is delivered
 * to a stale client or written to transport diagnostics.
 */
type RestrictedMessageTransition = {
  conversationId: string;
  message: {
    id: string;
    sequence: string;
    senderKind: ChatParticipantKind;
    createdAt: Date;
    visibility: 'RESTRICTED';
    restrictedReasonCategory: string;
    tombstone: string;
  };
};

type VisibilityTransition = {
  conversationId: string;
  messageId: string;
  sequence: string;
  visibility: 'RESTRICTED' | 'VISIBLE';
};

const forbidden = () => new ForbiddenException({ code: 'CHAT_FORBIDDEN', message: 'The conversation is not available to this account.', details: {} });
const moderationForbidden = () => new ForbiddenException({ code: 'CHAT_MODERATION_FORBIDDEN', message: 'Moderation access is not available to this account.', details: {} });
const ineligible = () => new ForbiddenException({ code: 'CHAT_APPOINTMENT_NOT_ELIGIBLE', message: 'The appointment is not eligible for chat activity.', details: {} });
const closed = () => new ForbiddenException({ code: 'CHAT_WINDOW_CLOSED', message: 'The chat window is closed for new messages.', details: {} });
const blocked = () => new ForbiddenException({ code: 'CHAT_BLOCKED', message: 'A conversation-scoped block prevents this message.', details: {} });
const idempotencyConflict = () => new ConflictException({ code: 'CHAT_IDEMPOTENCY_CONFLICT', message: 'The client message id was already used with a different payload.', details: {} });
const cursorInvalid = () => new BadRequestException({ code: 'CHAT_CURSOR_INVALID', message: 'The chat cursor is invalid.', details: {} });
const cursorForbidden = () => new ForbiddenException({ code: 'CHAT_CURSOR_FORBIDDEN', message: 'The chat cursor cannot be used for this conversation.', details: {} });
const tooLong = () => new BadRequestException({ code: 'CHAT_MESSAGE_TOO_LONG', message: 'A text message must contain at most 4000 Unicode characters.', details: {} });
const rateLimited = () => new HttpException({ code: 'CHAT_RATE_LIMITED', message: 'The chat message rate limit was reached.', details: {} }, HttpStatus.TOO_MANY_REQUESTS);

const TERMINAL = new Set<AppointmentStatus>([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW]);
const OPERATIONAL = new Set<AppointmentStatus>([AppointmentStatus.CHECKED_IN, AppointmentStatus.QUEUED, AppointmentStatus.IN_PROGRESS]);
const ACTIVE_BLOCKS = [ChatBlockStatus.PENDING_REVIEW, ChatBlockStatus.CONFIRMED];

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly publisher: ChatRealtimePublisher) {}

  async appointmentConversation(principal: AccessTokenPrincipal, appointmentId: string) {
    const appointment = await this.appointment(appointmentId);
    const actor = await this.actorFor(principal, appointment);
    const conversation = await this.ensureConversation(appointment, actor);
    return this.conversationResponse(conversation);
  }

  /**
   * Returns only the current, server-evaluated readiness for an appointment-bound
   * text consultation. This deliberately does not create a clinical session or
   * change any Appointment/Encounter state.
   */
  async waitingRoom(principal: AccessTokenPrincipal, appointmentId: string) {
    const appointment = await this.appointment(appointmentId);
    const actor = await this.actorFor(principal, appointment);
    this.assertSendEligibility(appointment);
    const conversation = await this.ensureConversation(appointment, actor);
    return {
      appointmentId: appointment.id,
      conversationId: conversation.id,
      heartbeatSeconds: 15,
      leaseSeconds: 45,
    };
  }

  async history(principal: AccessTokenPrincipal, conversationId: string, cursorRaw?: string, limit = 50) {
    const conversation = await this.conversation(conversationId);
    const actor = await this.actorFor(principal, conversation.appointment);
    const cursor = cursorRaw ? this.parseCursor(cursorRaw, conversation.id) : 0n;
    const records = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id, clinicId: conversation.clinicId, sequence: { gt: cursor } },
      orderBy: { sequence: 'asc' }, take: limit + 1,
    });
    const hasMore = records.length > limit;
    const items = records.slice(0, limit);
    const highWater = await this.prisma.chatMessage.aggregate({ where: { conversationId: conversation.id }, _max: { sequence: true } });
    return {
      items: items.map((message) => this.messageResponse(message)),
      nextCursor: hasMore && items.length ? this.cursor(conversation.id, items.at(-1)!.sequence) : null,
      highWaterSequence: String(highWater._max.sequence ?? 0n),
    };
  }

  async realtimeSync(principal: AccessTokenPrincipal, conversationId: string, lastSequence = 0n, limit = 100) {
    const conversation = await this.conversation(conversationId);
    await this.actorFor(principal, conversation.appointment);
    this.assertSendEligibility(conversation.appointment);
    const highWater = await this.prisma.chatMessage.aggregate({ where: { conversationId: conversation.id }, _max: { sequence: true } });
    const highWaterSequence = highWater._max.sequence ?? 0n;
    const records = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id, sequence: { gt: lastSequence, lte: highWaterSequence } },
      orderBy: { sequence: 'asc' }, take: limit + 1,
    });
    const items = records.slice(0, limit);
    return {
      items: items.map((message) => this.messageResponse(message)),
      nextCursor: records.length > limit && items.length ? this.cursor(conversation.id, items.at(-1)!.sequence) : null,
      highWaterSequence: String(highWaterSequence),
    };
  }

  async authorizeRealtimeSubscription(principal: AccessTokenPrincipal, conversationId: string) {
    const conversation = await this.conversation(conversationId);
    await this.actorFor(principal, conversation.appointment);
    this.assertSendEligibility(conversation.appointment);
  }

  async acknowledgeReceipt(principal: AccessTokenPrincipal, conversationId: string, delivered: bigint, read: bigint) {
    if (delivered < 0n || read < 0n || read > delivered) throw new BadRequestException({ code: 'CHAT_SEQUENCE_INVALID', message: 'Receipt high-water marks are invalid.', details: {} });
    const receipt = await this.prisma.$transaction(async (tx) => {
      const conversation = await this.conversation(conversationId, tx);
      const actor = await this.actorFor(principal, conversation.appointment, tx);
      this.assertSendEligibility(conversation.appointment);
      const max = await tx.chatMessage.aggregate({ where: { conversationId }, _max: { sequence: true } });
      if (delivered > (max._max.sequence ?? 0n)) throw new BadRequestException({ code: 'CHAT_SEQUENCE_INVALID', message: 'Receipt exceeds committed history.', details: {} });
      const existing = await tx.chatReceipt.findUnique({ where: { conversationId_userId: { conversationId, userId: actor.userId } } });
      const nextDelivered = existing && existing.lastDeliveredSequence > delivered ? existing.lastDeliveredSequence : delivered;
      const nextRead = existing && existing.lastReadSequence > read ? existing.lastReadSequence : read;
      return tx.chatReceipt.upsert({ where: { conversationId_userId: { conversationId, userId: actor.userId } }, create: { clinicId: conversation.clinicId, conversationId, userId: actor.userId, lastDeliveredSequence: nextDelivered, lastReadSequence: nextRead }, update: { lastDeliveredSequence: nextDelivered, lastReadSequence: nextRead } });
    });
    const response = { userId: receipt.userId, lastDeliveredSequence: String(receipt.lastDeliveredSequence), lastReadSequence: String(receipt.lastReadSequence) };
    this.publisher.receiptUpdated(conversationId, response);
    return response;
  }

  /**
   * PostgreSQL-authoritative recovery for moderation state changes whose message
   * sequence is intentionally immutable. Socket.IO may signal this work, but a
   * reconnect always recovers it from the immutable moderation-action ledger.
   */
  async visibilityReconciliation(principal: AccessTokenPrincipal, conversationId: string, cursorRaw?: string, limit = 50) {
    const conversation = await this.conversation(conversationId);
    await this.actorFor(principal, conversation.appointment);
    const cursor = cursorRaw ? this.parseVisibilityCursor(cursorRaw, conversation.id) : null;
    const transitionWhere = { conversationId: conversation.id, action: { in: [ChatMessageModerationActionType.RESTRICT_MESSAGE, ChatMessageModerationActionType.RESTORE_MESSAGE] } };
    const highWater = await this.prisma.chatMessageModerationAction.findFirst({ where: transitionWhere, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, createdAt: true } });
    if (!highWater) return { items: [], nextCursor: null, checkpointCursor: cursorRaw ?? null, highWaterRevision: null };
    const afterCursor = cursor ? {
      OR: [
        { createdAt: { gt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { gt: cursor.id } },
      ],
    } : {};
    const throughHighWater = {
      OR: [
        { createdAt: { lt: highWater.createdAt } },
        { createdAt: highWater.createdAt, id: { lte: highWater.id } },
      ],
    };
    const records = await this.prisma.chatMessageModerationAction.findMany({
      where: { ...transitionWhere, AND: [afterCursor, throughHighWater] },
      include: { message: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const items = records.slice(0, limit);
    return {
      items: items.map((action) => ({ revision: action.id, message: this.messageResponse(action.message) })),
      nextCursor: records.length > limit && items.length ? this.visibilityCursor(conversation.id, items.at(-1)!) : null,
      checkpointCursor: items.length ? this.visibilityCursor(conversation.id, items.at(-1)!) : cursorRaw ?? null,
      highWaterRevision: highWater.id,
    };
  }

  async send(principal: AccessTokenPrincipal, conversationId: string, input: SendChatMessageDto) {
    const body = input.body.normalize('NFC').trim();
    if (!body) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'A text message cannot be empty.', details: {} });
    if (Array.from(body).length > 4_000) throw tooLong();
    const requestPayloadHash = createHash('sha256').update(JSON.stringify({ body })).digest('hex');

    const outcome = await this.prisma.$transaction(async (tx) => {
      const conversation = await this.conversation(conversationId, tx);
      const actor = await this.actorFor(principal, conversation.appointment, tx);
      await this.lock(tx, `chat:user:${actor.userId}`);
      await this.lock(tx, `chat:conversation:${conversation.id}`);
      const existing = await tx.chatMessage.findUnique({ where: { conversationId_senderUserId_clientMessageId: { conversationId: conversation.id, senderUserId: actor.userId, clientMessageId: input.clientMessageId } } });
      if (existing) {
        if (existing.requestPayloadHash !== requestPayloadHash) throw idempotencyConflict();
        return { message: this.messageResponse(existing), committed: false, conversationId: conversation.id };
      }
      this.assertSendEligibility(conversation.appointment);
      await this.assertNotBlocked(tx, conversation, actor);
      await this.assertRate(tx, conversation.id, actor.userId);
      await tx.chatConversationParticipant.upsert({
        where: { conversationId_userId_kind: { conversationId: conversation.id, userId: actor.userId, kind: actor.kind } },
        create: { clinicId: conversation.clinicId, conversationId: conversation.id, userId: actor.userId, kind: actor.kind },
        update: {},
      });
      const last = await tx.chatMessage.aggregate({ where: { conversationId: conversation.id }, _max: { sequence: true } });
      const message = await tx.chatMessage.create({ data: {
        clinicId: conversation.clinicId, conversationId: conversation.id, sequence: (last._max.sequence ?? 0n) + 1n,
        senderUserId: actor.userId, senderKind: actor.kind, clientMessageId: input.clientMessageId, requestPayloadHash, body,
      } });
      await this.audit(tx, conversation, actor.userId, ChatAuditAction.MESSAGE_CREATED, 'MESSAGE', message.id);
      await tx.outboxEvent.upsert({
        where: { idempotencyKey: `chat-message:${message.id}` },
        create: {
          eventType: 'CHAT_MESSAGE_COMMITTED', aggregateType: 'CHAT_CONVERSATION', aggregateId: conversation.id,
          idempotencyKey: `chat-message:${message.id}`,
          payload: { conversationId: conversation.id, messageId: message.id, clinicId: conversation.clinicId },
        }, update: {},
      });
      return { message: this.messageResponse(message), committed: true, conversationId: conversation.id };
    }, { maxWait: 30_000, timeout: 30_000 });
    if (outcome.committed) this.publisher.messageCommitted(outcome.conversationId, outcome.message);
    return outcome.message;
  }

  async report(principal: AccessTokenPrincipal, messageId: string, input: CreateChatReportDto) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.findUnique({ where: { id: messageId } });
      if (!message) throw forbidden();
      const conversation = await this.conversation(message.conversationId, tx);
      const actor = await this.actorFor(principal, conversation.appointment, tx);
      if (!actor.isAdmin && message.senderUserId === actor.userId) throw moderationForbidden();
      if (!actor.isAdmin && !this.canReport(actor.kind, message.senderKind)) throw moderationForbidden();
      const existing = await tx.chatModerationReport.findUnique({ where: { messageId_reporterUserId: { messageId: message.id, reporterUserId: actor.userId } } });
      const report = existing ?? await tx.chatModerationReport.create({ data: { clinicId: conversation.clinicId, conversationId: conversation.id, messageId: message.id, reporterUserId: actor.userId, reasonCategory: input.reasonCategory, reporterNote: this.safeNote(input.reporterNote) } });
      if (!existing) await this.audit(tx, conversation, actor.userId, ChatAuditAction.REPORT_CREATED, 'REPORT', report.id, input.reasonCategory);
      if (!existing && input.requestImmediateBlock) {
        const scope = this.reportBlockScope(actor, message.senderKind, input.blockScope);
        await this.requestBlock(tx, conversation, actor.userId, scope, input.reasonCategory);
      }
      return { id: report.id, messageId: report.messageId, reasonCategory: report.reasonCategory, createdAt: report.createdAt };
    });
  }

  async reports(principal: AccessTokenPrincipal, conversationId: string) {
    const conversation = await this.conversation(conversationId);
    const actor = await this.actorFor(principal, conversation.appointment);
    const where = actor.isAdmin ? { conversationId } : { conversationId, reporterUserId: actor.userId };
    const reports = await this.prisma.chatModerationReport.findMany({ where, include: { decision: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    return { items: reports.map((report) => ({ id: report.id, messageId: report.messageId, reasonCategory: report.reasonCategory, createdAt: report.createdAt, decision: report.decision ? { resolution: report.decision.resolution, action: report.decision.action, decidedAt: report.decision.decidedAt } : null })) };
  }

  async changeVisibility(principal: AccessTokenPrincipal, messageId: string, input: ChangeChatVisibilityDto) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.findUnique({ where: { id: messageId } });
      if (!message) throw moderationForbidden();
      const conversation = await this.conversation(message.conversationId, tx);
      const actor = await this.actorFor(principal, conversation.appointment, tx);
      if (!actor.isAdmin) throw moderationForbidden();
      if (input.visibility === 'RESTRICTED' && !input.reasonCategory) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'A restriction reason is required.', details: {} });
      if (input.reasonCategory === 'OTHER' && !this.safeNote(input.safeNote)) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'A non-sensitive note is required for OTHER.', details: {} });
      if ((input.visibility === 'RESTRICTED' && message.visibility === ChatMessageVisibility.RESTRICTED && message.restrictedReasonCategory === input.reasonCategory) || input.visibility === 'VISIBLE' && message.visibility === ChatMessageVisibility.VISIBLE) return { response: this.messageResponse(message), restrictedTransition: null, visibilityTransition: null };
      if (input.visibility === 'RESTRICTED') {
        const restricted = await this.restrictMessage(tx, conversation, message, actor.userId, input.reasonCategory!, this.safeNote(input.safeNote));
        return { response: this.messageResponse(restricted.message), restrictedTransition: restricted.transition, visibilityTransition: this.visibilityTransition(conversation, restricted.message) };
      }
      const updated = await tx.chatMessage.update({ where: { id: message.id }, data: { visibility: ChatMessageVisibility.VISIBLE, restrictedReasonCategory: null, restrictedAt: null } });
      await tx.chatMessageModerationAction.create({ data: { clinicId: conversation.clinicId, conversationId: conversation.id, messageId: message.id, actorUserId: actor.userId, action: ChatMessageModerationActionType.RESTORE_MESSAGE, reasonCategory: null, safeNote: this.safeNote(input.safeNote) } });
      await this.audit(tx, conversation, actor.userId, ChatAuditAction.MESSAGE_RESTORED, 'MESSAGE', message.id);
      return { response: this.messageResponse(updated), restrictedTransition: null, visibilityTransition: this.visibilityTransition(conversation, updated) };
    });
    if (outcome.restrictedTransition) this.publisher.messageVisibilityChanged(outcome.restrictedTransition.conversationId, outcome.restrictedTransition.message);
    else if (outcome.visibilityTransition) this.publisher.messageVisibilityChanged(outcome.visibilityTransition.conversationId, outcome.visibilityTransition);
    return outcome.response;
  }

  async restrictedContent(principal: AccessTokenPrincipal, messageId: string) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.findUnique({ where: { id: messageId } });
      if (!message) throw moderationForbidden();
      const conversation = await this.conversation(message.conversationId, tx);
      const actor = await this.actorFor(principal, conversation.appointment, tx);
      if (!actor.isAdmin || message.visibility !== ChatMessageVisibility.RESTRICTED) throw moderationForbidden();
      await this.audit(tx, conversation, actor.userId, ChatAuditAction.RESTRICTED_CONTENT_REVIEWED, 'MESSAGE', message.id, message.restrictedReasonCategory ?? undefined);
      return { id: message.id, body: message.body, sequence: String(message.sequence), restrictedReasonCategory: message.restrictedReasonCategory };
    });
  }

  async resolveReport(principal: AccessTokenPrincipal, reportId: string, input: ResolveChatReportDto) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const report = await tx.chatModerationReport.findUnique({ where: { id: reportId }, include: { message: true } });
      if (!report) throw moderationForbidden();
      const conversation = await this.conversation(report.conversationId, tx);
      const actor = await this.actorFor(principal, conversation.appointment, tx);
      if (!actor.isAdmin) throw moderationForbidden();
      this.assertResolutionCompatible(input);
      const existing = await tx.chatModerationReportDecision.findUnique({ where: { reportId: report.id } });
      if (existing) {
        if (existing.resolution !== input.resolution || existing.action !== input.action) throw idempotencyConflict();
        return { response: { id: existing.id, resolution: existing.resolution, action: existing.action, decidedAt: existing.decidedAt }, restrictedTransition: null };
      }
      const decision = await tx.chatModerationReportDecision.create({ data: { clinicId: conversation.clinicId, reportId: report.id, actorUserId: actor.userId, resolution: input.resolution, action: input.action, safeNote: this.safeNote(input.safeNote) } });
      const restrictedTransition = await this.applyResolutionAction(tx, conversation, report, actor.userId, input);
      await this.audit(tx, conversation, actor.userId, ChatAuditAction.REPORT_RESOLVED, 'REPORT', report.id, input.resolution);
      return { response: { id: decision.id, resolution: decision.resolution, action: decision.action, decidedAt: decision.decidedAt }, restrictedTransition };
    });
    if (outcome.restrictedTransition) this.publisher.messageVisibilityChanged(outcome.restrictedTransition.conversationId, outcome.restrictedTransition.message);
    return outcome.response;
  }

  private async ensureConversation(appointment: Awaited<ReturnType<ChatService['appointment']>>, actor: ChatActor) {
    const existing = await this.prisma.chatConversation.findUnique({ where: { appointmentId: appointment.id } });
    if (existing) return existing;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.chatConversation.findUnique({ where: { appointmentId: appointment.id } });
        if (current) return current;
        const created = await tx.chatConversation.create({ data: { clinicId: appointment.clinicId, appointmentId: appointment.id, patientId: appointment.patientId, doctorId: appointment.doctorId } });
        await tx.chatConversationParticipant.create({ data: { clinicId: created.clinicId, conversationId: created.id, userId: appointment.patient.userId, kind: ChatParticipantKind.PATIENT } });
        if (appointment.doctor.userId) await tx.chatConversationParticipant.create({ data: { clinicId: created.clinicId, conversationId: created.id, userId: appointment.doctor.userId, kind: ChatParticipantKind.DOCTOR } });
        await this.audit(tx, created, actor.userId, ChatAuditAction.MESSAGE_CREATED, 'CONVERSATION', created.id, 'CONVERSATION_CREATED');
        return created;
      });
    } catch (error) {
      const raced = await this.prisma.chatConversation.findUnique({ where: { appointmentId: appointment.id } });
      if (raced) return raced;
      throw error;
    }
  }

  private async appointment(id: string, tx: Db = this.prisma) {
    const appointment = await tx.appointment.findUnique({ where: { id }, include: { clinic: { select: { status: true } }, doctorService: { select: { visitMode: true } }, patient: { select: { userId: true } }, doctor: { select: { userId: true } } } });
    if (!appointment || appointment.clinic.status !== 'ACTIVE' || appointment.doctorService.visitMode !== 'ONLINE') throw forbidden();
    return appointment;
  }

  private async conversation(id: string, tx: Db = this.prisma) {
    const conversation = await tx.chatConversation.findUnique({ where: { id }, include: { appointment: { include: { clinic: { select: { status: true } }, doctorService: { select: { visitMode: true } }, patient: { select: { userId: true } }, doctor: { select: { userId: true } } } } } });
    if (!conversation || conversation.appointment.clinic.status !== 'ACTIVE' || conversation.appointment.doctorService.visitMode !== 'ONLINE') throw forbidden();
    return conversation;
  }

  private async actorFor(principal: AccessTokenPrincipal, appointment: Awaited<ReturnType<ChatService['appointment']>>, tx: Db = this.prisma): Promise<ChatActor> {
    const active = await tx.user.findFirst({ where: { id: principal.userId, status: 'ACTIVE' }, select: { id: true } });
    if (!active) throw forbidden();
    if (principal.roles.includes('ADMIN')) {
      const clinicAccess = await tx.clinicalClinicAccess.findFirst({ where: { userId: principal.userId, clinicId: appointment.clinicId }, select: { userId: true } });
      if (clinicAccess) return { userId: principal.userId, kind: ChatParticipantKind.CLINIC_OPERATOR, isAdmin: true };
    }
    if (principal.roles.includes('PATIENT') && appointment.patient.userId === principal.userId) return { userId: principal.userId, kind: ChatParticipantKind.PATIENT, isAdmin: false };
    if (principal.roles.includes('DOCTOR') && appointment.doctor.userId === principal.userId) return { userId: principal.userId, kind: ChatParticipantKind.DOCTOR, isAdmin: false };
    throw forbidden();
  }

  private assertSendEligibility(appointment: Awaited<ReturnType<ChatService['appointment']>>) {
    const now = Date.now();
    if (appointment.status === AppointmentStatus.PENDING) throw ineligible();
    if (TERMINAL.has(appointment.status)) throw closed();
    if (now < appointment.startsAt.getTime() - 15 * 60_000) throw closed();
    const latest = OPERATIONAL.has(appointment.status) ? appointment.endsAt.getTime() + 4 * 60 * 60_000 : appointment.endsAt.getTime() + 60 * 60_000;
    if (now > latest) throw closed();
  }

  private async assertNotBlocked(tx: Db, conversation: Conversation, actor: ChatActor) {
    const scopes = actor.kind === ChatParticipantKind.DOCTOR ? [ChatBlockScope.PATIENT_DOCTOR] : actor.kind === ChatParticipantKind.CLINIC_OPERATOR ? [ChatBlockScope.PATIENT_CLINIC_OPERATOR] : [ChatBlockScope.PATIENT_DOCTOR, ChatBlockScope.PATIENT_CLINIC_OPERATOR];
    const active = await tx.chatConversationBlock.findFirst({ where: { conversationId: conversation.id, scope: { in: scopes }, status: { in: ACTIVE_BLOCKS } }, select: { id: true } });
    if (active) throw blocked();
  }

  private async assertRate(tx: Db, conversationId: string, userId: string) {
    const now = new Date();
    const [userMinute, userBurst, conversationMinute] = await Promise.all([
      tx.chatMessage.count({ where: { senderUserId: userId, createdAt: { gte: new Date(now.getTime() - 60_000) } } }),
      tx.chatMessage.count({ where: { senderUserId: userId, createdAt: { gte: new Date(now.getTime() - 10_000) } } }),
      tx.chatMessage.count({ where: { conversationId, createdAt: { gte: new Date(now.getTime() - 60_000) } } }),
    ]);
    if (userMinute >= 30 || userBurst >= 5 || conversationMinute >= 120) throw rateLimited();
  }

  private canReport(actor: ChatParticipantKind, sender: ChatParticipantKind) {
    return actor === ChatParticipantKind.PATIENT ? sender === ChatParticipantKind.DOCTOR || sender === ChatParticipantKind.CLINIC_OPERATOR : actor === ChatParticipantKind.DOCTOR ? sender === ChatParticipantKind.PATIENT : true;
  }

  private reportBlockScope(actor: ChatActor, sender: ChatParticipantKind, explicit?: (typeof import('./chat.dto').CHAT_BLOCK_SCOPES)[number]) {
    if (actor.isAdmin && explicit) return explicit as ChatBlockScope;
    if (actor.kind === ChatParticipantKind.PATIENT && sender === ChatParticipantKind.DOCTOR) return ChatBlockScope.PATIENT_DOCTOR;
    if (actor.kind === ChatParticipantKind.PATIENT && sender === ChatParticipantKind.CLINIC_OPERATOR) return ChatBlockScope.PATIENT_CLINIC_OPERATOR;
    if (actor.kind === ChatParticipantKind.DOCTOR && sender === ChatParticipantKind.PATIENT) return ChatBlockScope.PATIENT_DOCTOR;
    throw moderationForbidden();
  }

  private async requestBlock(tx: Db, conversation: Conversation, actorUserId: string, scope: ChatBlockScope, safeCategory: string) {
    const existing = await tx.chatConversationBlock.findFirst({ where: { conversationId: conversation.id, scope, status: { in: ACTIVE_BLOCKS } } });
    if (!existing) {
      const block = await tx.chatConversationBlock.create({ data: { clinicId: conversation.clinicId, conversationId: conversation.id, scope, requestedByUserId: actorUserId, safeReason: safeCategory } });
      await this.audit(tx, conversation, actorUserId, ChatAuditAction.BLOCK_REQUESTED, 'BLOCK', block.id, scope);
    }
  }

  private assertResolutionCompatible(input: ResolveChatReportDto) {
    const irreversible = input.action === 'RESTRICT_MESSAGE' || input.action.startsWith('CONFIRM_');
    if (input.resolution === 'DISMISSED_NO_VIOLATION' && irreversible) throw moderationForbidden();
    if (input.resolution === 'INSUFFICIENT_EVIDENCE' && irreversible) throw moderationForbidden();
  }

  private async applyResolutionAction(tx: Db, conversation: Conversation, report: { id: string; message: { id: string; senderKind: ChatParticipantKind }; reporterUserId: string; reasonCategory: any }, actorUserId: string, input: ResolveChatReportDto): Promise<RestrictedMessageTransition | null> {
    let restrictedTransition: RestrictedMessageTransition | null = null;
    if (input.action === 'RESTRICT_MESSAGE') {
      const message = await tx.chatMessage.findUniqueOrThrow({ where: { id: report.message.id } });
      if (message.visibility !== ChatMessageVisibility.RESTRICTED) {
        const restricted = await this.restrictMessage(tx, conversation, message, actorUserId, report.reasonCategory, this.safeNote(input.safeNote));
        restrictedTransition = restricted.transition;
      }
    }
    const scope = input.action === 'CONFIRM_PATIENT_DOCTOR_BLOCK' ? ChatBlockScope.PATIENT_DOCTOR : input.action === 'CONFIRM_PATIENT_CLINIC_OPERATOR_BLOCK' ? ChatBlockScope.PATIENT_CLINIC_OPERATOR : null;
    if (scope) {
      let block = await tx.chatConversationBlock.findFirst({ where: { conversationId: conversation.id, scope, status: { in: ACTIVE_BLOCKS } }, orderBy: { requestedAt: 'desc' } });
      if (!block) {
        block = await tx.chatConversationBlock.create({ data: {
          clinicId: conversation.clinicId, conversationId: conversation.id, scope, requestedByUserId: actorUserId,
          status: ChatBlockStatus.CONFIRMED, reviewedByUserId: actorUserId, reviewedAt: new Date(),
          safeReason: this.safeNote(input.safeNote) ?? report.reasonCategory,
        } });
        await this.audit(tx, conversation, actorUserId, ChatAuditAction.BLOCK_REQUESTED, 'BLOCK', block.id, scope);
      } else if (block.status !== ChatBlockStatus.CONFIRMED) {
        block = await tx.chatConversationBlock.update({ where: { id: block.id }, data: { status: ChatBlockStatus.CONFIRMED, reviewedByUserId: actorUserId, reviewedAt: new Date(), safeReason: this.safeNote(input.safeNote) ?? block.safeReason } });
      }
      await this.audit(tx, conversation, actorUserId, ChatAuditAction.BLOCK_CONFIRMED, 'BLOCK', block.id, scope);
    }
    if (input.action === 'LIFT_TEMPORARY_BLOCK') {
      const scope = report.message.senderKind === ChatParticipantKind.CLINIC_OPERATOR ? ChatBlockScope.PATIENT_CLINIC_OPERATOR : ChatBlockScope.PATIENT_DOCTOR;
      const blocks = await tx.chatConversationBlock.findMany({ where: { conversationId: conversation.id, scope, status: { in: ACTIVE_BLOCKS } } });
      for (const block of blocks) {
        await tx.chatConversationBlock.update({ where: { id: block.id }, data: { status: ChatBlockStatus.LIFTED, reviewedByUserId: actorUserId, reviewedAt: new Date(), safeReason: this.safeNote(input.safeNote) ?? block.safeReason } });
        await this.audit(tx, conversation, actorUserId, ChatAuditAction.BLOCK_LIFTED, 'BLOCK', block.id, scope);
      }
    }
    return restrictedTransition;
  }

  private async restrictMessage(tx: Db, conversation: Conversation, message: { id: string }, actorUserId: string, reasonCategory: string, safeNote: string | null) {
    const updated = await tx.chatMessage.update({ where: { id: message.id }, data: { visibility: ChatMessageVisibility.RESTRICTED, restrictedReasonCategory: reasonCategory as any, restrictedAt: new Date() } });
    await tx.chatMessageModerationAction.create({ data: { clinicId: conversation.clinicId, conversationId: conversation.id, messageId: message.id, actorUserId, action: ChatMessageModerationActionType.RESTRICT_MESSAGE, reasonCategory: reasonCategory as any, safeNote } });
    await this.audit(tx, conversation, actorUserId, ChatAuditAction.MESSAGE_RESTRICTED, 'MESSAGE', message.id, reasonCategory);
    return { message: updated, transition: this.restrictionTransition(conversation, updated) };
  }

  private async audit(tx: Db, conversation: { id: string; clinicId: string }, actorUserId: string | null, action: ChatAuditAction, targetType: string, targetId: string, safeCategory?: string) {
    await tx.chatAuditEvent.create({ data: { clinicId: conversation.clinicId, conversationId: conversation.id, actorUserId, action, targetType, targetId, safeCategory } });
  }

  private messageResponse(message: { id: string; sequence: bigint; senderKind: ChatParticipantKind; body: string; visibility: ChatMessageVisibility; restrictedReasonCategory: any; createdAt: Date }) {
    return { id: message.id, sequence: String(message.sequence), senderKind: message.senderKind, createdAt: message.createdAt, visibility: message.visibility, ...(message.visibility === ChatMessageVisibility.VISIBLE ? { body: message.body } : { restrictedReasonCategory: message.restrictedReasonCategory, tombstone: 'Conversation content has been restricted under policy.' }) };
  }

  private restrictionTransition(conversation: { id: string }, message: { id: string; sequence: bigint; senderKind: ChatParticipantKind; createdAt: Date; visibility: ChatMessageVisibility; restrictedReasonCategory: string | null }): RestrictedMessageTransition {
    if (message.visibility !== ChatMessageVisibility.RESTRICTED || !message.restrictedReasonCategory) throw new Error('A restricted transition requires a persisted restricted message.');
    return {
      conversationId: conversation.id,
      message: {
        id: message.id,
        sequence: String(message.sequence),
        senderKind: message.senderKind,
        createdAt: message.createdAt,
        visibility: 'RESTRICTED',
        restrictedReasonCategory: message.restrictedReasonCategory,
        tombstone: 'Conversation content has been restricted under policy.',
      },
    };
  }

  private visibilityTransition(conversation: { id: string }, message: { id: string; sequence: bigint; visibility: ChatMessageVisibility }): VisibilityTransition {
    return { conversationId: conversation.id, messageId: message.id, sequence: String(message.sequence), visibility: message.visibility as 'RESTRICTED' | 'VISIBLE' };
  }

  private conversationResponse(conversation: { id: string; appointmentId: string; clinicId: string; patientId: string; doctorId: string; createdAt: Date }) { return conversation; }
  private safeNote(note?: string) { const normalized = note?.normalize('NFC').trim(); return normalized || null; }
  private cursor(conversationId: string, sequence: bigint) { return Buffer.from(JSON.stringify({ v: 1, c: conversationId, s: String(sequence) })).toString('base64url'); }
  private parseCursor(raw: string, conversationId: string) { try { const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as { v?: unknown; c?: unknown; s?: unknown }; if (parsed.v !== 1 || typeof parsed.c !== 'string' || typeof parsed.s !== 'string' || !/^\d+$/.test(parsed.s)) throw cursorInvalid(); if (parsed.c !== conversationId) throw cursorForbidden(); return BigInt(parsed.s); } catch (error) { if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error; throw cursorInvalid(); } }
  private visibilityCursor(conversationId: string, action: { id: string; createdAt: Date }) { return Buffer.from(JSON.stringify({ v: 1, c: conversationId, t: action.createdAt.toISOString(), i: action.id })).toString('base64url'); }
  private parseVisibilityCursor(raw: string, conversationId: string) { try { const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as { v?: unknown; c?: unknown; t?: unknown; i?: unknown }; const createdAt = typeof parsed.t === 'string' ? new Date(parsed.t) : null; if (parsed.v !== 1 || typeof parsed.c !== 'string' || typeof parsed.i !== 'string' || !createdAt || Number.isNaN(createdAt.valueOf())) throw cursorInvalid(); if (parsed.c !== conversationId) throw cursorForbidden(); return { id: parsed.i, createdAt }; } catch (error) { if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error; throw cursorInvalid(); } }
  private async lock(tx: Db, key: string) { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS locked`; }
}
