import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { PatientClinicalHistoryService } from './patient-clinical-history.service';
import { PatientClinicalItemResponseDto, PatientClinicalListResponseDto } from './clinical-response.dto';

@ApiTags('Patient clinical history')
@ApiBearerAuth('bearerAuth')
@Controller('patients/me/clinical')
export class PatientClinicalController {
  constructor(private readonly clinicalHistory: PatientClinicalHistoryService) {}

  @Get('timeline')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiOperation({ operationId: 'patientClinicalTimeline', summary: 'List permitted patient clinical timeline' })
  @ApiOkResponse({ type: PatientClinicalListResponseDto })
  timeline(@Req() request: AuthenticatedRequest) { return this.clinicalHistory.auditedTimeline(request.auth.userId, this.context(request)); }

  @Get('history')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiOperation({ operationId: 'patientClinicalHistory', summary: 'List permitted patient clinical history' })
  @ApiOkResponse({ type: PatientClinicalListResponseDto })
  history(@Req() request: AuthenticatedRequest) { return this.clinicalHistory.auditedHistory(request.auth.userId, this.context(request)); }

  @Get('appointments/:appointmentId/summary')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiOperation({ operationId: 'patientClinicalAppointmentSummary', summary: 'Get permitted patient visit summary' })
  @ApiParam({ name: 'appointmentId', format: 'uuid' })
  @ApiOkResponse({ type: PatientClinicalItemResponseDto })
  summary(@Param('appointmentId', new ParseUUIDPipe({ version: '4' })) appointmentId: string, @Req() request: AuthenticatedRequest) { return this.clinicalHistory.auditedSummary(request.auth.userId, appointmentId, this.context(request)); }

  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
