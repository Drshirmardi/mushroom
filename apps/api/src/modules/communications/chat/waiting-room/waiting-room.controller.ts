import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { ChatService } from '../chat.service';

@ApiTags('Chat consultation')
@ApiBearerAuth('bearerAuth')
@Controller('chat/waiting-room')
export class WaitingRoomController {
  constructor(private readonly chat: ChatService) {}

  @Get('appointments/:appointmentId')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @ApiOperation({ operationId: 'chatWaitingRoomGet', summary: 'Get server-evaluated appointment waiting-room readiness' })
  @ApiOkResponse({ schema: { type: 'object' } })
  get(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) appointmentId: string, @Req() request: AuthenticatedRequest) {
    return this.chat.waitingRoom(request.auth, appointmentId);
  }
}
