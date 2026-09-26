import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import {
  ChangeChatVisibilityDto,
  ChatConversationResponseDto,
  ChatHistoryQueryDto,
  ChatHistoryResponseDto,
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
  constructor(private readonly chat: ChatService) {}

  @Get('appointments/:appointmentId/conversation')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatAppointmentConversationGet', summary: 'Get or create the authorized appointment-bound conversation' })
  @ApiOkResponse({ type: ChatConversationResponseDto })
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'The appointment conversation is unavailable to this account.')
  appointmentConversation(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) appointmentId: string, @Req() request: AuthenticatedRequest) {
    return this.chat.appointmentConversation(request.auth, appointmentId);
  }

  @Get('conversations/:conversationId/messages')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatConversationHistory', summary: 'Read an authorized bounded ascending message history page' })
  @ApiOkResponse({ type: ChatHistoryResponseDto })
  history(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string, @Query() query: ChatHistoryQueryDto, @Req() request: AuthenticatedRequest) {
    return this.chat.history(request.auth, conversationId, query.cursor, query.limit);
  }

  @Get('conversations/:conversationId/visibility-reconciliation')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatConversationVisibilityReconciliation', summary: 'Reconcile durable, body-safe moderation visibility transitions' })
  @ApiOkResponse({ type: ChatVisibilityReconciliationResponseDto })
  visibilityReconciliation(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string, @Query() query: ChatVisibilityReconciliationQueryDto, @Req() request: AuthenticatedRequest) {
    return this.chat.visibilityReconciliation(request.auth, conversationId, query.cursor, query.limit);
  }

  @Post('conversations/:conversationId/messages')
  @RequirePermissions(PERMISSIONS.CHAT_MESSAGE_SEND)
  @ApiOperation({ operationId: 'chatConversationMessageSend', summary: 'Persist an idempotent appointment-bound text message' })
  @ApiCreatedResponse({ type: ChatMessageResponseDto })
  send(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string, @Body() body: SendChatMessageDto, @Req() request: AuthenticatedRequest) {
    return this.chat.send(request.auth, conversationId, body);
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
