import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { CoupleLinkRateGuard } from '../couples/couple-link.controller';
import { AssessmentCareService } from './assessment-care.service';
import { AssessmentCareAcceptDto, AssessmentCarePageQueryDto, AssessmentCarePreviewDto, AssessmentCarePreviewQueryDto, AssessmentCareShareDto, AssessmentCareSharePageDto, AssignedAssessmentContextDto } from './assessment-care.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Assigned assessment care') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @UseGuards(CoupleLinkRateGuard)
@ApiErrorResponse(400, 'Strict validated input required.') @ApiErrorResponse(401, 'Active independent patient session required.') @ApiErrorResponse(403, 'Current patient self access required.') @ApiErrorResponse(404, 'Owned eligible appointment, source or policy unavailable.') @ApiErrorResponse(409, 'Exact consent/source/assignment or command conflict.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.') @ApiErrorResponse(503, 'Clinical audit unavailable.')
@ApiParam({ name: 'appointmentId', format: 'uuid' }) @Controller('patients/me/appointments/:appointmentId/assessment-sharing')
export class PatientAssessmentCareController {
  constructor(private readonly care: AssessmentCareService) {}
  @Get('preview') @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientAssessmentCarePreview', summary: 'Preview exact optional disclosure of one own result to the assigned physician; no consent mutation' }) @ApiOkResponse({ type: AssessmentCarePreviewDto })
  preview(@Param('appointmentId', uuid()) id: string, @Query() query: AssessmentCarePreviewQueryDto, @Req() r: AuthenticatedRequest) { return this.care.preview(id.toLowerCase(), query.submissionId.toLowerCase(), context(r)); }
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientAssessmentCareHistory', summary: 'List owned retained appointment-specific sharing consent' }) @ApiOkResponse({ type: AssessmentCareSharePageDto })
  list(@Param('appointmentId', uuid()) id: string, @Query() query: AssessmentCarePageQueryDto, @Req() r: AuthenticatedRequest) { return this.care.list(id.toLowerCase(), query, context(r)); }
  @Post() @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientAssessmentCareConsentAccept', summary: 'Explicitly authorize only the exact own educational result/assigned doctor/appointment' }) @ApiCreatedResponse({ type: AssessmentCareShareDto })
  accept(@Param('appointmentId', uuid()) id: string, @Body() body: AssessmentCareAcceptDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.care.accept(id.toLowerCase(), body, key, context(r)); }
  @Post(':shareId/withdrawal') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiParam({ name: 'shareId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientAssessmentCareConsentWithdraw', summary: 'Finally withdraw only this care-sharing permission; retain own result and financial evidence' }) @ApiCreatedResponse({ type: AssessmentCareShareDto })
  withdraw(@Param('appointmentId', uuid()) id: string, @Param('shareId', uuid()) shareId: string, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.care.withdraw(id.toLowerCase(), shareId.toLowerCase(), key, context(r)); }
}

@ApiTags('Assigned assessment care') @ApiBearerAuth('bearerAuth') @RequireRoles('DOCTOR') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW) @UseGuards(CoupleLinkRateGuard)
@ApiErrorResponse(400, 'Validated bounded query required.') @ApiErrorResponse(401, 'Current live physician session required.') @ApiErrorResponse(403, 'Qualified physician with explicit current clinical view required.') @ApiErrorResponse(404, 'Assigned active appointment context unavailable.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.') @ApiErrorResponse(503, 'Clinical audit unavailable.')
@Controller('clinical/appointments')
export class AssignedAssessmentCareController {
  constructor(private readonly care: AssessmentCareService) {}
  @Get(':appointmentId/assessment-context') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'appointmentId', format: 'uuid' }) @ApiOperation({ operationId: 'assignedAssessmentCareContext', summary: 'Read current patient-authorized own summaries for this assigned physician within the consultation window; no raw responses/score' }) @ApiOkResponse({ type: AssignedAssessmentContextDto })
  get(@Param('appointmentId', uuid()) id: string, @Query() query: AssessmentCarePageQueryDto, @Req() r: AuthenticatedRequest) { return this.care.clinician(id.toLowerCase(), query, context(r)); }
}
