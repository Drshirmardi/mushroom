import { Body, Controller, Get, Headers, HttpStatus, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { MezajResultResponseDto, PatientAssessmentListResponseDto, PatientAssessmentSubmissionResponseDto, SaveAssessmentAnswersDto, SubmitAssessmentDto } from './patient-assessments.dto';
import { PatientAssessmentsService } from './patient-assessments.service';

@ApiTags('Patient Assessments') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT')
@Controller()
export class PatientAssessmentsController {
  constructor(private readonly assessments: PatientAssessmentsService) {}
  @Get('assessments') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @ApiOperation({ operationId: 'patientAssessmentsList', summary: 'List published assessments for the patient clinic' }) @ApiOkResponse({ type: PatientAssessmentListResponseDto })
  list(@Req() request: AuthenticatedRequest) { return this.assessments.list(request.auth.userId); }
  @Post('assessments/:assessmentVersionId/submissions') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId: 'patientAssessmentSubmissionStart', summary: 'Start or resume an assessment submission' }) @ApiParam({ name: 'assessmentVersionId', format: 'uuid' }) @ApiCreatedResponse({ type: PatientAssessmentSubmissionResponseDto }) @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Assessment was not found.')
  start(@Param('assessmentVersionId', new ParseUUIDPipe({ version: '4' })) assessmentVersionId: string, @Req() request: AuthenticatedRequest) { return this.assessments.start(assessmentVersionId, request.auth.userId, this.context(request)); }
  @Get('assessment-submissions/:id') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @ApiOperation({ operationId: 'patientAssessmentSubmissionGet', summary: 'Get the patient assessment submission' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PatientAssessmentSubmissionResponseDto })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.assessments.get(id, request.auth.userId, this.context(request)); }
  @Put('assessment-submissions/:id') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId: 'patientAssessmentSubmissionSave', summary: 'Save answers for an in-progress assessment submission' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PatientAssessmentSubmissionResponseDto })
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Assessment revision is stale or the submission is immutable.')
  save(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: SaveAssessmentAnswersDto, @Req() request: AuthenticatedRequest) { return this.assessments.save(id, body.answers, request.auth.userId, this.context(request), body.expectedRevision); }
  @Post('assessment-submissions/:id/submit') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId: 'patientAssessmentSubmissionSubmit', summary: 'Submit an assessment submission exactly once' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', maxLength: 255 } }) @ApiOkResponse({ type: PatientAssessmentSubmissionResponseDto })
  @ApiBody({ type: SubmitAssessmentDto, required: false })
  @ApiCreatedResponse({ type: PatientAssessmentSubmissionResponseDto })
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Assessment revision, completion state or idempotency key conflicts.')
  submit(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Headers('idempotency-key') idempotencyKey: string | undefined, @Req() request: AuthenticatedRequest, @Body() body?: SubmitAssessmentDto) { return this.assessments.submit(id, idempotencyKey, request.auth.userId, this.context(request), body?.expectedRevision); }
  @Get('assessment-submissions/:id/result') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @ApiOperation({ operationId: 'patientAssessmentSubmissionResult', summary: 'Get an immutable assessment result' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PatientAssessmentSubmissionResponseDto })
  result(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.assessments.result(id, request.auth.userId, this.context(request)); }
  @Get('patients/me/mezaj') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @ApiOperation({ operationId: 'patientMezajResultGet', summary: 'Get the latest immutable Mezaj result derived from a completed versioned assessment' }) @ApiOkResponse({ type: MezajResultResponseDto })
  mezaj(@Req() request: AuthenticatedRequest) { return this.assessments.mezaj(request.auth.userId, this.context(request)); }
  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
