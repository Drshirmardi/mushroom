import { Body, Controller, Headers, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { CreatePatientAppointmentDto, PatientAppointmentResponseDto } from './patient-appointments.dto';
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
}
