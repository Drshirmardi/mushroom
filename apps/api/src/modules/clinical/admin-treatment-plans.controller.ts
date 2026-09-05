import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { CreateTreatmentPlanDto, ExercisePlanDto, NutritionPlanDto, TreatmentMedicationDto, TreatmentSessionPlanDto, UpdateExercisePlanDto, UpdateNutritionPlanDto, UpdateTreatmentMedicationDto, UpdateTreatmentPlanDto, UpdateTreatmentSessionPlanDto } from './treatment-plan.dto';
import { ExercisePlanResponseDto, NutritionPlanResponseDto, TreatmentMedicationResponseDto, TreatmentPlanListResponseDto, TreatmentPlanResponseDto, TreatmentSessionPlanResponseDto } from './treatment-plan-response.dto';
import { TreatmentPlanService } from './treatment-plan.service';

@ApiTags('Admin treatment plans')
@ApiBearerAuth('bearerAuth')
@ApiParam({ name: 'patientId', format: 'uuid' })
@Controller('admin/patients/:patientId/treatment-plans')
export class AdminTreatmentPlansController {
  constructor(private readonly treatmentPlans: TreatmentPlanService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW)
  @ApiOperation({ operationId: 'adminTreatmentPlansList', summary: 'List authorized patient treatment plans' })
  @ApiOkResponse({ type: TreatmentPlanListResponseDto })
  list(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.list(patientId, this.actor(request)); }

  @Post()
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiOperation({ operationId: 'adminTreatmentPlansCreate', summary: 'Create an authorized treatment-plan definition' })
  @ApiOkResponse({ type: TreatmentPlanResponseDto })
  create(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Body() body: CreateTreatmentPlanDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.create(patientId, body, this.actor(request)); }

  @Get(':planId')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW)
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlansGet', summary: 'Get an authorized treatment-plan definition' })
  @ApiOkResponse({ type: TreatmentPlanResponseDto })
  get(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.get(patientId, planId, this.actor(request)); }

  @Patch(':planId')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlansUpdate', summary: 'Update an editable treatment-plan definition' })
  @ApiOkResponse({ type: TreatmentPlanResponseDto })
  update(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Body() body: UpdateTreatmentPlanDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.update(patientId, planId, body, this.actor(request)); }

  @Post(':planId/medications')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlanMedicationsCreate', summary: 'Add a treatment medication definition without schedule execution' })
  @ApiOkResponse({ type: TreatmentMedicationResponseDto })
  createMedication(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Body() body: TreatmentMedicationDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.createMedication(patientId, planId, body, this.actor(request)); }

  @Patch(':planId/medications/:medicationId')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' }) @ApiParam({ name: 'medicationId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlanMedicationsUpdate', summary: 'Update an editable treatment medication definition' })
  @ApiOkResponse({ type: TreatmentMedicationResponseDto })
  updateMedication(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Param('medicationId', new ParseUUIDPipe({ version: '4' })) medicationId: string, @Body() body: UpdateTreatmentMedicationDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.updateMedication(patientId, planId, medicationId, body, this.actor(request)); }

  @Post(':planId/sessions')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlanSessionsCreate', summary: 'Add an ordered clinical session definition without scheduling' })
  @ApiOkResponse({ type: TreatmentSessionPlanResponseDto })
  createSession(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Body() body: TreatmentSessionPlanDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.createSessionPlan(patientId, planId, body, this.actor(request)); }

  @Patch(':planId/sessions/:sessionId')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' }) @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlanSessionsUpdate', summary: 'Update an ordered clinical session definition without scheduling' })
  @ApiOkResponse({ type: TreatmentSessionPlanResponseDto })
  updateSession(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string, @Body() body: UpdateTreatmentSessionPlanDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.updateSessionPlan(patientId, planId, sessionId, body, this.actor(request)); }

  @Post(':planId/exercises')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlanExercisesCreate', summary: 'Add an exercise definition without schedule execution' })
  @ApiOkResponse({ type: ExercisePlanResponseDto })
  createExercise(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Body() body: ExercisePlanDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.createExercisePlan(patientId, planId, body, this.actor(request)); }

  @Patch(':planId/exercises/:exerciseId')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' }) @ApiParam({ name: 'exerciseId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlanExercisesUpdate', summary: 'Update an editable exercise definition' })
  @ApiOkResponse({ type: ExercisePlanResponseDto })
  updateExercise(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Param('exerciseId', new ParseUUIDPipe({ version: '4' })) exerciseId: string, @Body() body: UpdateExercisePlanDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.updateExercisePlan(patientId, planId, exerciseId, body, this.actor(request)); }

  @Post(':planId/nutrition')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlanNutritionCreate', summary: 'Add a nutrition definition' })
  @ApiOkResponse({ type: NutritionPlanResponseDto })
  createNutrition(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Body() body: NutritionPlanDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.createNutritionPlan(patientId, planId, body, this.actor(request)); }

  @Patch(':planId/nutrition/:nutritionId')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'planId', format: 'uuid' }) @ApiParam({ name: 'nutritionId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminTreatmentPlanNutritionUpdate', summary: 'Update an editable nutrition definition' })
  @ApiOkResponse({ type: NutritionPlanResponseDto })
  updateNutrition(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Param('nutritionId', new ParseUUIDPipe({ version: '4' })) nutritionId: string, @Body() body: UpdateNutritionPlanDto, @Req() request: AuthenticatedRequest) { return this.treatmentPlans.updateNutritionPlan(patientId, planId, nutritionId, body, this.actor(request)); }

  private actor(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip, roles: request.auth.roles }; }
}
