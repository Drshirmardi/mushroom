import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { AssessmentOfferingListQueryDto, AssessmentOfferingPageResponseDto, AssessmentOfferingVersionResponseDto, CreateAssessmentOfferingVersionDto } from './assessment-offerings.dto';
import { AssessmentOfferingsService } from './assessment-offerings.service';

@ApiTags('Assessment Offering Drafts') @ApiBearerAuth('bearerAuth')
@RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE)
@Controller('admin/assessment-offerings')
export class AssessmentOfferingsController {
  constructor(private readonly offerings: AssessmentOfferingsService) {}
  @Post('versions') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentOfferingVersionCreate', summary: 'Create an immutable offering draft version; publication remains unavailable' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', maxLength: 200 } })
  @ApiCreatedResponse({ type: AssessmentOfferingVersionResponseDto })
  @ApiErrorResponse(409, 'Offering identity or idempotency key conflicts.') @ApiErrorResponse(422, 'Draft configuration is inconsistent.')
  create(@Body() body: CreateAssessmentOfferingVersionDto, @Headers('idempotency-key') key: string | undefined, @Req() request: AuthenticatedRequest) { return this.offerings.create(body, key, this.context(request)); }
  @Get() @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentOfferingsList', summary: 'List clinic-owned assessment offering draft versions' })
  @ApiOkResponse({ type: AssessmentOfferingPageResponseDto })
  list(@Query() query: AssessmentOfferingListQueryDto, @Req() request: AuthenticatedRequest) { return this.offerings.list(query, this.context(request)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentOfferingGet', summary: 'Get a clinic-owned offering configuration and missing release gates' })
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: AssessmentOfferingVersionResponseDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.offerings.get(id, this.context(request)); }
  @Post(':id/retire') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentOfferingRetire', summary: 'Retire a draft idempotently without rewriting its configuration' })
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: AssessmentOfferingVersionResponseDto })
  retire(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.offerings.retire(id, this.context(request)); }
  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
