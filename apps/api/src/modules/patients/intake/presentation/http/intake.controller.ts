import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../../../../common/auth/access-token.guard';
import { RequirePermissions, RequireRoles } from '../../../../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../../../../common/auth/authorization.policy';
import { ApiErrorResponse } from '../../../../../common/errors/api-error-response.decorator';
import { PatientIntakeService } from '../../patient-intake.service';
import {
  AcceptConsentDto,
  CompleteIntakeDto,
  ConsentPolicyResponseDto,
  ConsentRecordResponseDto,
  MedicalIntakeResponseDto,
  SaveIntakeDraftDto,
} from './dto/intake.dto';

const audit = (request: AuthenticatedRequest) => ({ requestId: request.id, ipAddress: request.ip, actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId });

@ApiTags('Patient intake and consent')
@ApiBearerAuth('bearerAuth')
@Controller('patients/me')
@RequireRoles('PATIENT')
export class IntakeController {
  constructor(private readonly intake: PatientIntakeService) {}

  @Get('consent-policy')
  @RequirePermissions(PERMISSIONS.PATIENT_CONSENT_READ_SELF)
  @ApiOperation({ operationId: 'patientGetConsentPolicy', summary: 'Get the current medical-intake consent policy' })
  @ApiOkResponse({ type: ConsentPolicyResponseDto, description: 'The current versioned policy and the patient acceptance state.' })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Patient access is required.')
  @ApiErrorResponse(503, 'Current consent policy is unavailable.')
  policy(@Req() request: AuthenticatedRequest) { return this.intake.getPolicy(request.auth.userId, audit(request)); }
  @Post('consents')
  @RequirePermissions(PERMISSIONS.PATIENT_CONSENT_MANAGE_SELF)
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Stable key for this acceptance attempt.' })
  @ApiOperation({ operationId: 'patientAcceptConsent', summary: 'Accept the exact current consent policy' })
  @ApiOkResponse({ type: ConsentRecordResponseDto, description: 'The current or replayed consent acceptance.' })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Patient access is required.')
  @ApiErrorResponse(422, 'Consent acceptance input is invalid.')
  @ApiErrorResponse(409, 'Policy is stale or the idempotency key was reused.')
  @ApiErrorResponse(503, 'Current consent policy is unavailable.')
  accept(@Body() body: AcceptConsentDto, @Headers('idempotency-key') key: string | string[] | undefined, @Req() request: AuthenticatedRequest) { return this.intake.accept(request.auth.userId, body, key, audit(request)); }
  @Post('consents/:consentRecordId/withdraw')
  @RequirePermissions(PERMISSIONS.PATIENT_CONSENT_MANAGE_SELF)
  @HttpCode(200)
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Stable key for this withdrawal attempt.' })
  @ApiOperation({ operationId: 'patientWithdrawConsent', summary: 'Withdraw an owned current consent acceptance' })
  @ApiOkResponse({ type: ConsentRecordResponseDto, description: 'The withdrawn or replayed consent acceptance.' })
  @ApiErrorResponse(400, 'Consent record id is invalid.')
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Patient access is required.')
  @ApiErrorResponse(409, 'Consent is not active or the idempotency key was reused.')
  withdraw(@Param('consentRecordId', new ParseUUIDPipe({ version: '4' })) consentId: string, @Headers('idempotency-key') key: string | string[] | undefined, @Req() request: AuthenticatedRequest) { return this.intake.withdraw(request.auth.userId, consentId, key, audit(request)); }
  @Get('medical-intake')
  @RequirePermissions(PERMISSIONS.PATIENT_INTAKE_READ_SELF)
  @ApiOperation({ operationId: 'patientGetMedicalIntake', summary: 'Resume the current self-reported medical intake' })
  @ApiOkResponse({ type: MedicalIntakeResponseDto, description: 'The current immutable revision snapshot, if one exists.' })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Patient access is required.')
  get(@Req() request: AuthenticatedRequest) { return this.intake.getIntake(request.auth.userId, audit(request)); }
  @Put('medical-intake')
  @RequirePermissions(PERMISSIONS.PATIENT_INTAKE_UPDATE_SELF)
  @ApiOperation({ operationId: 'patientSaveMedicalIntakeDraft', summary: 'Save a medical-intake draft revision' })
  @ApiOkResponse({ type: MedicalIntakeResponseDto, description: 'The persisted or canonical no-op draft revision.' })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Current consent is required.')
  @ApiErrorResponse(409, 'The supplied revision is stale.')
  @ApiErrorResponse(422, 'Medical-intake draft input is invalid.')
  save(@Body() body: SaveIntakeDraftDto, @Req() request: AuthenticatedRequest) { return this.intake.saveDraft(request.auth.userId, body, audit(request)); }
  @Post('medical-intake/complete')
  @RequirePermissions(PERMISSIONS.PATIENT_INTAKE_UPDATE_SELF)
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Stable key for this completion attempt.' })
  @ApiOperation({ operationId: 'patientCompleteMedicalIntake', summary: 'Create an immutable completed intake revision' })
  @ApiOkResponse({ type: MedicalIntakeResponseDto, description: 'The persisted or replayed completed revision.' })
  @ApiErrorResponse(401, 'Authentication is required.')
  @ApiErrorResponse(403, 'Current consent is required.')
  @ApiErrorResponse(409, 'The supplied revision is stale or the idempotency key was reused.')
  @ApiErrorResponse(422, 'Required medical declarations are incomplete.')
  complete(@Body() body: CompleteIntakeDto, @Headers('idempotency-key') key: string | string[] | undefined, @Req() request: AuthenticatedRequest) { return this.intake.complete(request.auth.userId, body, key, audit(request)); }
}
