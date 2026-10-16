import { Controller, Get, Header, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { PatientJourneyResponseDto } from './patient-journey.dto';
import { PatientJourneyService } from './patient-journey.service';

@ApiTags('Patient Journey')
@ApiBearerAuth('bearerAuth')
@RequireRoles('PATIENT')
@Controller('patients/me/journey')
export class PatientJourneyController {
  constructor(private readonly journey: PatientJourneyService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(PERMISSIONS.PATIENT_PROFILE_READ_SELF, PERMISSIONS.PATIENT_INTAKE_READ_SELF,
    PERMISSIONS.ASSESSMENTS_READ_SELF, PERMISSIONS.APPOINTMENTS_READ_SELF, PERMISSIONS.COMMERCE_READ_SELF,
    PERMISSIONS.WALLET_READ_SELF, PERMISSIONS.CONTENT_READ_SELF)
  @ApiOperation({ operationId: 'patientJourneyGet', summary: 'Get derived patient Home state and next action' })
  @ApiOkResponse({ type: PatientJourneyResponseDto })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Patient self access is required.')
  @ApiErrorResponse(404, 'Patient profile was not found.')
  @ApiErrorResponse(503, 'Sensitive audit is unavailable.')
  get(@Req() request: AuthenticatedRequest) {
    return this.journey.get(request.auth.userId, { actorUserId: request.auth.userId,
      actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip });
  }
}
