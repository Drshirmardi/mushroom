import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { PatientAvailabilityQueryDto, PatientAvailabilityResponseDto } from './patient-availability.dto';
import { PatientAvailabilityService } from './patient-availability.service';

@ApiTags('Patient Availability') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @RequirePermissions(PERMISSIONS.AVAILABILITY_READ_SELF) @Controller('directory/doctor-services')
export class PatientAvailabilityController {
  constructor(private readonly availability: PatientAvailabilityService) {}
  @Get(':doctorServiceId/availability') @ApiOperation({ operationId: 'patientDoctorServiceAvailabilityGet', summary: 'Get on-demand availability for a visible doctor service' }) @ApiParam({ name: 'doctorServiceId', format: 'uuid' }) @ApiOkResponse({ type: PatientAvailabilityResponseDto })
  get(@Param('doctorServiceId', new ParseUUIDPipe({ version: '4' })) id: string, @Query() query: PatientAvailabilityQueryDto, @Req() request: AuthenticatedRequest) { return this.availability.get(request.auth.userId, id, query); }
}
