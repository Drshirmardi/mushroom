import { BadRequestException, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { CoupleLinkRateGuard } from '../../assessments/couples/couple-link.controller';
import { AssignedAppointmentService } from './assigned-appointment.service';
import { AssignedAppointmentPageDto, AssignedAppointmentQueryDto, AssignedConsultationContextDto } from './assigned-appointment.dto';
const context = (r: AuthenticatedRequest) => ({ actorUserId: r.auth.userId, actorSessionId: r.auth.sessionId, requestId: r.id, ipAddress: r.ip });
const uuid = () => new ParseUUIDPipe({ version: '4' });
const emptyBody = (r: AuthenticatedRequest) => { if (r.body != null && (typeof r.body !== 'object' || Array.isArray(r.body) || Object.keys(r.body).length)) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'No patient, doctor, status or consultation body input is accepted.', details: {} }); };
@ApiTags('Assigned consultation operations') @ApiBearerAuth('bearerAuth') @RequireRoles('DOCTOR') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW) @UseGuards(CoupleLinkRateGuard)
@ApiErrorResponse(400, 'Strict bounded query or empty mutation body required.') @ApiErrorResponse(401, 'Active physician session required.') @ApiErrorResponse(403, 'Current qualified physician clinical capability required.') @ApiErrorResponse(404, 'Assigned consultation unavailable.') @ApiErrorResponse(409, 'Current visit state, window or doctor operation conflict.') @ApiErrorResponse(429, 'Authenticated request limit exceeded.') @ApiErrorResponse(503, 'Clinical audit unavailable.')
@Controller('clinical/appointments')
export class AssignedAppointmentController {
  constructor(private readonly appointments: AssignedAppointmentService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'assignedAppointmentsList', summary: 'List only current physician assigned visit metadata; no medical or financial payload' }) @ApiOkResponse({ type: AssignedAppointmentPageDto })
  list(@Query() query: AssignedAppointmentQueryDto, @Req() r: AuthenticatedRequest) { return this.appointments.list(query, context(r)); }
  @Get(':appointmentId/consultation-context') @Header('Cache-Control', 'private, no-store') @ApiParam({ name: 'appointmentId', format: 'uuid' }) @ApiOperation({ operationId: 'assignedConsultationContext', summary: 'Read assigned operational visit/encounter/text references and current actions without creating a session' }) @ApiOkResponse({ type: AssignedConsultationContextDto })
  get(@Param('appointmentId', uuid()) id: string, @Req() r: AuthenticatedRequest) { return this.appointments.get(id.toLowerCase(), context(r)); }
  @Post(':appointmentId/start') @HttpCode(200) @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT) @ApiParam({ name: 'appointmentId', format: 'uuid' }) @ApiOperation({ operationId: 'assignedConsultationStart', summary: 'Start only this physician checked-in/queued appointment using the existing atomic visit workflow' }) @ApiOkResponse({ type: AssignedConsultationContextDto })
  start(@Param('appointmentId', uuid()) id: string, @Req() r: AuthenticatedRequest) { emptyBody(r); return this.appointments.transition(id.toLowerCase(), 'START', context(r)); }
  @Post(':appointmentId/complete') @HttpCode(200) @Header('Cache-Control', 'private, no-store') @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT) @ApiParam({ name: 'appointmentId', format: 'uuid' }) @ApiOperation({ operationId: 'assignedConsultationComplete', summary: 'Complete only this physician current encounter using the existing atomic visit workflow' }) @ApiOkResponse({ type: AssignedConsultationContextDto })
  complete(@Param('appointmentId', uuid()) id: string, @Req() r: AuthenticatedRequest) { emptyBody(r); return this.appointments.transition(id.toLowerCase(), 'COMPLETE', context(r)); }
}
