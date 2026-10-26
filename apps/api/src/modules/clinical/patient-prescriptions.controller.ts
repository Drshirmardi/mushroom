import { Controller, Get, Header, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { PrescriptionService } from './prescription.service';
import { PrescriptionListResponseDto } from './prescription-response.dto';

@ApiTags('Patient prescriptions') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT')
@RequirePermissions(PERMISSIONS.APPOINTMENTS_READ_SELF) @Controller('patients/me/prescriptions')
export class PatientPrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @ApiOperation({ operationId: 'patientPrescriptionsList' })
  @ApiQuery({ name: 'cursor', required: false, format: 'uuid' }) @ApiOkResponse({ type: PrescriptionListResponseDto })
  list(@Query('cursor', new ParseUUIDPipe({ version: '4', optional: true })) cursor: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.prescriptions.patientList(request.auth.userId, { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip, roles: request.auth.roles }, cursor);
  }
}
