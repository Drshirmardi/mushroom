import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { RecordMedicationAdherenceDto } from './treatment-activity.dto';
import { MedicationAdherenceResponseDto, TreatmentTaskListResponseDto, TreatmentTaskResponseDto } from './treatment-activity-response.dto';
import { TreatmentActivityService } from './treatment-activity.service';

@ApiTags('Patient treatment activity')
@ApiBearerAuth('bearerAuth')
@RequireRoles('PATIENT')
@Controller('patients/me/treatment')
export class PatientTreatmentActivityController {
  constructor(private readonly activity: TreatmentActivityService) {}

  @Get('tasks')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiOperation({ operationId: 'patientTreatmentTasksList', summary: 'List the patient scheduled treatment tasks' })
  @ApiOkResponse({ type: TreatmentTaskListResponseDto })
  listTasks(@Req() request: AuthenticatedRequest) { return this.activity.listPatient(request.auth.userId, this.context(request)); }

  @Post('tasks/:taskId/complete')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOperation({ operationId: 'patientTreatmentTasksComplete', summary: 'Complete one permitted treatment task repeat-safely' })
  @ApiOkResponse({ type: TreatmentTaskResponseDto })
  completeTask(@Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string, @Req() request: AuthenticatedRequest) { return this.activity.completeTask(request.auth.userId, taskId, this.context(request)); }

  @Post('medications/:medicationId/adherence')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiParam({ name: 'medicationId', format: 'uuid' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ operationId: 'patientMedicationAdherenceRecord', summary: 'Record permitted medication adherence idempotently' })
  @ApiOkResponse({ type: MedicationAdherenceResponseDto })
  recordAdherence(@Param('medicationId', new ParseUUIDPipe({ version: '4' })) medicationId: string, @Body() body: RecordMedicationAdherenceDto, @Headers('idempotency-key') idempotencyKey: string | string[] | undefined, @Req() request: AuthenticatedRequest) { return this.activity.recordMedicationAdherence(request.auth.userId, medicationId, body, idempotencyKey, this.context(request)); }

  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
