import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../../common/errors/api-error-response.decorator';
import { CoupleLinkRateGuard } from '../couple-link.controller';
import { CoupleAssessmentService } from './couple-assessment.service';
import { CoupleAssessmentConsentDto, CoupleAssessmentCreateDto, CoupleAssessmentDetailDto, CoupleAssessmentDto, CoupleAssessmentPageDto, CoupleAssessmentQueryDto } from './couple-assessment.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Couple Assessment Participation') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @UseGuards(CoupleLinkRateGuard)
@ApiErrorResponse(400, 'Invalid input.') @ApiErrorResponse(401, 'Independent active session required.') @ApiErrorResponse(403, 'Patient self access required.') @ApiErrorResponse(404, 'Owned context unavailable.') @ApiErrorResponse(409, 'Exact context or consent changed.') @ApiErrorResponse(422, 'Explicit adult consent required.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.')
@Controller('patients/me/couple-assessments')
export class CoupleAssessmentController {
  constructor(private readonly assessments: CoupleAssessmentService) {}
  @Post() @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.PATIENT_INTAKE_READ_SELF)
  @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientCoupleAssessmentCreate', summary: 'Create an exact two-person consent context; no payment or processing access' }) @ApiCreatedResponse({ type: CoupleAssessmentDto })
  create(@Body() body: CoupleAssessmentCreateDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.assessments.create(body, key, context(r)); }
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientCoupleAssessmentList', summary: 'List minimized own contexts; detail readiness must be checked separately' }) @ApiOkResponse({ type: CoupleAssessmentPageDto })
  list(@Query() query: CoupleAssessmentQueryDto, @Req() r: AuthenticatedRequest) { return this.assessments.list(query, context(r)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ operationId: 'patientCoupleAssessmentGet', summary: 'Review the exact processing and joint disclosure policies for an owned pair context' }) @ApiOkResponse({ type: CoupleAssessmentDetailDto })
  get(@Param('id', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.assessments.get(id, context(r)); }
  @Post(':id/consent') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF, PERMISSIONS.PATIENT_INTAKE_READ_SELF)
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientCoupleAssessmentConsentAccept', summary: 'Independently accept joint disclosure for this exact linked partner and source' }) @ApiCreatedResponse({ type: CoupleAssessmentDto })
  accept(@Param('id', uuid()) id: string, @Body() body: CoupleAssessmentConsentDto, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.assessments.accept(id, body, key, context(r)); }
  @Post(':id/consent-withdrawal') @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF)
  @ApiParam({ name: 'id', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiOperation({ operationId: 'patientCoupleAssessmentConsentWithdraw', summary: 'Finally withdraw own context sharing permission without refund or medical-record deletion' }) @ApiCreatedResponse({ type: CoupleAssessmentDto })
  withdraw(@Param('id', uuid()) id: string, @Headers('idempotency-key') key: string | undefined, @Req() r: AuthenticatedRequest) { return this.assessments.withdraw(id, key, context(r)); }
}
