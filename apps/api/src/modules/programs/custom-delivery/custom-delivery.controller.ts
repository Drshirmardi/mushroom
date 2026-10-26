import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { BillingService } from '../../billing/billing.service';
import { BillingIntentDto } from '../../billing/billing.dto';
import { ProgramPurchaseService } from '../purchases/program-purchase.service';
import { ProgramDefinitionRateGuard } from '../definitions/program-definition.controller';
import { CustomDeliveryService } from './custom-delivery.service';
import { CustomClinicalContextDto, CustomClinicalRequestPageDto, CustomDeliveryQueryDto, CustomDeliveryStateDto, CustomPlanCreateDto, CustomPlanDetailDto, CustomPlanIssueDto, CustomPlanRevokeDto, CustomPlanVersionPageDto, CustomProgramBillingDto } from './custom-delivery.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
@ApiTags('Patient Custom Delivery') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Own patient capability required.') @ApiErrorResponse(404, 'Owned delivery unavailable.') @ApiErrorResponse(409, 'Paid care or source changed.') @ApiErrorResponse(429, 'Program request limit reached.')
@ApiErrorResponse(422, 'Valid Idempotency-Key required.') @ApiErrorResponse(503, 'Clinical access audit unavailable.')
@Controller('patients/me/custom-program-requests/:requestId')
export class PatientCustomDeliveryController {
  constructor(private readonly delivery: CustomDeliveryService, private readonly billing: BillingService, private readonly purchases: ProgramPurchaseService) {}
  @Post('billing-intents') @Header('Cache-Control','private, no-store') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramBillingIntentCreate' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[!-~]+$' } }) @ApiCreatedResponse({ type: BillingIntentDto })
  async intent(@Param('requestId',uuid()) id: string, @Body() b: CustomProgramBillingDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { await this.purchases.patientIdentity(context(r)); return this.billing.create(r.auth.userId, 'PROGRAM', { customRequestId: id.toLowerCase(), publicationHash: b.publicationHash, termsConsentRecordId: b.termsConsentRecordId.toLowerCase() }, key, context(r)); }
  @Get('delivery') @Header('Cache-Control','private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramDeliveryGet' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiOkResponse({ type: CustomDeliveryStateDto })
  own(@Param('requestId',uuid()) id: string, @Query() q: CustomDeliveryQueryDto, @Req() r: AuthenticatedRequest) { return this.delivery.own(id.toLowerCase(), q, context(r)); }
  @Get('delivery/versions/:id') @Header('Cache-Control','private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramPlanGet' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: CustomPlanDetailDto })
  version(@Param('requestId',uuid()) requestId: string, @Param('id',uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.delivery.ownVersion(requestId.toLowerCase(), id.toLowerCase(), context(r)); }
}
@ApiTags('Assigned Custom Delivery') @ApiBearerAuth('bearerAuth') @RequireRoles('DOCTOR') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW) @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Current assigned qualified physician required.') @ApiErrorResponse(404, 'Assigned paid care unavailable.') @ApiErrorResponse(409, 'Exact care, intake or version conflict.') @ApiErrorResponse(429, 'Program request limit reached.')
@ApiErrorResponse(422, 'Valid Idempotency-Key required.') @ApiErrorResponse(503, 'Clinical access audit unavailable.')
@Controller('clinical/custom-program-requests')
export class ClinicalCustomDeliveryController {
  constructor(private readonly delivery: CustomDeliveryService) {}
  @Get() @Header('Cache-Control','private, no-store') @ApiOperation({ operationId: 'clinicalCustomProgramWorklist' }) @ApiOkResponse({ type: CustomClinicalRequestPageDto })
  list(@Query() q: CustomDeliveryQueryDto, @Req() r: AuthenticatedRequest) { return this.delivery.worklist(q, context(r)); }
  @Get(':requestId/context') @Header('Cache-Control','private, no-store') @ApiOperation({ operationId: 'clinicalCustomProgramContext' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiOkResponse({ type: CustomClinicalContextDto })
  context(@Param('requestId',uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.delivery.context(id.toLowerCase(), context(r)); }
  @Get(':requestId/versions') @Header('Cache-Control','private, no-store') @ApiOperation({ operationId: 'clinicalCustomProgramPlanHistory' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiOkResponse({ type: CustomPlanVersionPageDto })
  history(@Param('requestId',uuid()) id: string, @Query() q: CustomDeliveryQueryDto, @Req() r: AuthenticatedRequest) { return this.delivery.clinicalHistory(id.toLowerCase(), q, context(r)); }
  @Get(':requestId/versions/:id') @Header('Cache-Control','private, no-store') @ApiOperation({ operationId: 'clinicalCustomProgramPlanGet' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: CustomPlanDetailDto })
  version(@Param('requestId',uuid()) requestId: string, @Param('id',uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.delivery.clinicalVersion(requestId.toLowerCase(), id.toLowerCase(), context(r)); }
  @Post(':requestId/versions') @Header('Cache-Control','private, no-store') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT,PERMISSIONS.CLINICAL_RECORD_SIGN)
  @ApiOperation({ operationId: 'clinicalCustomProgramPlanCreate' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[!-~]+$' } }) @ApiCreatedResponse({ type: CustomPlanDetailDto })
  create(@Param('requestId',uuid()) id: string, @Body() b: CustomPlanCreateDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.delivery.create(id.toLowerCase(),b,key,context(r)); }
  @Post(':requestId/versions/:id/issue') @Header('Cache-Control','private, no-store') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT,PERMISSIONS.CLINICAL_RECORD_SIGN)
  @ApiOperation({ operationId: 'clinicalCustomProgramPlanIssue' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[!-~]+$' } }) @ApiCreatedResponse({ type: CustomPlanDetailDto })
  issue(@Param('requestId',uuid()) requestId: string, @Param('id',uuid()) id: string, @Body() b: CustomPlanIssueDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.delivery.issue(requestId.toLowerCase(),id.toLowerCase(),b,key,context(r)); }
  @Post(':requestId/versions/:id/revoke') @Header('Cache-Control','private, no-store') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT,PERMISSIONS.CLINICAL_RECORD_SIGN)
  @ApiOperation({ operationId: 'clinicalCustomProgramPlanRevoke' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[!-~]+$' } }) @ApiCreatedResponse({ type: CustomPlanDetailDto })
  revoke(@Param('requestId',uuid()) requestId: string, @Param('id',uuid()) id: string, @Body() b: CustomPlanRevokeDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.delivery.revoke(requestId.toLowerCase(),id.toLowerCase(),b,key,context(r)); }
}
