import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { PatientBookingEligibilityResponseDto } from './patient-booking-eligibility.dto';
import { PatientBookingEligibilityService } from './patient-booking-eligibility.service';
@ApiTags('Patient Booking') @ApiBearerAuth('bearerAuth') @RequireRoles('PATIENT') @Controller('patients/me')
export class PatientBookingEligibilityController { constructor(private readonly eligibility: PatientBookingEligibilityService) {} @Get('booking-eligibility') @RequirePermissions(PERMISSIONS.ASSESSMENTS_READ_SELF) @ApiOperation({ operationId: 'patientBookingEligibilityGet', summary: 'Get booking eligibility without using assessment score' }) @ApiOkResponse({ type: PatientBookingEligibilityResponseDto }) get(@Req() request: AuthenticatedRequest) { return this.eligibility.get(request.auth.userId); } }
