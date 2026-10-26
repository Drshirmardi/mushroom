import { Body, Controller, Get, Header, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { ProgramDefinitionRateGuard } from '../definitions/program-definition.controller';
import { ProgramCommercialConfigDto, ProgramCommercialPreviewDto, ProgramPublicationPageDto, ProgramPublicationQueryDto, ProgramPublicationResponseDto, ProgramPublicationSetupDto, PublishProgramOfferingDto } from './program-publication.dto';
import { ProgramPublicationService } from './program-publication.service';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
@ApiTags('Program commercial publication') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @UseGuards(ProgramDefinitionRateGuard)
@ApiErrorResponse(400, 'Strict supported configuration required.') @ApiErrorResponse(401, 'Active session required.') @ApiErrorResponse(403, 'Current scoped administrator required.') @ApiErrorResponse(404, 'Program commercial source unavailable.') @ApiErrorResponse(409, 'Source, command or publication revision conflict.') @ApiErrorResponse(422, 'Incomplete program commercial configuration.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.')
@Controller('admin/program-offerings')
export class ProgramPublicationController {
  constructor(private readonly programs: ProgramPublicationService) {}
  @Get('setup/:id') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminProgramOfferingSetup', summary: 'Read saved program price and exact active purchase terms for the current clinic and locale' }) @ApiOkResponse({ type: ProgramPublicationSetupDto })
  setup(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.setup(id.toLowerCase(), context(r)); }
  @Post('preview') @HttpCode(200) @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramOfferingPreview', summary: 'Preview exact price/access/terms and clinical prerequisites without publishing or charging' }) @ApiOkResponse({ type: ProgramCommercialPreviewDto })
  preview(@Body() body: ProgramCommercialConfigDto, @Req() r: AuthenticatedRequest) { return this.programs.preview(body, context(r)); }
  @Post() @Header('Cache-Control', 'private, no-store') @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 8, maxLength: 200 } }) @ApiOperation({ operationId: 'adminProgramOfferingPublish', summary: 'Publish exact immutable program commercial configuration; no patient entitlement or therapy activation' }) @ApiCreatedResponse({ type: ProgramPublicationResponseDto })
  publish(@Body() body: PublishProgramOfferingDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.programs.publish(body, key, context(r)); }
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'adminProgramOfferingList' }) @ApiOkResponse({ type: ProgramPublicationPageDto })
  list(@Query() query: ProgramPublicationQueryDto, @Req() r: AuthenticatedRequest) { return this.programs.list(query, context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminProgramOfferingGet' }) @ApiOkResponse({ type: ProgramPublicationResponseDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.get(id.toLowerCase(), context(r)); }
  @Post(':id/retire') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminProgramOfferingRetire' }) @ApiCreatedResponse({ type: ProgramPublicationResponseDto })
  retire(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.programs.retire(id.toLowerCase(), context(r)); }
}
