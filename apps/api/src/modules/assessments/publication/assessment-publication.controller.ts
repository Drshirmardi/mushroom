import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { AssessmentPublicationService } from './assessment-publication.service';
import { PublicationDetailDto, PublicationListQueryDto, PublicationPageDto, PublicationPreviewDto, PublicationPreviewQueryDto, PublicationRecordDto, PublishAssessmentOfferingDto } from './assessment-publication.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });

@ApiTags('Assessment Commercial Publication') @ApiBearerAuth('bearerAuth')
@RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Scoped administrator required.') @ApiErrorResponse(404, 'Commercial source unavailable.')
@ApiErrorResponse(409, 'Source, publication revision or command conflicts.') @ApiErrorResponse(422, 'Complete supported commercial configuration required.')
@Controller('admin/assessment-commercial-publications')
export class AssessmentPublicationController {
  constructor(private readonly publications: AssessmentPublicationService) {}
  @Get('preview') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentCommercialPreview', summary: 'Preview exact configurable tariff, physician protocol and owner-supplied commercial terms; no checkout activation' }) @ApiOkResponse({ type: PublicationPreviewDto })
  preview(@Query() query: PublicationPreviewQueryDto, @Req() r: AuthenticatedRequest) { return this.publications.preview(query, context(r)); }
  @Get() @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentCommercialList' }) @ApiOkResponse({ type: PublicationPageDto })
  list(@Query() query: PublicationListQueryDto, @Req() r: AuthenticatedRequest) { return this.publications.list(query, context(r)); }
  @Post() @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentCommercialPublish', summary: 'Publish an immutable configurable tariff; replace previous tariff without changing receipts' }) @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 8, maxLength: 200 } }) @ApiCreatedResponse({ type: PublicationRecordDto })
  publish(@Body() body: PublishAssessmentOfferingDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.publications.publish(body, key, context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentCommercialGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PublicationDetailDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() r: AuthenticatedRequest) { return this.publications.get(id, context(r)); }
  @Post(':id/retire') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentCommercialRetire', summary: 'Withdraw tariff from new purchases while retaining prior purchase evidence' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: PublicationRecordDto })
  retire(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() r: AuthenticatedRequest) { return this.publications.retire(id, context(r)); }
}
