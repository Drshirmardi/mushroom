import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { TreatmentProgressResponseDto } from './treatment-progress-response.dto';
import { TreatmentProgressService } from './treatment-progress.service';

@ApiTags('Patient treatment progress')
@ApiBearerAuth('bearerAuth')
@RequireRoles('PATIENT')
@Controller('patients/me/treatment-plans/:planId/progress')
export class PatientTreatmentProgressController {
  constructor(private readonly progress: TreatmentProgressService) {}
  @Get() @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF) @ApiParam({ name: 'planId', format: 'uuid' }) @ApiQuery({ name: 'cursor', required: false, format: 'uuid' }) @ApiQuery({ name: 'limit', required: false, minimum: 1, maximum: 100 }) @ApiOperation({ operationId: 'patientTreatmentProgressGet', summary: 'Get the authenticated patient real treatment progress and timeline' }) @ApiOkResponse({ type: TreatmentProgressResponseDto })
  get(@Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Query('cursor', new ParseUUIDPipe({ version: '4', optional: true })) cursor: string | undefined, @Query('limit', new ParseIntPipe({ optional: true })) limit: number | undefined, @Req() request: AuthenticatedRequest) { return this.progress.patient(request.auth.userId, planId, { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }, cursor, limit); }
}
