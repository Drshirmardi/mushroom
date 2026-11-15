import {
  Body, Controller, HttpCode, HttpStatus, Param, Post, Req, Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../../common/auth/public.decorator';
import { ApiBrowserOrigin } from '../../../common/auth/browser-origin.decorator';
import { BrowserOriginService } from '../../../common/auth/browser-origin.service';
import { RefreshCookieService } from '../../../common/auth/refresh-cookie.service';
import { REFRESH_COOKIE_RESPONSE_HEADERS } from '../../../common/auth/refresh-cookie.openapi';
import { ACCESS_TOKEN_TTL_SECONDS } from '../../../common/auth/access-token.service';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { AuthenticationResponseDto } from '../presentation/http/dto/login.dto';
import { BaleAuthService, type BaleFlowResult } from './bale-auth.service';

class BaleInitDataDto {
  @ApiProperty() @IsString() @MaxLength(8192) initData!: string;
}
class BaleContactTicketDto extends BaleInitDataDto {
  @ApiProperty() @IsString() @MaxLength(128) ticket!: string;
}
class BaleFlowResponseDto {
  @ApiProperty({ enum: ['AUTHENTICATED', 'CONTACT_REQUIRED', 'CONTACT_PENDING', 'ACCOUNT_LINK_REQUIRED'] })
  status!: BaleFlowResult['status'];
  @ApiPropertyOptional({ type: AuthenticationResponseDto })
  authentication?: AuthenticationResponseDto;
}
class BaleContactRequestResponseDto {
  @ApiProperty({ enum: ['CONTACT_REQUIRED'] }) status!: 'CONTACT_REQUIRED';
  @ApiProperty() ticket!: string;
  @ApiProperty() expiresAt!: string;
}

const originOf = (request: FastifyRequest) => Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin;
const contextOf = (request: FastifyRequest) => ({
  ipAddress: request.ip, requestId: request.id,
  userAgent: Array.isArray(request.headers['user-agent']) ? request.headers['user-agent'][0] : request.headers['user-agent'],
});

@ApiTags('Bale Mini App Authentication')
@Controller('auth/bale')
export class BaleAuthController {
  constructor(
    private readonly bale: BaleAuthService,
    private readonly cookies: RefreshCookieService,
    private readonly origins: BrowserOriginService,
  ) {}

  private flow(result: BaleFlowResult, reply: FastifyReply): BaleFlowResponseDto {
    if (result.status === 'AUTHENTICATED') {
      this.cookies.set(reply, result.result.refreshToken, result.result.refreshExpiresAt);
      return {
        status: 'AUTHENTICATED',
        authentication: {
          accessToken: result.result.accessToken,
          tokenType: 'Bearer',
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
          user: result.result.user,
        },
      };
    }
    // Avoid continuing a different person's cookie-based session in a Bale frame.
    this.cookies.clear(reply);
    return { status: result.status };
  }

  @Post('exchange')
  @Public()
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'baleExchange', summary: 'Validate signed Bale identity and exchange it for a patient session if linked' })
  @ApiOkResponse({ type: BaleFlowResponseDto, headers: REFRESH_COOKIE_RESPONSE_HEADERS })
  async exchange(@Body() body: BaleInitDataDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    this.origins.assertAllowed(originOf(request));
    return this.flow(await this.bale.exchange(body.initData, contextOf(request)), reply);
  }

  @Post('contact/request')
  @Public()
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'baleContactRequest', summary: 'Begin one-time contact confirmation via the Bale bot' })
  @ApiOkResponse({ type: BaleContactRequestResponseDto })
  async requestContact(@Body() body: BaleInitDataDto, @Req() request: FastifyRequest) {
    this.origins.assertAllowed(originOf(request));
    return this.bale.requestContact(body.initData);
  }

  @Post('contact/complete')
  @Public()
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'baleContactComplete', summary: 'Finish a server-verified Bale contact flow; never trusts the browser phone' })
  @ApiOkResponse({ type: BaleFlowResponseDto, headers: REFRESH_COOKIE_RESPONSE_HEADERS })
  async complete(@Body() body: BaleContactTicketDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    this.origins.assertAllowed(originOf(request));
    return this.flow(await this.bale.completeContact(body.initData, body.ticket, contextOf(request)), reply);
  }

  @Post('contact/link')
  @ApiBearerAuth('bearerAuth')
  @RequirePermissions(PERMISSIONS.ACCOUNT_READ_SELF)
  @ApiBrowserOrigin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'baleContactLink', summary: 'Link an existing patient after fresh OTP phone verification' })
  @ApiNoContentResponse()
  async link(@Body() body: BaleContactTicketDto, @Req() request: AuthenticatedRequest) {
    this.origins.assertAllowed(originOf(request));
    await this.bale.linkExisting(body.initData, body.ticket, request.auth.userId, request.auth.sessionId, contextOf(request));
  }
}

@ApiTags('Bale Bot Webhook')
@Controller('integrations/bale')
export class BaleWebhookController {
  constructor(private readonly bale: BaleAuthService) {}

  @Post('webhook/:secret')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'baleWebhook', summary: 'Secret-protected Bale bot webhook; configure an unguessable URL and redact it from access logs' })
  @ApiOkResponse({ description: 'Acknowledged' })
  async webhook(@Param('secret') secret: string, @Body() body: unknown): Promise<{ ok: true }> {
    await this.bale.acceptWebhook(secret, body);
    return { ok: true };
  }
}
