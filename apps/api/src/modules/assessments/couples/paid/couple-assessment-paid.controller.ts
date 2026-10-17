import { BadRequestException, Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../../common/errors/api-error-response.decorator';
import { BillingService } from '../../../billing/billing.service';
import { BillingIntentDto } from '../../../billing/billing.dto';
import { BillingRateGuard } from '../../../billing/billing.controller';
import { CoupleLinkRateGuard } from '../couple-link.controller';
import { CoupleAssessmentDeliveryService } from './couple-assessment-delivery.service';
import { CoupleAssessmentBillingIntentDto, CoupleAssessmentOfferingPreviewDto, CoupleAssessmentPaidStateDto, CoupleJointResultDto } from './couple-assessment-paid.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Paid Couple Assessments') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF, PERMISSIONS.PATIENT_INTAKE_READ_SELF) @UseGuards(CoupleLinkRateGuard)
@ApiErrorResponse(401, 'Active patient session required.') @ApiErrorResponse(403, 'Patient self access required.') @ApiErrorResponse(404, 'Available coupled offering not found.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.')
@Controller('patients/me/couple-assessment-offerings')
export class CoupleAssessmentOfferingController {
  constructor(private readonly delivery: CoupleAssessmentDeliveryService) {}
  @Get(':publicationId') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'publicationId', format: 'uuid' }) @ApiOperation({ operationId: 'patientCoupleAssessmentOfferingPreview', summary: 'Resolve safe approved configuration references for explicit couple participation; never accept consent or expose pair definitions' }) @ApiOkResponse({ type: CoupleAssessmentOfferingPreviewDto })
  get(@Param('publicationId', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.delivery.offering(id.toLowerCase(), context(r)); }
}

@ApiTags('Paid Couple Assessments') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @UseGuards(CoupleLinkRateGuard)
@ApiErrorResponse(400, 'Strict input required.') @ApiErrorResponse(401, 'Active independent session required.') @ApiErrorResponse(403, 'Patient self access required.') @ApiErrorResponse(404, 'Owned or mutually authorized resource unavailable.') @ApiErrorResponse(409, 'Context, payment, completion or approval conflict.') @ApiErrorResponse(422, 'Explicit current configuration required.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.')
@Controller('patients/me/couple-assessments/:id')
export class CoupleAssessmentPaidController {
  constructor(private readonly delivery: CoupleAssessmentDeliveryService, private readonly billing: BillingService) {}
  @Post('billing-intents') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.WALLET_WRITE_SELF) @UseGuards(BillingRateGuard)
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientCoupleAssessmentBillingIntentCreate', summary: 'Pay as an independently consenting participant for exactly the two owned beneficiaries' }) @ApiCreatedResponse({ type: BillingIntentDto })
  async intent(@Param('id', uuid()) id: string, @Body() body: CoupleAssessmentBillingIntentDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { await this.delivery.owned(id, context(r)); return this.billing.create(r.auth.userId, 'ASSESSMENT', { coupleAssessmentSessionId: id.toLowerCase(), contextHash: body.contextHash, termsConsentRecordId: body.termsConsentRecordId.toLowerCase() }, key, context(r)); }
  @Get('paid-state') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'patientCoupleAssessmentPaidState', summary: 'Read only own engine references and authorized minimal partner completion coordination' }) @ApiOkResponse({ type: CoupleAssessmentPaidStateDto })
  state(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.delivery.state(id.toLowerCase(), context(r)); }
  @Post('joint-result') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.CONTENT_READ_SELF)
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientCoupleJointResultGenerate', summary: 'Persist exact approved joint education after both private engine completions and mutual consent' }) @ApiCreatedResponse({ type: CoupleJointResultDto })
  generate(@Param('id', uuid()) id: string, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { if (r.body != null && (typeof r.body !== 'object' || Array.isArray(r.body) || Object.keys(r.body).length)) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'No result, participant or source input is accepted.', details: {} }); return this.delivery.generate(id.toLowerCase(), key, context(r)); }
  @Get('joint-result') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF, PERMISSIONS.CONTENT_READ_SELF)
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'patientCoupleJointResultGet', summary: 'Read currently mutually authorized approved joint education; no individual responses or bands' }) @ApiOkResponse({ type: CoupleJointResultDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.delivery.get(id.toLowerCase(), context(r)); }
}
