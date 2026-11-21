import type { FastifyReply } from 'fastify';
import { concatMap, filter, startWith } from 'rxjs';
import { chatEventStream } from './realtime/chat-event-stream';
import { BadRequestException, Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiExcludeEndpoint, ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiProduces, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { Public } from '../../../common/auth/public.decorator';
import { ChatCallService } from './chat-call.service';

class ChatCallDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty() callerName!: string;
  @ApiProperty({ enum: ['DOCTOR', 'CLINIC_OPERATOR'] }) callerKind!: string;
  @ApiProperty({ enum: ['RINGING', 'ACTIVE', 'DECLINED', 'MISSED', 'ENDED', 'CANCELLED', 'FAILED'] }) status!: string;
  @ApiProperty() ringsUntil!: Date;
  @ApiProperty({ enum: ['AUDIO', 'VIDEO'] }) mode!: 'AUDIO' | 'VIDEO';
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) connectedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) endedAt!: Date | null;
}
class StartChatCallDto {
  @ApiPropertyOptional({ enum: ['AUDIO', 'VIDEO'], default: 'VIDEO' })
  @IsOptional() @IsIn(['AUDIO', 'VIDEO']) mode?: 'AUDIO' | 'VIDEO';
}
class ChatCallActionDto {
  @ApiProperty({ enum: ['answer', 'decline', 'end'] })
  @IsIn(['answer', 'decline', 'end']) action!: 'answer' | 'decline' | 'end';
}
class VideoGrantDto { @ApiProperty() url!: string }
class IncomingCallDto { @ApiProperty({ type: ChatCallDto, nullable: true }) call!: ChatCallDto | null }
class IncomingPresenceDto {
  @ApiProperty() @IsString() @Length(32, 32) id!: string;
  @ApiProperty() @IsBoolean() visible!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() closed?: boolean;
}
class BridgeRequest {
  @IsOptional() @IsString() @Length(43, 43) code?: string;
  @IsOptional() @IsString() @Length(36, 36) callId?: string;
  @IsOptional() @IsString() @Length(36, 36) userId?: string;
  @IsOptional() @IsIn(['end', 'connected']) action?: 'end' | 'connected';
}

@ApiTags('Chat consultation')
@ApiBearerAuth('bearerAuth')
@RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
@Controller('chat')
export class ChatCallController {
  constructor(private readonly calls: ChatCallService) {}

  @Get('video')
  @Header('Cache-Control', 'private, no-store')
  capabilities() { return { available: this.calls.available }; }

  @Post('appointments/:appointmentId/calls')
  @Header('Cache-Control', 'private, no-store')
  @ApiCreatedResponse({ type: ChatCallDto })
  start(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) appointmentId: string, @Body() body: StartChatCallDto, @Req() request: AuthenticatedRequest) {
    return this.calls.start(request.auth, appointmentId, body?.mode);
  }

  @Get('calls/incoming')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ type: IncomingCallDto })
  async incoming(@Req() request: AuthenticatedRequest, @Query('presence') presence?: string) {
    return { call: await this.calls.incoming(request.auth, presence !== 'false') };
  }

  @Get('calls/incoming/events')
  @ApiProduces('text/event-stream')
  async incomingEvents(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const lease = await this.calls.openIncoming(request.auth);
    let heartbeatCount = 0;
    let terminate = lease.release;
    return chatEventStream(reply, request.auth.expiresAt, (send, close) => {
      terminate = close;
      lease.bindClose(close);
      send({ presenceId: lease.id });
      const subscription = this.calls.incomingChanges.pipe(
        filter(userId => userId === request.auth.userId),
        startWith(request.auth.userId),
        concatMap(() => this.calls.incoming(request.auth, false)),
      ).subscribe({ next: call => send({ call }), error: close });
      return () => { subscription.unsubscribe(); lease.release(); };
    }, () => {
      lease.renew();
      if (++heartbeatCount % 3 === 0) void lease.validate().catch(terminate);
    });
  }

  @Post('calls/incoming/presence')
  incomingPresence(@Req() request: AuthenticatedRequest, @Body() body: IncomingPresenceDto) {
    this.calls.setIncomingVisibility(request.auth, body.id, body.visible, body.closed);
  }

  @Get('conversations/:conversationId/calls/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ type: ChatCallDto })
  history(@Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) {
    return this.calls.history(request.auth, conversationId, id);
  }

  @Get('appointments/:appointmentId/calls/current')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ type: IncomingCallDto })
  async current(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) appointmentId: string, @Req() request: AuthenticatedRequest) {
    return { call: await this.calls.outgoing(request.auth, appointmentId) };
  }

  @Get('calls/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ type: ChatCallDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) {
    return this.calls.get(request.auth, id);
  }

  @Post('calls/:id/action')
  @Header('Cache-Control', 'private, no-store')
  @ApiCreatedResponse({ type: ChatCallDto })
  action(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: ChatCallActionDto, @Req() request: AuthenticatedRequest) {
    return this.calls.action(request.auth, id, body.action);
  }

  @Post('calls/:id/grant')
  @Header('Cache-Control', 'private, no-store')
  @ApiCreatedResponse({ type: VideoGrantDto })
  grant(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) {
    return this.calls.grant(request.auth, id);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Post('internal/video-lease')
  @Header('Cache-Control', 'private, no-store')
  bridge(@Headers('x-chat-video-secret') secret: string | undefined, @Body() body: BridgeRequest) {
    if (!secret || (!body.code && (!body.callId || !body.userId))) throw new BadRequestException();
    return this.calls.bridge(secret, body);
  }
}
