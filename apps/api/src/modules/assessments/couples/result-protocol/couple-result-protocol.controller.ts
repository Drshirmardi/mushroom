import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../../common/errors/api-error-response.decorator';
import { CoupleResultProtocolService } from './couple-result-protocol.service';
import { CoupleResultProtocolApprovalDto, CoupleResultProtocolCreateDto, CoupleResultProtocolDto, CoupleResultProtocolPageDto, CoupleResultProtocolQueryDto } from './couple-result-protocol.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Joint Educational Protocols') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active session required.') @ApiErrorResponse(403, 'Scoped administrative access required.') @ApiErrorResponse(404, 'Protocol unavailable.') @ApiErrorResponse(409, 'Source or lifecycle conflict.') @ApiErrorResponse(422, 'Explicit supported configuration required.')
@Controller('admin/couple-result-protocols')
export class AdminCoupleResultProtocolController {
  constructor(private readonly protocols: CoupleResultProtocolService) {}
  @Post('versions') @Header('Cache-Control', 'private, no-store') @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ operationId: 'adminCoupleResultProtocolCreate', summary: 'Capture a professional-authored joint educational lookup draft' }) @ApiCreatedResponse({ type: CoupleResultProtocolDto })
  create(@Body() body: CoupleResultProtocolCreateDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.protocols.create(body, key, context(r)); }
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminCoupleResultProtocolList', summary: 'List retained versions; detail readiness must be checked separately' }) @ApiOkResponse({ type: CoupleResultProtocolPageDto })
  list(@Query() query: CoupleResultProtocolQueryDto, @Req() r: AuthenticatedRequest) { return this.protocols.list(query, 'admin', context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminCoupleResultProtocolGet' }) @ApiOkResponse({ type: CoupleResultProtocolDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.protocols.get(id, 'admin', context(r)); }
  @Post(':id/revoke') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminCoupleResultProtocolDraftRevoke' }) @ApiCreatedResponse({ type: CoupleResultProtocolDto })
  revoke(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.protocols.revoke(id, 'admin', context(r)); }
}

@ApiTags('Joint Educational Protocols') @ApiBearerAuth('bearerAuth') @RequireRoles('DOCTOR') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_SIGN)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active session required.') @ApiErrorResponse(403, 'Qualified scoped physician required.') @ApiErrorResponse(404, 'Protocol unavailable.') @ApiErrorResponse(409, 'Source or lifecycle conflict.') @ApiErrorResponse(422, 'Explicit educational review required.')
@Controller('clinical/couple-result-protocols')
export class ClinicalCoupleResultProtocolController {
  constructor(private readonly protocols: CoupleResultProtocolService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'clinicalCoupleResultProtocolList', summary: 'List retained versions; detail readiness must be checked separately' }) @ApiOkResponse({ type: CoupleResultProtocolPageDto })
  list(@Query() query: CoupleResultProtocolQueryDto, @Req() r: AuthenticatedRequest) { return this.protocols.list(query, 'doctor', context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'clinicalCoupleResultProtocolGet' }) @ApiOkResponse({ type: CoupleResultProtocolDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.protocols.get(id, 'doctor', context(r)); }
  @Post(':id/approve') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'clinicalCoupleResultProtocolApprove', summary: 'Approve complete exact joint education and disclosure as a qualified physician' }) @ApiCreatedResponse({ type: CoupleResultProtocolDto })
  approve(@Param('id', uuid()) id: string, @Body() body: CoupleResultProtocolApprovalDto, @Req() r: AuthenticatedRequest) { return this.protocols.approve(id, body, context(r)); }
  @Post(':id/revoke') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'clinicalCoupleResultProtocolRevoke' }) @ApiCreatedResponse({ type: CoupleResultProtocolDto })
  revoke(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.protocols.revoke(id, 'doctor', context(r)); }
}
