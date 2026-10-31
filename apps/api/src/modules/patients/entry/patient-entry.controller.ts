import { BillingRateGuard } from '../../billing/billing.controller';
import { BillingIntentDto } from '../../billing/billing.dto';
import { Body, Controller, Get, Header, Headers, UseGuards, HttpCode, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { EntryPolicyDto, EntryPolicyUpdateDto, EntryProfileDto, PatientEntryStatusDto } from './patient-entry.dto';
import { PatientEntryService } from './patient-entry.service';

const actor = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
@ApiTags('Patient Entry') @ApiBearerAuth('bearerAuth') @Controller('patients/me/entry') @RequireRoles('PATIENT')
export class PatientEntryController {
  constructor(private readonly entry: PatientEntryService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientEntryStatus' }) @ApiOkResponse({ type: PatientEntryStatusDto })
  get(@Req() r: AuthenticatedRequest) { return this.entry.status(r.auth.userId); }
  @Post('profile') @HttpCode(200) @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientEntryProfileSave' }) @ApiOkResponse({ type: PatientEntryStatusDto })
  profile(@Body() body: EntryProfileDto, @Req() r: AuthenticatedRequest) { return this.entry.saveProfile(r.auth.userId, body, actor(r)); }
  @Post('start') @HttpCode(200) @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientEntryStart' }) @ApiOkResponse({ type: PatientEntryStatusDto })
  start(@Req() r: AuthenticatedRequest) { return this.entry.start(r.auth.userId, actor(r)); }
  @Post('payment') @ApiHeader({name:'Idempotency-Key',required:true}) @UseGuards(BillingRateGuard) @HttpCode(200) @Header('Cache-Control','private, no-store') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF) @ApiOperation({operationId:'patientEntryPayment'}) @ApiOkResponse({type:BillingIntentDto})
  payment(@Req() r:AuthenticatedRequest,@Headers('idempotency-key') key:string|undefined){return this.entry.payment(r.auth.userId,key,actor(r));}
  @Post('defer') @HttpCode(200) @ApiOperation({operationId:'patientEntryDefer'}) @ApiOkResponse({type:PatientEntryStatusDto})
  defer(@Req() r:AuthenticatedRequest){return this.entry.defer(r.auth.userId,actor(r));}
  @Post('resume') @HttpCode(200) @ApiOperation({operationId:'patientEntryResume'}) @ApiOkResponse({type:PatientEntryStatusDto})
  resume(@Req() r:AuthenticatedRequest){return this.entry.resume(r.auth.userId,actor(r));}
  @Post('complete') @HttpCode(200) @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientEntryComplete' }) @ApiOkResponse({ type: PatientEntryStatusDto })
  complete(@Req() r: AuthenticatedRequest) { return this.entry.complete(r.auth.userId, actor(r)); }
}
@ApiTags('Admin Assessments') @ApiBearerAuth('bearerAuth') @Controller('admin/assessment-entry-policy') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE)
export class AdminEntryPolicyController {
  constructor(private readonly entry: PatientEntryService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminEntryPolicyGet' }) @ApiOkResponse({ type: EntryPolicyDto })
  get() { return this.entry.policy(); }
  @Put() @Header('Cache-Control', 'no-store') @ApiOperation({ operationId: 'adminEntryPolicyUpdate' }) @ApiOkResponse({ type: EntryPolicyDto })
  update(@Body() body: EntryPolicyUpdateDto, @Req() r: AuthenticatedRequest) { return this.entry.updatePolicy(body, actor(r)); }
}
