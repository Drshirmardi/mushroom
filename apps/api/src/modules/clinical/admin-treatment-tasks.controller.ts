import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { CreateTreatmentTaskDto, RescheduleTreatmentTaskDto } from './treatment-activity.dto';
import { TreatmentTaskListResponseDto, TreatmentTaskResponseDto } from './treatment-activity-response.dto';
import { TreatmentActivityService } from './treatment-activity.service';

@ApiTags('Admin treatment tasks')
@ApiBearerAuth('bearerAuth')
@ApiParam({ name: 'patientId', format: 'uuid' })
@ApiParam({ name: 'planId', format: 'uuid' })
@Controller('admin/patients/:patientId/treatment-plans/:planId/tasks')
export class AdminTreatmentTasksController {
  constructor(private readonly activity: TreatmentActivityService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW)
  @ApiOperation({ operationId: 'adminTreatmentTasksList', summary: 'List authorized treatment-task occurrences' })
  @ApiOkResponse({ type: TreatmentTaskListResponseDto })
  list(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Req() request: AuthenticatedRequest) { return this.activity.listAdmin(patientId, planId, this.actor(request)); }

  @Post()
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiOperation({ operationId: 'adminTreatmentTasksCreate', summary: 'Schedule a one-off medication or exercise task' })
  @ApiOkResponse({ type: TreatmentTaskResponseDto })
  create(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Body() body: CreateTreatmentTaskDto, @Req() request: AuthenticatedRequest) { return this.activity.createTask(patientId, planId, body, this.actor(request)); }

  @Patch(':taskId')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentTasksReschedule', summary: 'Reschedule a scheduled treatment task' })
  @ApiOkResponse({ type: TreatmentTaskResponseDto })
  reschedule(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string, @Body() body: RescheduleTreatmentTaskDto, @Req() request: AuthenticatedRequest) { return this.activity.rescheduleTask(patientId, planId, taskId, body, this.actor(request)); }

  @Post(':taskId/cancel')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentTasksCancel', summary: 'Cancel a scheduled treatment task' })
  @ApiOkResponse({ type: TreatmentTaskResponseDto })
  cancel(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string, @Req() request: AuthenticatedRequest) { return this.activity.cancelTask(patientId, planId, taskId, this.actor(request)); }

  private actor(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip, roles: request.auth.roles }; }
}
