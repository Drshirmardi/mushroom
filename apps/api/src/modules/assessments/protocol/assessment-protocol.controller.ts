import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { ProtocolApproveDto, ProtocolPageQueryDto, ProtocolPreviewQueryDto, ProtocolPreviewResponseDto, ProtocolQueuePageDto, ProtocolQueueQueryDto, ProtocolReviewPageDto, ProtocolReviewResponseDto, ProtocolWithdrawalDto } from './assessment-protocol.dto';
import { AssessmentProtocolService } from './assessment-protocol.service';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Assessment Protocol Review') @ApiBearerAuth('bearerAuth')
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Qualified scoped physician required.')
@ApiErrorResponse(404, 'Protocol source unavailable.') @ApiErrorResponse(409, 'Source, review revision or command conflicts.') @ApiErrorResponse(422, 'Exact supported source and explicit review required.')
@RequireRoles('DOCTOR') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_SIGN)
@Controller('clinical/assessment-protocols')
export class ClinicalAssessmentProtocolController {
  constructor(private readonly protocols: AssessmentProtocolService) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentProtocolQueue', summary: 'List immutable questionnaire candidates without patient data' }) @ApiOkResponse({ type: ProtocolQueuePageDto })
  queue(@Query() query: ProtocolQueueQueryDto, @Req() r: AuthenticatedRequest) { return this.protocols.queue(query, context(r)); }
  @Get(':assessmentVersionId') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentProtocolPreview', summary: 'Inspect exact questions, scoring and purpose-specific consent before educational protocol review' }) @ApiParam({ name: 'assessmentVersionId', format: 'uuid' }) @ApiOkResponse({ type: ProtocolPreviewResponseDto })
  preview(@Param('assessmentVersionId', uuid()) id: string, @Query() query: ProtocolPreviewQueryDto, @Req() r: AuthenticatedRequest) { return this.protocols.preview(id, query, 'doctor', context(r)); }
  @Get(':assessmentVersionId/reviews') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentProtocolHistory' }) @ApiParam({ name: 'assessmentVersionId', format: 'uuid' }) @ApiOkResponse({ type: ProtocolReviewPageDto })
  history(@Param('assessmentVersionId', uuid()) id: string, @Query() query: ProtocolPageQueryDto, @Req() r: AuthenticatedRequest) { return this.protocols.history(id, query, 'doctor', context(r)); }
  @Post(':assessmentVersionId/reviews') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentProtocolApprove', summary: 'Append an exact physician protocol review; commercial publication and patient entitlement remain separate' })
  @ApiParam({ name: 'assessmentVersionId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 8, maxLength: 200 } }) @ApiCreatedResponse({ type: ProtocolReviewResponseDto })
  approve(@Param('assessmentVersionId', uuid()) id: string, @Body() body: ProtocolApproveDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.protocols.approve(id, body, key, context(r)); }
  @Post(':assessmentVersionId/reviews/:reviewId/withdrawal') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentProtocolWithdraw', summary: 'Append withdrawal of current approval; retain its source and professional evidence' })
  @ApiParam({ name: 'assessmentVersionId', format: 'uuid' }) @ApiParam({ name: 'reviewId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 8, maxLength: 200 } }) @ApiCreatedResponse({ type: ProtocolReviewResponseDto })
  withdraw(@Param('assessmentVersionId', uuid()) id: string, @Param('reviewId', uuid()) review: string, @Body() body: ProtocolWithdrawalDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.protocols.withdraw(id, review, body, key, context(r)); }
}

@ApiTags('Assessment Protocol Review') @ApiBearerAuth('bearerAuth')
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Scoped content manager required.') @ApiErrorResponse(404, 'Protocol source unavailable.')
@RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
@Controller('admin/assessment-protocols')
export class AdminAssessmentProtocolController {
  constructor(private readonly protocols: AssessmentProtocolService) {}
  @Get(':assessmentVersionId') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentProtocolPreview' }) @ApiParam({ name: 'assessmentVersionId', format: 'uuid' }) @ApiOkResponse({ type: ProtocolPreviewResponseDto })
  preview(@Param('assessmentVersionId', uuid()) id: string, @Query() query: ProtocolPreviewQueryDto, @Req() r: AuthenticatedRequest) { return this.protocols.preview(id, query, 'admin', context(r)); }
  @Get(':assessmentVersionId/reviews') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentProtocolHistory' }) @ApiParam({ name: 'assessmentVersionId', format: 'uuid' }) @ApiOkResponse({ type: ProtocolReviewPageDto })
  history(@Param('assessmentVersionId', uuid()) id: string, @Query() query: ProtocolPageQueryDto, @Req() r: AuthenticatedRequest) { return this.protocols.history(id, query, 'admin', context(r)); }
}
