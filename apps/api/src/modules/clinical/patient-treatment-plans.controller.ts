import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { TreatmentPlanListResponseDto, TreatmentPlanResponseDto } from './treatment-plan-response.dto';
import { TreatmentPlanService } from './treatment-plan.service';

@ApiTags('Patient treatment plans')
@ApiBearerAuth('bearerAuth')
@RequireRoles('PATIENT')
@Controller('patients/me/treatment-plans')
export class PatientTreatmentPlansController {
  constructor(private readonly treatmentPlans: TreatmentPlanService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiOperation({ operationId: 'patientTreatmentPlansList', summary: 'List the patient permitted active or completed treatment plans' })
  @ApiOkResponse({ type: TreatmentPlanListResponseDto })
  list(@Req() request: AuthenticatedRequest) { return this.treatmentPlans.listPatient(request.auth.userId, this.context(request)); }

  @Get(':planId')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF)
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiOperation({ operationId: 'patientTreatmentPlansGet', summary: 'Get a patient permitted active or completed treatment plan' })
  @ApiOkResponse({ type: TreatmentPlanResponseDto })
  get(@Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.getPatient(request.auth.userId, planId, this.context(request)); }

  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }; }
}
