import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { CreatePrescriptionDto, IssuePrescriptionDto, SavePrescriptionDraftDto } from './prescription.dto';
import { PrescriptionListResponseDto, PrescriptionResponseDto } from './prescription-response.dto';
import { PrescriptionService } from './prescription.service';

@ApiTags('Admin prescriptions')
@ApiBearerAuth('bearerAuth')
@ApiParam({ name: 'patientId', format: 'uuid' })
@Controller('admin/patients/:patientId/prescriptions')
export class AdminPrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW)
  @ApiOperation({ operationId: 'adminPrescriptionsList', summary: 'List authorized patient prescriptions' })
  @ApiQuery({ name: 'cursor', required: false, format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: PrescriptionListResponseDto })
  list(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Query('cursor', new ParseUUIDPipe({ version: '4', optional: true })) cursor: string | undefined, @Query('limit', new ParseIntPipe({ optional: true })) limit: number | undefined, @Req() request: AuthenticatedRequest) { return this.prescriptions.list(patientId, this.actor(request), cursor, limit ?? 50); }

  @Post()
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiOperation({ operationId: 'adminPrescriptionsCreate', summary: 'Create a prescription draft' })
  @ApiOkResponse({ type: PrescriptionResponseDto })
  create(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Body() body: CreatePrescriptionDto, @Req() request: AuthenticatedRequest) { return this.prescriptions.create(patientId, body, this.actor(request)); }

  @Get(':prescriptionId')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW)
  @ApiParam({ name: 'prescriptionId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminPrescriptionsGet', summary: 'Get an authorized prescription current revision' })
  @ApiOkResponse({ type: PrescriptionResponseDto })
  get(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('prescriptionId', new ParseUUIDPipe({ version: '4' })) prescriptionId: string, @Req() request: AuthenticatedRequest) { return this.prescriptions.get(patientId, prescriptionId, this.actor(request)); }

  @Post(':prescriptionId/revisions')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'prescriptionId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminPrescriptionsSaveDraft', summary: 'Save an append-only prescription draft revision' })
  @ApiOkResponse({ type: PrescriptionResponseDto })
  save(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('prescriptionId', new ParseUUIDPipe({ version: '4' })) prescriptionId: string, @Body() body: SavePrescriptionDraftDto, @Req() request: AuthenticatedRequest) { return this.prescriptions.save(patientId, prescriptionId, body, this.actor(request)); }

  @Post(':prescriptionId/issue')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PRESCRIPTION_ISSUE)
  @ApiParam({ name: 'prescriptionId', format: 'uuid' })
  @ApiOperation({ operationId: 'adminPrescriptionsIssue', summary: 'Issue an exact current prescription revision' })
  @ApiOkResponse({ type: PrescriptionResponseDto })
  issue(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('prescriptionId', new ParseUUIDPipe({ version: '4' })) prescriptionId: string, @Body() body: IssuePrescriptionDto, @Req() request: AuthenticatedRequest) { return this.prescriptions.issue(patientId, prescriptionId, body, this.actor(request)); }

  private actor(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip, roles: request.auth.roles }; }
}
