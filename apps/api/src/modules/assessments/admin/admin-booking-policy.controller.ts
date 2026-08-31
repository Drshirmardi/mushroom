import { Body, Controller, Get, HttpStatus, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import { BookingAssessmentPolicyResponseDto, UpdateBookingAssessmentPolicyDto } from './admin-booking-policy.dto';
import { AdminBookingPolicyService } from './admin-booking-policy.service';

@ApiTags('Admin Booking Policy')
@ApiBearerAuth('bearerAuth')
@Controller('admin/clinic/patient-policy')
export class AdminBookingPolicyController {
  constructor(private readonly policy: AdminBookingPolicyService) {}

  @Get() @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminBookingAssessmentPolicyGet', summary: 'Get the clinic booking assessment policy' }) @ApiOkResponse({ type: BookingAssessmentPolicyResponseDto }) @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Authentication is required.') @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Required permission is missing.')
  get() { return this.policy.get(); }

  @Patch() @RequirePermissions(PERMISSIONS.ASSESSMENTS_MANAGE) @ApiOperation({ operationId: 'adminBookingAssessmentPolicyUpdate', summary: 'Update the clinic booking assessment policy' }) @ApiOkResponse({ type: BookingAssessmentPolicyResponseDto }) @ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, 'Booking policy input is invalid.') @ApiErrorResponse(HttpStatus.CONFLICT, 'The required assessment version is invalid.')
  update(@Body() body: UpdateBookingAssessmentPolicyDto, @Req() request: AuthenticatedRequest) { return this.policy.update(body, { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip }); }
}
