import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { CoupleLinkRateGuard } from './couple-link.controller';
import { CoupleSessionListQueryDto } from './couple-link.dto';
import { MarriageRequestAcceptDto, MarriageRequestCreateDto, MarriageRequestDto, MarriageRequestPageDto, MarriageSettingsDto } from './marriage-request.dto';
import { MarriageRequestService } from './marriage-request.service';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
@ApiTags('Marriage Services') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF)
@UseGuards(CoupleLinkRateGuard) @Controller('patients/me/marriage-requests')
export class MarriageRequestController {
  constructor(private readonly requests: MarriageRequestService) {}
  @Header('Cache-Control','private, no-store') @Get('settings/:id') @ApiOperation({ operationId: 'patientMarriageSettings' }) @ApiOkResponse({ type: MarriageSettingsDto })
  settings(@Param('id',uuid()) id:string,@Req() r:AuthenticatedRequest) { return this.requests.settings(id,context(r)); }
  @Header('Cache-Control','private, no-store') @Get() @ApiOperation({ operationId: 'patientMarriageRequestsList' }) @ApiOkResponse({ type: MarriageRequestPageDto })
  list(@Query() q:CoupleSessionListQueryDto,@Req() r:AuthenticatedRequest) { return this.requests.list(q.page,context(r)); }
  @Header('Cache-Control','private, no-store') @Post() @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiHeader({ name:'Idempotency-Key',required:true }) @ApiOperation({ operationId:'patientMarriageRequestCreate' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  create(@Body() body:MarriageRequestCreateDto,@Headers('idempotency-key') key:string|undefined,@Req() r:AuthenticatedRequest) { return this.requests.create(body,key,context(r)); }
  @Header('Cache-Control','private, no-store') @Get(':id') @ApiOperation({ operationId:'patientMarriageRequestGet' }) @ApiOkResponse({ type: MarriageRequestDto })
  get(@Param('id',uuid()) id:string,@Req() r:AuthenticatedRequest) { return this.requests.get(id,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/accept') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId:'patientMarriageRequestAccept' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  accept(@Param('id',uuid()) id:string,@Body() body:MarriageRequestAcceptDto,@Req() r:AuthenticatedRequest) { return this.requests.accept(id,body,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/replace') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiHeader({ name:'Idempotency-Key',required:true }) @ApiOperation({ operationId:'patientMarriageRequestReplace' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  replace(@Param('id',uuid()) id:string,@Body() body:MarriageRequestCreateDto,@Headers('idempotency-key') key:string|undefined,@Req() r:AuthenticatedRequest) { return this.requests.replace(id,body,key,context(r)); }
  @Header('Cache-Control','private, no-store') @Post(':id/cancel') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId:'patientMarriageRequestCancel' }) @ApiCreatedResponse({ type: MarriageRequestDto })
  cancel(@Param('id',uuid()) id:string,@Req() r:AuthenticatedRequest) { return this.requests.cancel(id,context(r)); }
}
