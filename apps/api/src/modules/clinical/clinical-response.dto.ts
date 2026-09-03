import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const clinicalRecordKinds = ['DIAGNOSIS', 'ALLERGY', 'CONDITION', 'MEDICATION_STATEMENT'] as const;
const revisionStates = ['DRAFT', 'SIGNED'] as const;

export class ClinicalNoteRevisionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() revisionNumber!: number;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) previousRevisionId!: string | null;
  @ApiProperty({ enum: revisionStates }) state!: (typeof revisionStates)[number];
  @ApiProperty() content!: string;
  @ApiProperty() isPrivate!: boolean;
  @ApiProperty({ type: String, nullable: true }) patientSummary!: string | null;
  @ApiProperty({ type: String, nullable: true }) amendmentReasonCategory!: string | null;
  @ApiProperty({ format: 'date-time' }) authoredAt!: Date;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) authoredByUserId!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) signedAt!: Date | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) signedByUserId!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) publishedAt!: Date | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) publishedByUserId!: string | null;
  @ApiProperty({ type: String, nullable: true }) integrityHash!: string | null;
}

export class ClinicalNoteResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) patientId?: string;
  @ApiProperty() currentRevision!: number;
  @ApiProperty({ type: Number, nullable: true }) currentEffectiveRevision!: number | null;
  @ApiProperty({ type: Number, nullable: true }) latestSignedRevision!: number | null;
  @ApiProperty({ type: Number, nullable: true }) currentPublishedRevision!: number | null;
  @ApiProperty({ type: () => ClinicalNoteRevisionResponseDto, nullable: true }) revision!: ClinicalNoteRevisionResponseDto | null;
}

export class ClinicalRecordRevisionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() revisionNumber!: number;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) previousRevisionId!: string | null;
  @ApiProperty({ enum: revisionStates }) state!: (typeof revisionStates)[number];
  @ApiProperty({ type: Object, additionalProperties: true }) content!: Record<string, unknown>;
  @ApiProperty() isPrivate!: boolean;
  @ApiProperty({ type: String, nullable: true }) amendmentReasonCategory!: string | null;
  @ApiProperty({ format: 'date-time' }) authoredAt!: Date;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) authoredByUserId!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) signedAt!: Date | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) signedByUserId!: string | null;
  @ApiProperty({ type: String, nullable: true }) integrityHash!: string | null;
}

export class ClinicalRecordResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: clinicalRecordKinds }) kind!: (typeof clinicalRecordKinds)[number];
  @ApiPropertyOptional({ format: 'uuid' }) patientId?: string;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) encounterId?: string | null;
  @ApiPropertyOptional() state?: string;
  @ApiProperty() currentRevision!: number;
  @ApiProperty({ type: Number, nullable: true }) latestSignedRevision!: number | null;
  @ApiProperty({ type: () => ClinicalRecordRevisionResponseDto, nullable: true }) revision!: ClinicalRecordRevisionResponseDto | null;
}

export class AdminClinicalWorkspaceIntakeSourceDto {
  @ApiProperty({ format: 'uuid' }) intakeId!: string;
  @ApiProperty({ format: 'uuid' }) revisionId!: string;
  @ApiProperty() revisionNumber!: number;
}

export class AdminClinicalWorkspaceEncounterDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty() state!: string;
  @ApiProperty({ format: 'date-time' }) startedAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt!: Date | null;
}

export class AdminClinicalWorkspaceTimelineItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ format: 'date-time' }) occurredAt!: Date;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) encounterId!: string | null;
}

export class AdminClinicalWorkspaceResponseDto {
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ type: () => AdminClinicalWorkspaceIntakeSourceDto, nullable: true }) intakeSource!: AdminClinicalWorkspaceIntakeSourceDto | null;
  @ApiProperty({ type: () => AdminClinicalWorkspaceEncounterDto, isArray: true }) encounters!: AdminClinicalWorkspaceEncounterDto[];
  @ApiProperty({ type: () => ClinicalNoteResponseDto, isArray: true }) notes!: ClinicalNoteResponseDto[];
  @ApiProperty({ type: () => ClinicalRecordResponseDto, isArray: true }) records!: ClinicalRecordResponseDto[];
  @ApiProperty({ type: () => AdminClinicalWorkspaceTimelineItemDto, isArray: true }) timeline!: AdminClinicalWorkspaceTimelineItemDto[];
}

export class PatientClinicalItemResponseDto {
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty({ format: 'date-time' }) completedAt!: Date;
  @ApiProperty() revisionNumber!: number;
  @ApiProperty() patientSummary!: string;
  @ApiProperty({ format: 'date-time' }) publishedAt!: Date;
}

export class PatientClinicalListResponseDto {
  @ApiProperty({ type: () => PatientClinicalItemResponseDto, isArray: true }) items!: PatientClinicalItemResponseDto[];
}
