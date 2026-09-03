import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { RequirePermissions } from '../../common/auth/authorization.decorator';
import { PERMISSIONS } from '../../common/auth/authorization.policy';
import { AdminClinicalWorkspaceService } from './admin-clinical-workspace.service';
import { CreateClinicalNoteDto, PublishClinicalNoteDto, ReconcileClinicalRecordDto, ReviseClinicalRecordDto, SaveClinicalNoteDto, SignClinicalRevisionDto } from './admin-clinical-workspace.dto';
import { AdminClinicalWorkspaceResponseDto, ClinicalNoteResponseDto, ClinicalRecordResponseDto } from './clinical-response.dto';
import type { ClinicalRecordKind } from './clinical-reconciliation.service';

@ApiTags('Admin clinical workspace')
@ApiBearerAuth('bearerAuth')
@ApiParam({ name: 'patientId', format: 'uuid' })
@Controller('admin/patients/:patientId/clinical-workspace')
export class AdminClinicalWorkspaceController {
  constructor(private readonly workspace: AdminClinicalWorkspaceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_VIEW)
  @ApiOperation({ operationId: 'adminClinicalWorkspaceGet', summary: 'Get an authorized patient clinical workspace' })
  @ApiOkResponse({ type: AdminClinicalWorkspaceResponseDto })
  get(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Req() request: AuthenticatedRequest) { return this.workspace.get(patientId, this.actor(request)); }

  @Post('encounters/:encounterId/notes')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiOperation({ operationId: 'adminClinicalWorkspaceCreateNote', summary: 'Create a controlled clinical-note revision' })
  @ApiOkResponse({ type: ClinicalNoteResponseDto })
  createNote(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('encounterId', new ParseUUIDPipe({ version: '4' })) encounterId: string, @Body() body: CreateClinicalNoteDto, @Req() request: AuthenticatedRequest) { return this.workspace.createNote(patientId, encounterId, body, this.actor(request)); }

  @Post('notes/:noteId/revisions')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiOperation({ operationId: 'adminClinicalWorkspaceSaveNote', summary: 'Save a controlled clinical-note revision' })
  @ApiOkResponse({ type: ClinicalNoteResponseDto })
  saveNote(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('noteId', new ParseUUIDPipe({ version: '4' })) noteId: string, @Body() body: SaveClinicalNoteDto, @Req() request: AuthenticatedRequest) { return this.workspace.saveNote(patientId, noteId, body, this.actor(request)); }

  @Post('notes/:noteId/sign')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_SIGN)
  @ApiOperation({ operationId: 'adminClinicalWorkspaceSignNote', summary: 'Sign an exact clinical-note revision' })
  @ApiOkResponse({ type: ClinicalNoteResponseDto })
  signNote(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('noteId', new ParseUUIDPipe({ version: '4' })) noteId: string, @Body() body: SignClinicalRevisionDto, @Req() request: AuthenticatedRequest) { return this.workspace.signNote(patientId, noteId, body, this.actor(request)); }

  @Post('notes/:noteId/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_SIGN)
  @ApiOperation({ operationId: 'adminClinicalWorkspacePublishNote', summary: 'Publish an already signed patient summary' })
  @ApiOkResponse({ type: ClinicalNoteResponseDto })
  publishNote(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('noteId', new ParseUUIDPipe({ version: '4' })) noteId: string, @Body() body: PublishClinicalNoteDto, @Req() request: AuthenticatedRequest) { return this.workspace.publishNote(patientId, noteId, body, this.actor(request)); }

  @Post('records')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiOperation({ operationId: 'adminClinicalWorkspaceReconcileRecord', summary: 'Create a reviewed clinical record from immutable intake provenance' })
  @ApiOkResponse({ type: ClinicalRecordResponseDto })
  reconcile(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Body() body: ReconcileClinicalRecordDto, @Req() request: AuthenticatedRequest) { return this.workspace.reconcile(patientId, body, this.actor(request)); }

  @Post('records/:kind/:recordId/revisions')
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_EDIT)
  @ApiParam({ name: 'recordId', format: 'uuid' })
  @ApiParam({ name: 'kind', enum: ['DIAGNOSIS', 'ALLERGY', 'CONDITION', 'MEDICATION_STATEMENT'] })
  @ApiOperation({ operationId: 'adminClinicalWorkspaceReviseRecord', summary: 'Save a controlled reviewed-record revision' })
  @ApiOkResponse({ type: ClinicalRecordResponseDto })
  reviseRecord(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('kind') kind: ClinicalRecordKind, @Param('recordId', new ParseUUIDPipe({ version: '4' })) recordId: string, @Body() body: ReviseClinicalRecordDto, @Req() request: AuthenticatedRequest) { return this.workspace.reviseRecord(patientId, this.kind(kind), recordId, body, this.actor(request)); }

  @Post('records/:kind/:recordId/sign')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CLINICAL_RECORD_SIGN)
  @ApiParam({ name: 'recordId', format: 'uuid' })
  @ApiParam({ name: 'kind', enum: ['DIAGNOSIS', 'ALLERGY', 'CONDITION', 'MEDICATION_STATEMENT'] })
  @ApiOperation({ operationId: 'adminClinicalWorkspaceSignRecord', summary: 'Sign an exact reviewed-record revision' })
  @ApiOkResponse({ type: ClinicalRecordResponseDto })
  signRecord(@Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string, @Param('kind') kind: ClinicalRecordKind, @Param('recordId', new ParseUUIDPipe({ version: '4' })) recordId: string, @Body() body: SignClinicalRevisionDto, @Req() request: AuthenticatedRequest) { return this.workspace.signRecord(patientId, this.kind(kind), recordId, body, this.actor(request)); }

  private actor(request: AuthenticatedRequest) { return { actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId, requestId: request.id, ipAddress: request.ip, roles: request.auth.roles }; }
  private kind(value: string): ClinicalRecordKind { if (value === 'DIAGNOSIS' || value === 'ALLERGY' || value === 'CONDITION' || value === 'MEDICATION_STATEMENT') return value; throw new BadRequestException({ code: 'CLINICAL_RECORD_KIND_INVALID', message: 'Clinical record kind is invalid.', details: {} }); }
}
