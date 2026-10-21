import { GuidanceApprovalDto } from '../../content/guidance/guidance-content.dto';
import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { AssessmentGuidanceCreateDto, AssessmentGuidancePageDto, AssessmentGuidanceQueryDto, AssessmentGuidanceResponseDto, PatientAssessmentGuidanceDto } from './assessment-guidance.dto';
import { AssessmentGuidanceService } from './assessment-guidance.service';
const context = (req: AuthenticatedRequest) => ({ actorUserId: req.auth.userId, actorSessionId: req.auth.sessionId, requestId: req.id, ipAddress: req.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Educational Guidance') @ApiBearerAuth('bearerAuth')
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Scoped content authority required.')
@ApiErrorResponse(404, 'Content unavailable.') @ApiErrorResponse(409, 'Hash, lifecycle or idempotency conflict.') @ApiErrorResponse(422, 'Inconsistent metadata.')
@RequireRoles('ADMIN') @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
@Controller('admin/assessment-guidance')
export class AdminAssessmentGuidanceController {
  constructor(private readonly guidance: AssessmentGuidanceService) {}
  @Post('versions') @Header('Cache-Control', 'private, no-store')
  @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 8, maxLength: 200 } })
  @ApiOperation({ operationId: 'adminAssessmentGuidanceCreate', summary: 'Capture exact questionnaire band and approved educational references as a mapping draft' })
  @ApiCreatedResponse({ type: AssessmentGuidanceResponseDto })
  create(@Body() body: AssessmentGuidanceCreateDto, @Headers('idempotency-key') key: string | undefined, @Req() req: AuthenticatedRequest) { return this.guidance.create(body, key, context(req)); }
  @Get() @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentGuidanceList' }) @ApiOkResponse({ type: AssessmentGuidancePageDto })
  list(@Query() query: AssessmentGuidanceQueryDto, @Req() req: AuthenticatedRequest) { return this.guidance.list(query, 'admin', context(req)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentGuidanceGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: AssessmentGuidanceResponseDto })
  get(@Param('id', uuid()) id: string, @Req() req: AuthenticatedRequest) { return this.guidance.get(id, 'admin', context(req)); }
  @Post(':id/revoke') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'adminAssessmentGuidanceDraftRevoke', summary: 'Permanently withdraw a draft; cannot revoke physician-approved content' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: AssessmentGuidanceResponseDto })
  revoke(@Param('id', uuid()) id: string, @Req() req: AuthenticatedRequest) { return this.guidance.revoke(id, 'admin', context(req)); }
}

@ApiTags('Educational Guidance') @ApiBearerAuth('bearerAuth')
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Qualified scoped physician required.')
@ApiErrorResponse(404, 'Content unavailable.') @ApiErrorResponse(409, 'Hash or lifecycle conflict.') @ApiErrorResponse(422, 'Inconsistent metadata.')
@RequireRoles('DOCTOR') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_SIGN)
@Controller('clinical/assessment-guidance')
export class ClinicalAssessmentGuidanceController {
  constructor(private readonly guidance: AssessmentGuidanceService) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentGuidanceList' }) @ApiOkResponse({ type: AssessmentGuidancePageDto })
  list(@Query() query: AssessmentGuidanceQueryDto, @Req() req: AuthenticatedRequest) { return this.guidance.list(query, 'doctor', context(req)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentGuidanceGet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: AssessmentGuidanceResponseDto })
  get(@Param('id', uuid()) id: string, @Req() req: AuthenticatedRequest) { return this.guidance.get(id, 'doctor', context(req)); }
  @Post(':id/approve') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentGuidanceApprove', summary: 'Approve exact educational snapshot as a qualified scoped physician' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: AssessmentGuidanceResponseDto })
  approve(@Param('id', uuid()) id: string, @Body() body: GuidanceApprovalDto, @Req() req: AuthenticatedRequest) { return this.guidance.approve(id, body, context(req)); }
  @Post(':id/revoke') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'clinicalAssessmentGuidanceRevoke', summary: 'Permanently revoke educational content; no restoration' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiCreatedResponse({ type: AssessmentGuidanceResponseDto })
  revoke(@Param('id', uuid()) id: string, @Req() req: AuthenticatedRequest) { return this.guidance.revoke(id, 'doctor', context(req)); }
}

@ApiTags('Educational Guidance') @ApiBearerAuth('bearerAuth')
@ApiErrorResponse(400, 'Invalid identifier.') @ApiErrorResponse(401, 'Active authentication required.') @ApiErrorResponse(403, 'Patient access required.') @ApiErrorResponse(404, 'Approved content unavailable.')
@RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF, PERMISSIONS.CONTENT_READ_SELF)
@Controller('assessment-submissions')
export class PatientAssessmentGuidanceController {
  constructor(private readonly guidance: AssessmentGuidanceService) {}
  @Get(':id/guidance') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ operationId: 'patientAssessmentGuidanceGet', summary: 'Read an approved educational version; no diagnosis or personalized therapeutic diet' }) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOkResponse({ type: PatientAssessmentGuidanceDto })
  get(@Param('id', uuid()) id: string, @Req() req: AuthenticatedRequest) { return this.guidance.patient(id, context(req)); }
}
