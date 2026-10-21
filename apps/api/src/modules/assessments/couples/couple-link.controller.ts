import { Body, CanActivate, Controller, ExecutionContext, Get, Header, Headers, HttpException, Injectable, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { PublicAuthRateLimiter } from '../../identity/application/ports/public-auth-rate-limiter';
import { CoupleInvitationAcceptDto, CoupleInvitationCreateDto, CoupleInvitationPreviewDto, CoupleInvitationResponseDto, CoupleInvitationTokenDto, CoupleLinkConsentDto, CoupleLinkPolicyDto, CoupleSessionListQueryDto, CoupleSessionPageDto, CoupleSessionSummaryDto } from './couple-link.dto';
import { CoupleLinkService } from './couple-link.service';

@Injectable()
export class CoupleLinkRateGuard implements CanActivate {
  constructor(private readonly limiter: PublicAuthRateLimiter) {}
  async canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const read = request.method === 'GET';
    const allowed = await this.limiter.consume({ scope: read ? 'couple-link-read' : 'couple-link-write', subjects: [{ kind: 'user', value: request.auth.userId, limit: read ? 120 : 30 }], windowMs: 60_000, at: new Date() });
    if (!allowed) throw new HttpException({ code: 'COUPLE_RATE_LIMITED', message: 'Couple link request limit exceeded.', details: {} }, 429);
    return true;
  }
}
const uuid = () => new ParseUUIDPipe({ version: '4' });
@ApiTags('Couple Account Linking') @ApiBearerAuth('bearerAuth')
@ApiErrorResponse(400, 'Request validation or explicit consent is invalid.')
@ApiErrorResponse(401, 'An active independent session is required.')
@ApiErrorResponse(403, 'Patient self access is required.')
@ApiErrorResponse(404, 'Owned session or intended-recipient invitation was not found.')
@ApiErrorResponse(409, 'Session, consent version or idempotency state conflicts.')
@ApiErrorResponse(422, 'Adult self-reported birth date or registered recipient is required.')
@ApiErrorResponse(429, 'Authenticated request rate limit exceeded.')
@ApiErrorResponse(503, 'An owner-published account-link policy is unavailable.')
@RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF)
@UseGuards(CoupleLinkRateGuard) @Controller('patients/me')
export class CoupleLinkController {
  constructor(private readonly couples: CoupleLinkService) {}
  @Get('couple-link-policy') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientCoupleLinkPolicyGet', summary: 'Get the owner-published account-link policy; no medical-processing permission is implied' })
  @ApiOkResponse({ type: CoupleLinkPolicyDto })
  policy(@Req() req: AuthenticatedRequest) { return this.couples.policy(req.auth.userId, this.context(req)); }
  @Post('couple-sessions') @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.PATIENT_INTAKE_READ_SELF)
  @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', maxLength: 200 } })
  @ApiOperation({ operationId: 'patientCoupleSessionCreate', summary: 'Create an adult couple account-link session after independent consent' })
  @ApiCreatedResponse({ type: CoupleSessionSummaryDto })
  create(@Body() body: CoupleLinkConsentDto, @Headers('idempotency-key') key: string | undefined, @Req() req: AuthenticatedRequest) { return this.couples.create(req.auth.userId, body, key, this.context(req)); }
  @Get('couple-sessions') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientCoupleSessionsList', summary: 'List own minimized couple link history' })
  @ApiOkResponse({ type: CoupleSessionPageDto })
  list(@Query() query: CoupleSessionListQueryDto, @Req() req: AuthenticatedRequest) { return this.couples.list(req.auth.userId, query, this.context(req)); }
  @Get('couple-sessions/:id') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientCoupleSessionGet', summary: 'Get an owned couple link without partner private identity or answers' })
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: CoupleSessionSummaryDto })
  get(@Param('id', uuid()) id: string, @Req() req: AuthenticatedRequest) { return this.couples.get(req.auth.userId, id, this.context(req)); }
  @Post('couple-sessions/:id/invitations') @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', maxLength: 200 } })
  @ApiOperation({ operationId: 'patientCoupleInvitationCreate', summary: 'Issue or deliberately replace a nonexpiring registered-recipient invitation; plaintext secret only once' })
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: CoupleInvitationResponseDto })
  invite(@Param('id', uuid()) id: string, @Body() body: CoupleInvitationCreateDto, @Headers('idempotency-key') key: string | undefined, @Req() req: AuthenticatedRequest) { return this.couples.invite(req.auth.userId, id, body, key, this.context(req)); }
  @Post('couple-invitations/preview') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientCoupleInvitationPreview', summary: 'Preview account-link policy without accepting or consuming the invitation' })
  @ApiCreatedResponse({ type: CoupleInvitationPreviewDto })
  preview(@Body() body: CoupleInvitationTokenDto, @Req() req: AuthenticatedRequest) { return this.couples.preview(req.auth.userId, body.invitationToken, this.context(req)); }
  @Post('couple-invitations/accept') @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.PATIENT_INTAKE_READ_SELF)
  @ApiOperation({ operationId: 'patientCoupleInvitationAccept', summary: 'Accept as the intended adult account; no proxy identity or private response disclosure' })
  @ApiCreatedResponse({ type: CoupleSessionSummaryDto })
  accept(@Body() body: CoupleInvitationAcceptDto, @Req() req: AuthenticatedRequest) { return this.couples.accept(req.auth.userId, body, this.context(req)); }
  @Post('couple-sessions/:id/consent-withdrawal') @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiOperation({ operationId: 'patientCoupleConsentWithdraw', summary: 'Withdraw own linking consent and block future shared access; no purchase cancellation/refund' })
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: CoupleSessionSummaryDto })
  withdraw(@Param('id', uuid()) id: string, @Req() req: AuthenticatedRequest) { return this.couples.withdraw(req.auth.userId, id, this.context(req)); }
  private context(req: AuthenticatedRequest) { return { actorUserId: req.auth.userId, actorSessionId: req.auth.sessionId, requestId: req.id, ipAddress: req.ip }; }
}
