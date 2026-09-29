import { Body, Controller, Get, Headers, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { AdminPatientsService } from './admin-patients.service';
import { AdminMedicalIntakeCorrectionDto, AdminMedicalIntakeRevisionResponseDto, AdminOnboardingSummaryResponseDto, AdminPatientCreateResponseDto, AdminPatientDetailResponseDto, AdminPatientListQueryDto, AdminPatientListResponseDto, AdminPatientProfileUpdateResponseDto, CreateAdminPatientDto, PatientReportingQueryDto, PatientReportingResponseDto, UpdateAdminPatientDto } from './admin-patients.dto';

@ApiTags('Admin Patients')
@ApiBearerAuth('bearerAuth')
@Controller('admin/patients')
export class AdminPatientsController {
  constructor(private readonly patients: AdminPatientsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  @ApiOperation({ operationId: 'adminPatientsList', summary: 'List and search patients' })
  @ApiOkResponse({ type: AdminPatientListResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'List query is invalid.')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  list(@Query() query: AdminPatientListQueryDto) { return this.patients.list(query); }

  @Get('onboarding-summary')
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  @ApiOperation({ operationId: 'adminPatientsOnboardingSummary', summary: 'Get patient onboarding summary' })
  @ApiOkResponse({ type: AdminOnboardingSummaryResponseDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  summary() { return this.patients.summary(); }

  @Post()
  @RequirePermissions(PERMISSIONS.PATIENTS_CREATE)
  @ApiOperation({ operationId: 'adminPatientsCreate', summary: 'Create a patient profile on behalf of a patient' })
  @ApiOkResponse({ type: AdminPatientCreateResponseDto })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.')
  @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Patient profile input is invalid.')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Phone number is already registered.')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  create(@Body() body: CreateAdminPatientDto, @Req() request: AuthenticatedRequest) {
    return this.patients.create(body, this.context(request));
  }

  @Get(':patientId')
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  @ApiOperation({ operationId: 'adminPatientsGet', summary: 'Get an admin patient detail view' })
  @ApiParam({ name: 'patientId', format: 'uuid' })
  @ApiOkResponse({ type: AdminPatientDetailResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Patient id is invalid.')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Patient profile was not found.')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  get(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Req() request: AuthenticatedRequest) {
    return this.patients.get(patientId, this.context(request));
  }

  @Patch(':patientId')
  @RequirePermissions(PERMISSIONS.PATIENTS_UPDATE)
  @ApiOperation({ operationId: 'adminPatientsUpdate', summary: 'Update a patient non-medical profile' })
  @ApiParam({ name: 'patientId', format: 'uuid' })
  @ApiOkResponse({ type: AdminPatientProfileUpdateResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Patient id is invalid.')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Patient profile was not found.')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Patient profile input is invalid.')
  update(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Body() body: UpdateAdminPatientDto, @Req() request: AuthenticatedRequest) {
    return this.patients.update(patientId, body, this.context(request));
  }

  @Patch(':patientId/medical-intake')
  @RequirePermissions(PERMISSIONS.PATIENTS_INTAKE_UPDATE)
  @ApiOperation({ operationId: 'adminPatientsCorrectIntake', summary: 'Correct a self-reported medical intake revision' })
  @ApiParam({ name: 'patientId', format: 'uuid' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', maxLength: 255 } })
  @ApiOkResponse({ type: AdminMedicalIntakeRevisionResponseDto })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Patient id is invalid.')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Patient profile was not found.')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Current consent or permission is missing.')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Revision conflict or an idempotency key reuse conflict occurred.')
  @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Medical correction input is invalid.')
  correct(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Body() body: AdminMedicalIntakeCorrectionDto, @Headers('idempotency-key') idempotencyKey: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.patients.correctIntake(patientId, body, idempotencyKey, this.context(request));
  }

  private context(request: AuthenticatedRequest) {
    return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip };
  }
}

@ApiTags('Admin Reporting')
@ApiBearerAuth('bearerAuth')
@RequireRoles('ADMIN')
@RequirePermissions(PERMISSIONS.PATIENTS_READ)
@Controller('admin/reporting/patients')
export class AdminPatientReportingController {
  constructor(private readonly patients: AdminPatientsService) {}

  @Get()
  @ApiOperation({ operationId: 'adminReportingPatientsGet', summary: 'Get clinic-scoped patient reporting aggregates' })
  @ApiOkResponse({ type: PatientReportingResponseDto })
  report(@Query() query: PatientReportingQueryDto) { return this.patients.report(query); }
}
