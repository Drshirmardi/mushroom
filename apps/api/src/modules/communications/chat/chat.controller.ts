import { BadRequestException, Body, Controller, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, PayloadTooLargeException, Post, Query, Req, Res, StreamableFile } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ChatAttachmentsService, MAX_CHAT_ATTACHMENT } from './chat-attachments.service';
import { concatMap, filter } from 'rxjs';
import { chatEventStream } from './realtime/chat-event-stream';
import { ChatRealtimePublisher } from './realtime/chat-realtime.publisher';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import {
  ChangeChatVisibilityDto,
  ChatConversationResponseDto,
  PreviousChatPageDto,
  ChatAccessResponseDto,
  ChatHistoryQueryDto,
  ChatHistoryResponseDto,
  ChatSyncResponseDto,
  ChatMessageResponseDto,
  ChatVisibilityReconciliationQueryDto,
  ChatVisibilityReconciliationResponseDto,
  CreateChatReportDto,
  ResolveChatReportDto,
  SendChatMessageDto,
} from './chat.dto';
import { ChatService } from './chat.service';

@ApiTags('Chat consultation')
@ApiBearerAuth('bearerAuth')
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService, private readonly publisher: ChatRealtimePublisher, private readonly attachments: ChatAttachmentsService) {}

  @Get('appointments/:appointmentId/conversation')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatAppointmentConversationGet', summary: 'Get or create the authorized appointment-bound conversation' })
  @ApiOkResponse({ type: ChatConversationResponseDto })
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'The appointment conversation is unavailable to this account.')
  appointmentConversation(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) appointmentId: string, @Req() request: AuthenticatedRequest) {
    return this.chat.appointmentConversation(request.auth, appointmentId);
  }

  @Get('appointments/:appointmentId/previous-conversations')
  @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiQuery({ name: 'before', required: false, schema: { type: 'string', format: 'uuid' } })
  @ApiOkResponse({ type: PreviousChatPageDto })
  previousConversations(
    @Param('appointmentId', new ParseUUIDPipe({ version: '4' })) appointmentId: string,
    @Query('before', new ParseUUIDPipe({ version: '4', optional: true })) before: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chat.previousConversations(request.auth, appointmentId, before);
  }

  @Get('conversations/:conversationId/access')
  @ApiParam({ name: 'conversationId', schema: { type: 'string', format: 'uuid' } })
  @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatConversationAccess', summary: 'Read current conversation readiness and explicit closure state' })
  @ApiOkResponse({ type: ChatAccessResponseDto })
  async access(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) {
    const access = await this.chat.engineAccess(request.auth, id);
    return { canSend: access.canSend, readOnlyReason: access.readOnlyReason, opensAt: access.opensAt, closedAt: access.closedAt, canClose: access.canClose };
  }

  @Post('conversations/:conversationId/close')
  @ApiParam({ name: 'conversationId', schema: { type: 'string', format: 'uuid' } })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CHAT_MESSAGE_SEND)
  @ApiOperation({ operationId: 'chatConversationClose', summary: 'Explicitly close a conversation as its assigned physician or authorized clinic administrator' })
  @ApiOkResponse({ type: ChatConversationResponseDto })
  close(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) {
    return this.chat.closeConversation(request.auth, id);
  }

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CHAT_MESSAGE_SEND)
  @ApiOperation({ operationId: 'chatConversationSend' })
  @ApiOkResponse({ type: ChatMessageResponseDto })
  send(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: SendChatMessageDto, @Req() request: AuthenticatedRequest) {
    return this.chat.send(request.auth, id, body);
  }

  @Post('conversations/:conversationId/attachments/:clientMessageId')
  @RequirePermissions(PERMISSIONS.CHAT_MESSAGE_SEND)
  @ApiOperation({ operationId: 'chatAttachmentSend' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiCreatedResponse({ type: ChatMessageResponseDto })
  async upload(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) id: string, @Param('clientMessageId', new ParseUUIDPipe({ version: '4' })) clientMessageId: string, @Req() request: AuthenticatedRequest) {
    if (!(await this.chat.engineAccess(request.auth, id)).canSend) throw new BadRequestException('Chat is read-only');
    const file = await request.file({ limits: { fileSize: MAX_CHAT_ATTACHMENT, files: 1, parts: 1 } });
    if (!file) throw new BadRequestException('Attachment required');
    const bytes = await file.toBuffer();
    if (file.file.truncated) throw new PayloadTooLargeException('Attachment too large');
    const attachment = await this.attachments.save(id, clientMessageId, request.auth.userId, file.filename, bytes);
    return this.chat.send(request.auth, id, { clientMessageId, body: '' }, attachment);
  }

  @Get('conversations/:conversationId/attachments/:messageId')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatAttachmentDownload' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async download(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) id: string, @Param('messageId', new ParseUUIDPipe({ version: '4' })) messageId: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: FastifyReply) {
    const attachment = await this.chat.attachment(request.auth, id, messageId);
    response.header('Cache-Control', 'private, no-store').header('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(await this.attachments.download(attachment.key), {
      type: attachment.mime, length: attachment.size,
      disposition: "attachment; filename*=UTF-8''" + encodeURIComponent(attachment.name).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16)),
    });
  }

  @Get('conversations/:conversationId/events')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiProduces('text/event-stream')
  async events(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.chat.engineAccess(request.auth, id);
    return chatEventStream(reply, request.auth.expiresAt, (send, close) => {
      const subscription = this.publisher.changes.pipe(
        filter(changed => changed.id === id),
        concatMap(async changed => { await this.chat.engineAccess(request.auth, id); return changed; }),
      ).subscribe({ next: changed => send({ changed: true, conversationId: id, kind: changed.kind, callId: changed.callId }), error: close });
      return () => subscription.unsubscribe();
    });
  }

  @Get('conversations/:conversationId/sync')
  @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatConversationSync' })
  @ApiQuery({ name: 'messages', required: false, type: String })
  @ApiQuery({ name: 'visibility', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, enum: ['messages', 'visibility'] })
  @ApiOkResponse({ type: ChatSyncResponseDto })
  sync(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) id: string, @Query('messages') messages: string | undefined, @Query('visibility') visibility: string | undefined, @Query('skip') skip: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.chat.engineSync(request.auth, id, messages, visibility, skip);
  }

  @Post('conversations/:conversationId/receipts/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatMessageReceipt' })
  @ApiNoContentResponse()
  async receipt(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) id: string, @Param('messageId', new ParseUUIDPipe({ version: '4' })) messageId: string, @Req() request: AuthenticatedRequest) {
    await this.chat.engineReceipt(request.auth, id, messageId, true);
  }

  @Get('conversations/:conversationId/messages')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatConversationHistory', summary: 'Read an authorized bounded ascending message history page' })
  @ApiOkResponse({ type: ChatHistoryResponseDto })
  history(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string, @Query() query: ChatHistoryQueryDto, @Req() request: AuthenticatedRequest) {
    return this.chat.history(request.auth, conversationId, query.cursor, query.limit, query.direction);
  }

  @Get('conversations/:conversationId/visibility-reconciliation')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatConversationVisibilityReconciliation', summary: 'Reconcile durable, body-safe moderation visibility transitions' })
  @ApiOkResponse({ type: ChatVisibilityReconciliationResponseDto })
  visibilityReconciliation(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string, @Query() query: ChatVisibilityReconciliationQueryDto, @Req() request: AuthenticatedRequest) {
    return this.chat.visibilityReconciliation(request.auth, conversationId, query.cursor, query.limit);
  }

  @Post('messages/:messageId/reports')
  @RequirePermissions(PERMISSIONS.CHAT_REPORT_CREATE)
  @ApiOperation({ operationId: 'chatMessageReportCreate', summary: 'Create an authorized idempotent moderation report' })
  @ApiCreatedResponse({ schema: { type: 'object' } })
  report(@Param('messageId', new ParseUUIDPipe({ version: '4' })) messageId: string, @Body() body: CreateChatReportDto, @Req() request: AuthenticatedRequest) {
    return this.chat.report(request.auth, messageId, body);
  }

  @Get('conversations/:conversationId/reports')
  @RequirePermissions(PERMISSIONS.CHAT_REPORT_CREATE)
  @ApiOperation({ operationId: 'chatConversationReportsList', summary: 'List own report status or clinic-admin moderation reports' })
  @ApiOkResponse({ schema: { type: 'object' } })
  reports(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string, @Req() request: AuthenticatedRequest) {
    return this.chat.reports(request.auth, conversationId);
  }

  @Post('messages/:messageId/visibility')
  @RequirePermissions(PERMISSIONS.CHAT_MODERATE)
  @ApiOperation({ operationId: 'chatMessageVisibilityChange', summary: 'Restrict or restore a message under clinic moderation policy' })
  @ApiOkResponse({ type: ChatMessageResponseDto })
  changeVisibility(@Param('messageId', new ParseUUIDPipe({ version: '4' })) messageId: string, @Body() body: ChangeChatVisibilityDto, @Req() request: AuthenticatedRequest) {
    return this.chat.changeVisibility(request.auth, messageId, body);
  }

  @Get('messages/:messageId/restricted-content')
  @RequirePermissions(PERMISSIONS.CHAT_MODERATE)
  @ApiOperation({ operationId: 'chatRestrictedContentReview', summary: 'Explicitly review restricted content as a clinic administrator' })
  @ApiOkResponse({ schema: { type: 'object' } })
  restrictedContent(@Param('messageId', new ParseUUIDPipe({ version: '4' })) messageId: string, @Req() request: AuthenticatedRequest) {
    return this.chat.restrictedContent(request.auth, messageId);
  }

  @Post('reports/:reportId/resolve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CHAT_MODERATE)
  @ApiOperation({ operationId: 'chatReportResolve', summary: 'Resolve an internal moderation report and apply an allowed action' })
  @ApiOkResponse({ schema: { type: 'object' } })
  resolveReport(@Param('reportId', new ParseUUIDPipe({ version: '4' })) reportId: string, @Body() body: ResolveChatReportDto, @Req() request: AuthenticatedRequest) {
    return this.chat.resolveReport(request.auth, reportId, body);
  }
}
