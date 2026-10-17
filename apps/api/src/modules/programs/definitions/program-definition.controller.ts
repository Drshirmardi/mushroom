import { Body, type CanActivate, Controller, type ExecutionContext, Get, Header, Headers, HttpException, Injectable, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { PublicAuthRateLimiter } from '../../identity/application/ports/public-auth-rate-limiter';
import { ProgramDefinitionApprovalDto, ProgramDefinitionCreateDto, ProgramDefinitionPageDto, ProgramDefinitionQueryDto, ProgramDefinitionResponseDto } from './program-definition.dto';
import { ProgramDefinitionService } from './program-definition.service';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
@Injectable()
export class ProgramDefinitionRateGuard implements CanActivate {
  constructor(private readonly limiter: PublicAuthRateLimiter) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>(), read = request.method === 'GET';
    const allowed = await this.limiter.consume({ scope: read ? 'program-definition-read' : 'program-definition-write', subjects: [{ kind: 'user', value: request.auth.userId, limit: read ? 120 : 30 }], windowMs: 60_000, at: new Date() });
    if (!allowed) throw new HttpException({ code: 'PROGRAM_RATE_LIMITED', message: 'Program request limit exceeded.', details: {} }, 429); return true;
  }
}
@ApiTags('Program definitions') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active session required.') @ApiErrorResponse(403, 'Current same-clinic administrator required.') @ApiErrorResponse(404, 'Program definition unavailable.') @ApiErrorResponse(409, 'Command or lifecycle conflict.') @ApiErrorResponse(422, 'Inconsistent definition/source.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.')
@Controller('admin/program-definitions')
export class AdminProgramDefinitionController {
  constructor(private readonly programs: ProgramDefinitionService) {}
  @Post('versions') @Header('Cache-Control', 'private, no-store') @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 8, maxLength: 200 } }) @ApiOperation({ operationId: 'adminProgramDefinitionCreate', summary: 'Capture immutable unapproved curriculum or professional service specification; no sale or patient therapy' }) @ApiCreatedResponse({ type: ProgramDefinitionResponseDto })
  create(@Body() body: ProgramDefinitionCreateDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.programs.create(body, key, context(r)); }
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramDefinitionList' }) @ApiOkResponse({ type: ProgramDefinitionPageDto })
  list(@Query() query: ProgramDefinitionQueryDto, @Req() r: AuthenticatedRequest) { return this.programs.list(query, 'admin', context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminProgramDefinitionGet' }) @ApiOkResponse({ type: ProgramDefinitionResponseDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.get(id.toLowerCase(), 'admin', context(r)); }
  @Post(':id/revoke') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminProgramDefinitionDraftRevoke', summary: 'Finally revoke an unapproved draft only' }) @ApiCreatedResponse({ type: ProgramDefinitionResponseDto })
  revoke(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.revoke(id.toLowerCase(), 'admin', context(r)); }
}
@ApiTags('Program definitions') @ApiBearerAuth('bearerAuth') @RequireRoles('DOCTOR') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_SIGN) @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active session required.') @ApiErrorResponse(403, 'Current qualified same-clinic physician required.') @ApiErrorResponse(404, 'Program definition unavailable.') @ApiErrorResponse(409, 'Hash or lifecycle conflict.') @ApiErrorResponse(422, 'Inconsistent source.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.')
@Controller('clinical/program-definitions')
export class ClinicalProgramDefinitionController {
  constructor(private readonly programs: ProgramDefinitionService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'clinicalProgramDefinitionList' }) @ApiOkResponse({ type: ProgramDefinitionPageDto })
  list(@Query() query: ProgramDefinitionQueryDto, @Req() r: AuthenticatedRequest) { return this.programs.list(query, 'doctor', context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'clinicalProgramDefinitionGet' }) @ApiOkResponse({ type: ProgramDefinitionResponseDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.get(id.toLowerCase(), 'doctor', context(r)); }
  @Post(':id/approve') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'clinicalProgramDefinitionApprove', summary: 'Approve exact curriculum/service and safety; no sale or automatic individualized therapy' }) @ApiCreatedResponse({ type: ProgramDefinitionResponseDto })
  approve(@Param('id', uuid()) id: string, @Body() body: ProgramDefinitionApprovalDto, @Req() r: AuthenticatedRequest) { return this.programs.approve(id.toLowerCase(), body, context(r)); }
  @Post(':id/revoke') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'clinicalProgramDefinitionRevoke' }) @ApiCreatedResponse({ type: ProgramDefinitionResponseDto })
  revoke(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.revoke(id.toLowerCase(), 'doctor', context(r)); }
}
