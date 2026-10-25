import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ProgramDefinitionRateGuard } from '../definitions/program-definition.controller';
import { MezajRecommendationQueryDto } from '../../commerce/mezaj/commerce-mezaj.dto';
import { ProgramPurchaseQueryDto } from './program-purchase.dto';
import { MezajProgramRecommendationsDto, OwnedProgramPageDto, ProgramMezajDto, SaveProgramMezajDto } from './program-mezaj.dto';
import { ProgramMezajService } from './program-mezaj.service';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });

@ApiTags('Program Mezaj') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE) @UseGuards(ProgramDefinitionRateGuard)
@Controller('admin/program-definitions/:id/mezaj')
export class AdminProgramMezajController {
  constructor(private readonly programs: ProgramMezajService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminProgramMezajGet' }) @ApiOkResponse({ type: ProgramMezajDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() r: AuthenticatedRequest) { return this.programs.settings(id, context(r)); }
  @Put() @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'adminProgramMezajSave' }) @ApiOkResponse({ type: ProgramMezajDto })
  save(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: SaveProgramMezajDto, @Req() r: AuthenticatedRequest) { return this.programs.settings(id, context(r), body); }
}
@ApiTags('Program Mezaj') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF) @UseGuards(ProgramDefinitionRateGuard)
@Controller('patients/me')
export class PatientProgramMezajController {
  constructor(private readonly programs: ProgramMezajService) {}
  @Get('program-recommendations') @RequirePermissions(PERMISSIONS.CONTENT_READ_SELF, PERMISSIONS.ASSESSMENTS_READ_SELF) @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientProgramRecommendationsGet' }) @ApiOkResponse({ type: MezajProgramRecommendationsDto })
  recommendations(@Query() query: MezajRecommendationQueryDto, @Req() r: AuthenticatedRequest) { return this.programs.recommendations(context(r), query.submissionId); }
  @Get('program-library') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientProgramLibraryList' }) @ApiOkResponse({ type: OwnedProgramPageDto })
  library(@Query() query: ProgramPurchaseQueryDto, @Req() r: AuthenticatedRequest) { return this.programs.owned(query, context(r)); }
}
