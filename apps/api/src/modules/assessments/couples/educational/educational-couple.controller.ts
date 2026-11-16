import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../../common/errors/api-error-response.decorator';
import { EducationalCoupleAcceptDto, EducationalCoupleBillingDto, EducationalCoupleCreateDto, EducationalCoupleDetailDto, EducationalCoupleDto, EducationalCouplePageDto, EducationalCoupleQueryDto, EducationalCoupleResultDto } from './educational-couple.dto';
import { EducationalCoupleService } from './educational-couple.service';
import { AssessmentFreeGrantDto } from '../../purchases/assessment-purchase.dto';
import { BillingService } from '../../../billing/billing.service';
import { BillingIntentDto } from '../../../billing/billing.dto';
import { BillingRateGuard } from '../../../billing/billing.controller';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
@ApiTags('Educational Couple Assessments') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF)
@ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Patient self access required.') @ApiErrorResponse(404, 'Owned educational couple context unavailable.') @ApiErrorResponse(409, 'Independent acceptance or exact context conflicts.')
@ApiErrorResponse(503, 'Required private access audit unavailable.')
@Controller('patients/me/educational-couple-assessments')
export class EducationalCoupleController {
  constructor(private readonly service: EducationalCoupleService, private readonly billing: BillingService) {}
  @Post() @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiOperation({ operationId: 'patientEducationalCoupleCreate' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: EducationalCoupleDto })
  create(@Body() body: EducationalCoupleCreateDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.service.create(body, key, context(r)); }
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientEducationalCouplesList' }) @ApiOkResponse({ type: EducationalCouplePageDto })
  list(@Query() query: EducationalCoupleQueryDto, @Req() r: AuthenticatedRequest) { return this.service.list(query, context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientEducationalCoupleGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: EducationalCoupleDetailDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.service.get(id, context(r)); }
  @Post(':id/consent') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiOperation({ operationId: 'patientEducationalCoupleAccept' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: EducationalCoupleDto })
  accept(@Param('id', uuid()) id: string, @Body() body: EducationalCoupleAcceptDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.service.accept(id, body, key, context(r)); }
  @Post(':id/sharing-withdrawal') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiOperation({ operationId: 'patientEducationalCoupleSharingWithdraw' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: EducationalCoupleDto })
  withdraw(@Param('id', uuid()) id: string, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.service.withdraw(id, key, context(r)); }
  @Post(':id/free-access') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiOperation({ operationId: 'patientEducationalCoupleFreeAccessCreate' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: AssessmentFreeGrantDto })
  claimFree(@Param('id', uuid()) id: string, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.service.claimFree(id, key, context(r)); }
  @Post(':id/billing-intents') @Header('Cache-Control', 'private, no-store') @UseGuards(BillingRateGuard) @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.WALLET_WRITE_SELF)
  @ApiOperation({ operationId: 'patientEducationalCoupleBillingCreate' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: BillingIntentDto })
  intent(@Param('id', uuid()) id: string, @Body() body: EducationalCoupleBillingDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.billing.create(r.auth.userId, 'ASSESSMENT', { educationalCoupleSessionId: id.toLowerCase(), contextHash: body.contextHash, termsConsentRecordId: body.termsConsentRecordId.toLowerCase() }, key, context(r)); }
  @Get(':id/result') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientEducationalCoupleResult' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: EducationalCoupleResultDto })
  result(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.service.result(id, context(r)); }
}
