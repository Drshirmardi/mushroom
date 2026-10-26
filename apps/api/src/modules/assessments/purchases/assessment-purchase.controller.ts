import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { BillingRateGuard } from '../../billing/billing.controller';
import { BillingService } from '../../billing/billing.service';
import { BillingIntentDto } from '../../billing/billing.dto';
import { PatientAssessmentsService } from '../patient/patient-assessments.service';
import { PatientAssessmentSubmissionResponseDto } from '../patient/patient-assessments.dto';
import { AssessmentPurchaseService } from './assessment-purchase.service';
import { AssessmentConsentAcceptDto, AssessmentConsentRecordDto, AssessmentPurchaseIntentDto, AssessmentPurchasePageQueryDto, PatientAssessmentOfferingDetailDto, PatientAssessmentOfferingPageDto, PatientAssessmentPurchaseDto, PatientAssessmentPurchasePageDto } from './assessment-purchase.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Paid Patient Assessments') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Patient self access required.') @ApiErrorResponse(404, 'Owned or available assessment resource unavailable.') @ApiErrorResponse(409, 'Purchase, consent or source conflicts.') @ApiErrorResponse(422, 'Adult supported configuration required.')
@Controller('patients/me')
export class AssessmentPurchaseController {
  constructor(private readonly purchases: AssessmentPurchaseService, private readonly billing: BillingService, private readonly assessments: PatientAssessmentsService) {}
  @Get('assessment-offerings') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientPaidAssessmentOfferingsList' }) @ApiOkResponse({ type: PatientAssessmentOfferingPageDto })
  catalog(@Query() query: AssessmentPurchasePageQueryDto, @Req() r: AuthenticatedRequest) { return this.purchases.catalog(query, context(r)); }
  @Get('assessment-offerings/:publicationId') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientPaidAssessmentOfferingGet', summary: 'Review exact price and independent processing/purchase terms before payment' }) @ApiParam({ name: 'publicationId', format: 'uuid' }) @ApiOkResponse({ type: PatientAssessmentOfferingDetailDto })
  offering(@Param('publicationId', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.purchases.offering(id, context(r)); }
  @Post('assessment-consents') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiOperation({ operationId: 'patientAssessmentConsentAccept' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: AssessmentConsentRecordDto })
  accept(@Body() body: AssessmentConsentAcceptDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.purchases.accept(body, key, context(r)); }
  @Post('assessment-consents/:id/withdrawal') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiOperation({ operationId: 'patientAssessmentProcessingConsentWithdraw', summary: 'Withdraw exact processing consent without deleting history or refunding purchase' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: AssessmentConsentRecordDto })
  withdraw(@Param('id', uuid()) id: string, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.purchases.withdraw(id, key, context(r)); }
  @Post('billing/assessment-intents') @Header('Cache-Control', 'private, no-store') @UseGuards(BillingRateGuard) @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.WALLET_WRITE_SELF)
  @ApiOperation({ operationId: 'patientAssessmentBillingIntentCreate' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: BillingIntentDto })
  intent(@Body() body: AssessmentPurchaseIntentDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.billing.create(r.auth.userId, 'ASSESSMENT', { publicationId: body.publicationId.toLowerCase(), publicationHash: body.publicationHash, processingConsentRecordId: body.processingConsentRecordId.toLowerCase(), termsConsentRecordId: body.termsConsentRecordId.toLowerCase() }, key, context(r)); }
  @Get('assessment-purchases') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientAssessmentPurchasesList' }) @ApiOkResponse({ type: PatientAssessmentPurchasePageDto })
  history(@Query() query: AssessmentPurchasePageQueryDto, @Req() r: AuthenticatedRequest) { return this.purchases.list(query, context(r)); }
  @Get('assessment-purchases/:id') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientAssessmentPurchaseGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PatientAssessmentPurchaseDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.purchases.get(id, context(r)); }
  @Post('assessment-access-grants/:id/submission') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiOperation({ operationId: 'patientPaidAssessmentStart', summary: 'Start or resume the same owned engine attempt for one paid grant' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: PatientAssessmentSubmissionResponseDto })
  start(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.assessments.startPaid(id, r.auth.userId, context(r)); }
}
