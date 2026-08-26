import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../common/errors/api-error-response.decorator';
import {
  OnboardingStatusResponseDto,
  SelfProfileResponseDto,
  UpdateSelfProfileDto,
} from './dto/self-profile.dto';
import { SelfProfileService } from './self-profile.service';

@ApiTags('Patient self profile')
@ApiBearerAuth('bearerAuth')
@Controller('patients/me')
@RequireRoles('PATIENT')
export class SelfProfileController {
  constructor(private readonly profiles: SelfProfileService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENT_PROFILE_READ_SELF)
  @ApiOperation({ operationId: 'patientGetSelfProfile', summary: 'Get self profile' })
  @ApiOkResponse({ type: SelfProfileResponseDto })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Patient access is required.')
  async get(@Req() request: AuthenticatedRequest) {
    return this.profiles.get(request.auth.userId);
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.PATIENT_PROFILE_UPDATE_SELF)
  @ApiOperation({ operationId: 'patientUpdateSelfProfile', summary: 'Update self profile' })
  @ApiOkResponse({ type: SelfProfileResponseDto })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Patient access is required.')
  @ApiErrorResponse(422, 'Profile fields are invalid.')
  async update(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateSelfProfileDto,
  ) {
    return this.profiles.update(request.auth.userId, body);
  }

  @Get('onboarding-status')
  @RequirePermissions(PERMISSIONS.PATIENT_PROFILE_READ_SELF)
  @ApiOperation({ operationId: 'patientGetOnboardingStatus', summary: 'Get onboarding status' })
  @ApiOkResponse({ type: OnboardingStatusResponseDto })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Patient access is required.')
  async onboardingStatus(@Req() request: AuthenticatedRequest) {
    return this.profiles.getOnboardingStatus(request.auth.userId);
  }
}
