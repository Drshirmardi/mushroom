import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { CancelPatientAppointmentDto, CreatePatientAppointmentDto, PatientAppointmentListQueryDto, PatientAppointmentPageResponseDto, PatientAppointmentResponseDto, ReschedulePatientAppointmentDto } from './patient-appointments.dto';
import { PatientAppointmentsService } from './patient-appointments.service';

@ApiTags('Patient appointments')
@ApiBearerAuth('bearerAuth')
@Controller('appointments')
export class PatientAppointmentsController {
  constructor(private readonly appointments: PatientAppointmentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_CREATE_SELF)
  @ApiOperation({ operationId: 'patientAppointmentsCreate', summary: 'Create a pending appointment from a current patient-visible slot' })
  @ApiCreatedResponse({ type: PatientAppointmentResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'The idempotency key was reused or the slot is no longer available.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Booking eligibility no longer permits this appointment.' })
  create(@Body() body: CreatePatientAppointmentDto, @Headers('idempotency-key') key: string | string[] | undefined, @Req() request: AuthenticatedRequest) {
    return this.appointments.create(request.auth.userId, body, key);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiOperation({ operationId: 'patientAppointmentsList', summary: 'List the authenticated patient appointments' })
  @ApiOkResponse({ type: PatientAppointmentPageResponseDto })
  list(@Query() query: PatientAppointmentListQueryDto, @Req() request: AuthenticatedRequest) { return this.appointments.list(request.auth.userId, query); }

  @Get(':appointmentId')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiOperation({ operationId: 'patientAppointmentsGet', summary: 'Get an authenticated patient appointment' })
  @ApiOkResponse({ type: PatientAppointmentResponseDto })
  get(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.appointments.get(request.auth.userId, id); }

  @Post(':appointmentId/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_CHANGE_SELF)
  @ApiOperation({ operationId: 'patientAppointmentsCancel', summary: 'Cancel an eligible patient appointment' })
  @ApiOkResponse({ type: PatientAppointmentResponseDto })
  cancel(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: CancelPatientAppointmentDto, @Req() request: AuthenticatedRequest) { return this.appointments.cancel(request.auth.userId, id, body.reason); }

  @Post(':appointmentId/reschedule')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_CHANGE_SELF)
  @ApiOperation({ operationId: 'patientAppointmentsReschedule', summary: 'Reschedule an eligible patient appointment' })
  @ApiOkResponse({ type: PatientAppointmentResponseDto })
  reschedule(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: ReschedulePatientAppointmentDto, @Req() request: AuthenticatedRequest) { return this.appointments.reschedule(request.auth.userId, id, body); }
}
