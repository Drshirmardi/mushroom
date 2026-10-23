import { Body, CanActivate, Controller, ExecutionContext, Header, HttpCode, HttpStatus, Injectable, Param, ParseUUIDPipe, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';
import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { Public } from '../../../../common/auth/public.decorator';
import { EjabberdConfig } from './ejabberd.config';
import { EjabberdPolicyDto, EjabberdSessionDto } from './ejabberd.dto';
import { EjabberdSessionService } from './ejabberd-session.service';

@Injectable()
export class EjabberdPolicyGuard implements CanActivate {
  constructor(private readonly config: EjabberdConfig) {}
  canActivate(context: ExecutionContext) {
    this.config.assertReady();
    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const header = request.headers['x-chat-policy-key'];
    const expected = Buffer.from(this.config.policySecret);
    const supplied = Buffer.from(typeof header === 'string' && header.length <= 256 ? header : '');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new UnauthorizedException();
    return true;
  }
}

@ApiTags('Chat consultation')
@ApiBearerAuth('bearerAuth')
@Controller('chat/appointments')
export class EjabberdSessionController {
  constructor(private readonly sessions: EjabberdSessionService) {}
  @Post(':appointmentId/session')
  @RequirePermissions(PERMISSIONS.CHAT_CONVERSATION_READ)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @ApiOperation({ operationId: 'chatAppointmentEngineSessionCreate', summary: 'Issue an authorized short-lived ejabberd session for one consultation' })
  @ApiCreatedResponse({ type: EjabberdSessionDto })
  open(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) {
    return this.sessions.open(request.auth, id);
  }
}

@ApiExcludeController()
@Controller('chat/ejabberd')
export class EjabberdPolicyController {
  constructor(private readonly sessions: EjabberdSessionService) {}
  @Post('policy')
  @Public()
  @UseGuards(EjabberdPolicyGuard)
  @HttpCode(HttpStatus.OK)
  authorize(@Body() body: EjabberdPolicyDto) { return this.sessions.authorize(body); }
}
