import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { TreatmentProgressResponseDto } from './treatment-progress-response.dto';
import { TreatmentProgressService } from './treatment-progress.service';

@ApiTags('Admin treatment progress')
@ApiBearerAuth('bearerAuth')
@ApiParam({ name: 'patientId', format: 'uuid' })
@ApiParam({ name: 'planId', format: 'uuid' })
@Controller('admin/patients/:patientId/treatment-plans/:planId/progress')
export class AdminTreatmentProgressController {
  constructor(private readonly progress: TreatmentProgressService) {}
  @Get() @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW) @ApiQuery({ name: 'cursor', required: false, format: 'uuid' }) @ApiQuery({ name: 'limit', required: false, minimum: 1, maximum: 100 }) @ApiOperation({ operationId: 'adminTreatmentProgressGet', summary: 'Get authorized real treatment progress and timeline' }) @ApiOkResponse({ type: TreatmentProgressResponseDto })
  get(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string, @Query('cursor', new ParseUUIDPipe({ version: '4', optional: true })) cursor: string | undefined, @Query('limit', new ParseIntPipe({ optional: true })) limit: number | undefined, @Req() request: AuthenticatedRequest) { return this.progress.admin(patientId, planId, this.context(request), cursor, limit); }
  private context(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip, roles: request.auth.roles }; }
}
