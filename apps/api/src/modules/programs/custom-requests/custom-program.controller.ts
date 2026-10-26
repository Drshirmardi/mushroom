import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { ProgramDefinitionRateGuard } from '../definitions/program-definition.controller';
import { CustomProgramService } from './custom-program.service';
import { CustomProgramCareAcceptDto, CustomProgramCareDto, CustomProgramCarePageDto, CustomProgramOfferingDto, CustomProgramOfferingPageDto, CustomProgramQueryDto, CustomProgramRequestCreateDto, CustomProgramRequestDto, CustomProgramRequestPageDto } from './custom-program.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
@ApiTags('Patient Custom Programs') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Own patient capability required.') @ApiErrorResponse(404, 'Owned request or available service unavailable.') @ApiErrorResponse(409, 'Custom service or care authorization changed.') @ApiErrorResponse(429, 'Program request limit reached.')
@Controller('patients/me')
export class CustomProgramController {
  constructor(private readonly programs: CustomProgramService) {}
  @Get('custom-program-offerings') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramOfferingsList' }) @ApiOkResponse({ type: CustomProgramOfferingPageDto })
  catalog(@Query() q: CustomProgramQueryDto, @Req() r: AuthenticatedRequest) { return this.programs.catalog(q, context(r)); }
  @Get('custom-program-offerings/:id') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramOfferingGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: CustomProgramOfferingDto })
  offering(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.offering(id, context(r)); }
  @Post('custom-program-requests') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramRequestCreate' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: CustomProgramRequestDto })
  create(@Body() b: CustomProgramRequestCreateDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.programs.create(b, key, context(r)); }
  @Get('custom-program-requests') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramRequestsList' }) @ApiOkResponse({ type: CustomProgramRequestPageDto })
  list(@Query() q: CustomProgramQueryDto, @Req() r: AuthenticatedRequest) { return this.programs.list(q, context(r)); }
  @Get('custom-program-requests/:id') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramRequestGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: CustomProgramRequestDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.get(id, context(r)); }
  @Get('custom-program-requests/:requestId/care-authorizations') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramCareHistory' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiOkResponse({ type: CustomProgramCarePageDto })
  history(@Param('requestId', uuid()) id: string, @Query() q: CustomProgramQueryDto, @Req() r: AuthenticatedRequest) { return this.programs.careHistory(id, q, context(r)); }
  @Post('custom-program-requests/:requestId/care-authorizations') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramCareAccept' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: CustomProgramCareDto })
  accept(@Param('requestId', uuid()) id: string, @Body() b: CustomProgramCareAcceptDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.programs.accept(id, b, key, context(r)); }
  @Post('custom-program-requests/:requestId/care-authorizations/:id/withdrawal') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.WALLET_WRITE_SELF)
  @ApiOperation({ operationId: 'patientCustomProgramCareWithdraw' }) @ApiParam({ name: 'requestId', format: 'uuid' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiCreatedResponse({ type: CustomProgramCareDto })
  withdraw(@Param('requestId', uuid()) requestId: string, @Param('id', uuid()) id: string, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.programs.withdraw(requestId, id, key, context(r)); }
}
