import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { AdminAssessmentsService } from './admin-assessments.service';
import { AssessmentDraftPresetDto, AssessmentListQueryDto, AssessmentListResponseDto, AssessmentScoringPreviewDto, AssessmentScoringPreviewInputDto, AssessmentVersionResponseDto, CreateAssessmentDto, DeleteAssessmentQueryDto, DeletedAssessmentDto, UpdateAssessmentDto } from './admin-assessments.dto';

@ApiTags('Admin Assessments')
@ApiBearerAuth('bearerAuth')
@Controller('admin/assessments')
export class AdminAssessmentsController {
  constructor(private readonly assessments: AdminAssessmentsService) {}

  @Get('draft-presets/mizaj') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'adminAssessmentsMizajDraftPreset', summary: 'Get the unreviewed Mizaj authoring preset; not a patient questionnaire' }) @ApiOkResponse({ type: AssessmentDraftPresetDto })
  draftPreset() { return this.assessments.draftPreset(); }

  @Post(':id/scoring-preview') @HttpCode(HttpStatus.OK) @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'adminAssessmentsScoringPreview', summary: 'Calculate a synthetic unreviewed draft preview without saving patient answers or results' })
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: AssessmentScoringPreviewDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.') @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Assessment version was not found.') @ApiErrorResponse(HttpStatus.CONFLICT, 'The draft changed or is no longer a draft.')
  @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Draft structure or synthetic answers are invalid.')
  scoringPreview(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: AssessmentScoringPreviewInputDto, @Req() request: AuthenticatedRequest) {
    return this.assessments.scoringPreview(id, body, this.context(request));
  }

  @Get() @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminAssessmentsList', summary: 'List assessment versions' }) @ApiOkResponse({ type: AssessmentListResponseDto }) @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.') @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  @ApiQuery({ name: 'assessmentKey', required: false, schema: { type: 'string', maxLength: 100 } })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PUBLISHED', 'RETIRED'] })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'number', minimum: 1, maximum: 100, example: 1 } })
  @ApiQuery({ name: 'pageSize', required: false, schema: { type: 'number', minimum: 1, maximum: 50, example: 20 } })
  list(@Query() query: AssessmentListQueryDto) { return this.assessments.list(query); }

  @Post() @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminAssessmentsCreate', summary: 'Create an assessment draft' }) @ApiCreatedResponse({ type: AssessmentVersionResponseDto }) @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Assessment structure is invalid.')
  create(@Body() body: CreateAssessmentDto, @Req() request: AuthenticatedRequest) { return this.assessments.create(body, this.context(request)); }

  @Get(':id') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminAssessmentsGet', summary: 'Preview an assessment version' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: AssessmentVersionResponseDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.assessments.get(id); }

  @Patch(':id') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminAssessmentsUpdate', summary: 'Update an assessment draft' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: AssessmentVersionResponseDto })
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateAssessmentDto, @Req() request: AuthenticatedRequest) { return this.assessments.update(id, body, this.context(request)); }

  @Delete(':id') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'adminAssessmentsDelete', summary: 'Delete an unreferenced draft or archived assessment with its exact current content hash' })
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: DeletedAssessmentDto })
  @ApiQuery({ name: 'expectedContentHash', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{64}$' } })
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.') @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Assessment was not found.')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Version is published, changed, or has references that must be preserved.')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query() query: DeleteAssessmentQueryDto, @Req() request: AuthenticatedRequest) { return this.assessments.remove(id, query.expectedContentHash, this.context(request)); }

  @Post(':id/duplicate') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminAssessmentsDuplicate', summary: 'Duplicate an assessment version as a new draft' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: AssessmentVersionResponseDto })
  duplicate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.assessments.duplicate(id, this.context(request)); }

  @Post(':id/publish') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminAssessmentsPublish', summary: 'Publish an assessment draft' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: AssessmentVersionResponseDto })
  publish(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.assessments.publish(id, this.context(request)); }

  @Post(':id/archive') @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminAssessmentsArchive', summary: 'Archive a published assessment version' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: AssessmentVersionResponseDto })
  archive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.assessments.archive(id, this.context(request)); }

  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
