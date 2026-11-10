import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { CoupleLinkRateGuard } from './couple-link.controller';
import { MarriageRequestListQueryDto, MarriageRequestAcceptDto, MarriageRequestCreateDto, MarriageRequestDto, MarriageRequestPageDto, MarriageSettingsDto, MarriagePrepaidBillingDto, MarriageRefundPrepaymentResultDto } from './marriage-request.dto';
import { MarriageRequestService } from './marriage-request.service';
import { MarriageSmsService } from './marriage-sms.service';
import { BillingService } from '../../billing/billing.service';
import { BillingIntentDto } from '../../billing/billing.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
@ApiTags('Marriage Services') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF)
@UseGuards(CoupleLinkRateGuard) @Controller('patients/me/marriage-requests')
export class MarriageRequestController {
  constructor(private readonly requests: MarriageRequestService, private readonly sms: MarriageSmsService, private readonly billing: BillingService) {}
  @Header('Cache-Control','private, no-store') @Get('settings/:id') @ApiOperation({ operationId: 'patientMarriageSettings' }) @ApiOkResponse({ type: MarriageSettingsDto })
  settings(@Param('id',uuid()) id:string,@Req() r:AuthenticatedRequest) { return this.requests.settings(id,context(r)); }
  @Header('Cache-Control','private, no-store') @Post('settings/:id/billing-intents') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.WALLET_WRITE_SELF) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientMarriagePrepaidBillingIntent' }) @ApiCreatedResponse({ type: BillingIntentDto })
  prepaidIntent(@Param('id', uuid()) id: string, @Body() body: MarriagePrepaidBillingDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.billing.create(r.auth.userId, 'MARRIAGE_REQUEST', { publicationId: id.toLowerCase(), termsConsentRecordId: body.termsConsentRecordId.toLowerCase() }, key, context(r)); }
  @Header('Cache-Control','private, no-store') @Post('settings/:id/refund') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.WALLET_WRITE_SELF) @ApiOperation({ operationId: 'patientMarriagePrepaymentRefund' }) @ApiCreatedResponse({ type: MarriageRefundPrepaymentResultDto })
  refundPrepayment(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.requests.refundPrepayment(id, context(r)); }
  @Header('Cache-Control','private, no-store') @Get() @ApiOperation({ operationId: 'patientMarriageRequestsList' }) @ApiOkResponse({ type: MarriageRequestPageDto })
  list(@Query() q:MarriageRequestListQueryDto,@Req() r:AuthenticatedRequest) { return this.requests.list(q.page,context(r),q); }
  @Header('Cache-Control','private, no-store') @Post() @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiHeader({ name:'Idempotency-Key',required:true }) @ApiOperation({ operationId:'patientMarriageRequestCreate' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  create(@Body() body:MarriageRequestCreateDto,@Headers('idempotency-key') key:string|undefined,@Req() r:AuthenticatedRequest) { return this.requests.create(body,key,context(r)); }
  @Header('Cache-Control','private, no-store') @Get(':id') @ApiOperation({ operationId:'patientMarriageRequestGet' }) @ApiOkResponse({ type: MarriageRequestDto })
  get(@Param('id',uuid()) id:string,@Req() r:AuthenticatedRequest) { return this.requests.get(id,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/review') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId:'patientMarriageRequestReview' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  review(@Param('id',uuid()) id:string,@Req() r:AuthenticatedRequest) { return this.requests.review(id,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/accept') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId:'patientMarriageRequestAccept' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  accept(@Param('id',uuid()) id:string,@Body() body:MarriageRequestAcceptDto,@Req() r:AuthenticatedRequest) { return this.requests.accept(id,body,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/decline') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId:'patientMarriageRequestDecline' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  decline(@Param('id',uuid()) id:string,@Req() r:AuthenticatedRequest) { return this.requests.decline(id,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/replace') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiHeader({ name:'Idempotency-Key',required:true }) @ApiOperation({ operationId:'patientMarriageRequestReplace' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  replace(@Param('id',uuid()) id:string,@Body() body:MarriageRequestCreateDto,@Headers('idempotency-key') key:string|undefined,@Req() r:AuthenticatedRequest) { return this.requests.replace(id,body,key,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/cancel') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId:'patientMarriageRequestCancel' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  cancel(@Param('id',uuid()) id:string,@Req() r:AuthenticatedRequest) { return this.requests.cancel(id,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/sms') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiHeader({ name:'Idempotency-Key',required:true }) @ApiOperation({ operationId:'patientMarriageInvitationSms' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  send(@Param('id',uuid()) id:string,@Headers('idempotency-key') key:string|undefined,@Req() r:AuthenticatedRequest) { return this.sms.enqueue(id,key,context(r)); }
}
