import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { HealthObservationsService } from './health-observations.service';
import { CreateHealthObservationDto, HealthObservationListResponseDto, HealthObservationQueryDto, HealthObservationResponseDto } from './health-observations.dto';

const context = (request: AuthenticatedRequest) => ({ actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip });

@ApiTags('Health observations') @ApiBearerAuth('bearerAuth')
@Controller()
export class HealthObservationsController {
  constructor(private readonly observations: HealthObservationsService) {}
  @Post('patients/me/health-observations') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_WRITE_SELF) @ApiOperation({ operationId: 'patientHealthObservationCreate', summary: 'Record one permitted health observation' }) @ApiCreatedResponse({ type: HealthObservationResponseDto })
  create(@Body() body: CreateHealthObservationDto, @Req() request: AuthenticatedRequest) { return this.observations.create(request.auth.userId, body, context(request)); }
  @Get('patients/me/health-observations') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @ApiOperation({ operationId: 'patientHealthObservationsList', summary: 'List own health observations' }) @ApiOkResponse({ type: HealthObservationListResponseDto })
  own(@Query() query: HealthObservationQueryDto, @Req() request: AuthenticatedRequest) { return this.observations.own(request.auth.userId, query, context(request)); }
  @Get('admin/patients/:patientId/health-observations') @RequirePermissions(PERMISSIONS.PATIENTS_READ) @ApiOperation({ operationId: 'adminHealthObservationsList', summary: 'List authorized patient health observations' }) @ApiOkResponse({ type: HealthObservationListResponseDto })
  admin(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Query() query: HealthObservationQueryDto, @Req() request: AuthenticatedRequest) { return this.observations.admin(patientId, request.auth.userId, query, context(request)); }
}
