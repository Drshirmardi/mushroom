import { Body, Controller, Get, Header, Param, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { MezajRecommendationQueryDto, CommerceMezajCollectionDto, CommerceMezajPairDto, CommerceMezajVersionPageDto, CommerceMezajVersionQueryDto, PatientCommerceRecommendationsDto, SaveCommerceMezajDto } from './commerce-mezaj.dto';
import { CommerceMezajService } from './commerce-mezaj.service';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });

@ApiTags('Commerce Mezaj') @ApiBearerAuth('bearerAuth') @RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.COMMERCE_MANAGE) @Controller('admin/commerce/mezaj')
export class AdminCommerceMezajController {
  constructor(private readonly mezaj: CommerceMezajService) {}
  @Get('collections') @ApiOperation({ operationId: 'adminCommerceMezajCollectionsList', summary: 'List all sixteen ordered Mezaj product collections' }) @ApiOkResponse({ type: [CommerceMezajCollectionDto] }) collections() { return this.mezaj.collections(); }
  @Get('assessment-versions') @ApiOperation({ operationId: 'adminCommerceMezajVersionsList', summary: 'List published Mezaj source versions and their exact bands without patient data' }) @ApiOkResponse({ type: CommerceMezajVersionPageDto }) versions(@Query() query: CommerceMezajVersionQueryDto) { return this.mezaj.versions(query.page); }
  @Put('collections/:primary/:secondary') @ApiOperation({ operationId: 'adminCommerceMezajCollectionSave', summary: 'Replace ordered product membership and exact band links using a revision precondition' }) @ApiOkResponse({ type: CommerceMezajCollectionDto }) save(@Param() pair: CommerceMezajPairDto, @Body() body: SaveCommerceMezajDto, @Req() request: AuthenticatedRequest) { return this.mezaj.save(pair, body, context(request)); }
}

@ApiTags('Patient Commerce') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.COMMERCE_READ_SELF, PERMISSIONS.ASSESSMENTS_READ_SELF) @Controller('patients/me/commerce')
export class PatientCommerceMezajController {
  constructor(private readonly mezaj: CommerceMezajService) {}
  @Get('recommendations') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientCommerceRecommendationsGet', summary: 'Get self-only products for the latest accessible exact ordered Mezaj result; never inferred from title or score' }) @ApiOkResponse({ type: PatientCommerceRecommendationsDto }) patient(@Query() query: MezajRecommendationQueryDto, @Req() request: AuthenticatedRequest) { return this.mezaj.patient(context(request), query.submissionId); }
}
