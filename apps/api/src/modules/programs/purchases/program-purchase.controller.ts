import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { BillingService } from '../../billing/billing.service';
import { BillingIntentDto } from '../../billing/billing.dto';
import { ProgramDefinitionRateGuard } from '../definitions/program-definition.controller';
import { ProgramPurchaseService } from './program-purchase.service';
import { PatientProgramContentDto, PatientProgramOfferingDto, PatientProgramOfferingPageDto, PatientProgramPurchaseDto, PatientProgramPurchasePageDto, ProgramConsentAcceptDto, ProgramConsentRecordDto, ProgramPurchaseIntentDto, ProgramPurchaseQueryDto } from './program-purchase.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
@ApiTags('Patient Educational Programs') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Own patient capability required.') @ApiErrorResponse(404, 'Owned or available program unavailable.') @ApiErrorResponse(409, 'Program source, quote, consent or access conflict.') @ApiErrorResponse(429, 'Program request limit reached.')
@Controller('patients/me')
export class ProgramPurchaseController {
  constructor(private readonly purchases: ProgramPurchaseService, private readonly billing: BillingService) {}
  @Get('program-offerings') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientProgramOfferingsList' }) @ApiOkResponse({ type: PatientProgramOfferingPageDto })
  catalog(@Query() q: ProgramPurchaseQueryDto, @Req() r: AuthenticatedRequest) { return this.purchases.catalog(q, context(r)); }
  @Get('program-offerings/:id') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientProgramOfferingGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PatientProgramOfferingDto })
  offering(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.purchases.offering(id, context(r)); }
  @Post('program-consents') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF)
  @ApiOperation({ operationId: 'patientProgramConsentAccept' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: ProgramConsentRecordDto })
  accept(@Body() body: ProgramConsentAcceptDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.purchases.accept(body, key, context(r)); }
  @Post('billing/program-intents') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF)
  @ApiOperation({ operationId: 'patientProgramBillingIntentCreate' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: BillingIntentDto })
  async intent(@Body() body: ProgramPurchaseIntentDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) {
    await this.purchases.patientIdentity(context(r));
    return this.billing.create(r.auth.userId, 'PROGRAM', { publicationId: body.publicationId.toLowerCase(), publicationHash: body.publicationHash, termsConsentRecordId: body.termsConsentRecordId.toLowerCase() }, key, context(r));
  }
  @Get('program-purchases') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.WALLET_READ_SELF)
  @ApiOperation({ operationId: 'patientProgramPurchasesList' }) @ApiOkResponse({ type: PatientProgramPurchasePageDto })
  list(@Query() q: ProgramPurchaseQueryDto, @Req() r: AuthenticatedRequest) { return this.purchases.list(q, context(r)); }
  @Get('program-purchases/:id') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.WALLET_READ_SELF)
  @ApiOperation({ operationId: 'patientProgramPurchaseGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PatientProgramPurchaseDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.purchases.get(id, context(r)); }
  @Get('program-access-grants/:id/content') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientProgramContentGet', summary: 'Read only the owned paid or free exact reviewed educational version' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PatientProgramContentDto })
  content(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.purchases.content(id, context(r)); }
}
