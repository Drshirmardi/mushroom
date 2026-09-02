import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { AdminAppointmentsService } from './admin-appointments.service';
import { AdminAppointmentListQueryDto, AdminAppointmentPageResponseDto, AdminAppointmentResponseDto, CancelAdminAppointmentDto, CreateAdminAppointmentDto, RescheduleAdminAppointmentDto } from './admin-appointments.dto';

@ApiTags('Admin appointments')
@ApiBearerAuth('bearerAuth')
@Controller('admin/appointments')
@RequirePermissions(PERMISSIONS.APPOINTMENTS_MANAGE)
export class AdminAppointmentsController {
  constructor(private readonly appointments: AdminAppointmentsService) {}
  @Post() @ApiOperation({ operationId: 'adminAppointmentsCreate', summary: 'Create a pending appointment for a clinic patient' }) @ApiCreatedResponse({ type: AdminAppointmentResponseDto }) create(@Body() body: CreateAdminAppointmentDto, @Headers('idempotency-key') key: string | string[] | undefined, @Req() request: AuthenticatedRequest) { return this.appointments.create(request.auth.userId, body, key); }
  @Get() @ApiOperation({ operationId: 'adminAppointmentsList', summary: 'List clinic appointments with operational filters' }) @ApiOkResponse({ type: AdminAppointmentPageResponseDto }) list(@Query() query: AdminAppointmentListQueryDto) { return this.appointments.list(query); }
  @Post(':appointmentId/confirm') @HttpCode(HttpStatus.OK) @ApiOperation({ operationId: 'adminAppointmentsConfirm', summary: 'Confirm a future pending appointment' }) @ApiOkResponse({ type: AdminAppointmentResponseDto }) confirm(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: AuthenticatedRequest) { return this.appointments.confirm(request.auth.userId, id); }
  @Post(':appointmentId/cancel') @HttpCode(HttpStatus.OK) @ApiOperation({ operationId: 'adminAppointmentsCancel', summary: 'Cancel an appointment under administrator policy' }) @ApiOkResponse({ type: AdminAppointmentResponseDto }) cancel(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: CancelAdminAppointmentDto, @Req() request: AuthenticatedRequest) { return this.appointments.cancel(request.auth.userId, id, body.reason); }
  @Post(':appointmentId/reschedule') @HttpCode(HttpStatus.OK) @ApiOperation({ operationId: 'adminAppointmentsReschedule', summary: 'Reschedule an appointment and return it to pending confirmation' }) @ApiOkResponse({ type: AdminAppointmentResponseDto }) reschedule(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: RescheduleAdminAppointmentDto, @Req() request: AuthenticatedRequest) { return this.appointments.reschedule(request.auth.userId, id, body); }
}
