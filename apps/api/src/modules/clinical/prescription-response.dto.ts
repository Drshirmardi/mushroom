import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const prescriptionRevisionStates = ['DRAFT', 'ISSUED', 'VOIDED'] as const;

export class PrescriptionItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() position!: number;
  @ApiProperty() medicationName!: string;
  @ApiProperty({ type: String, nullable: true }) doseText!: string | null;
  @ApiProperty({ type: String, nullable: true }) frequencyText!: string | null;
  @ApiProperty({ type: String, nullable: true }) durationText!: string | null;
  @ApiProperty({ type: String, nullable: true }) instructions!: string | null;
}

export class PrescriptionRevisionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() revisionNumber!: number;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) previousRevisionId!: string | null;
  @ApiProperty({ enum: prescriptionRevisionStates }) state!: (typeof prescriptionRevisionStates)[number];
  @ApiProperty({ type: String, nullable: true }) amendmentReasonCategory!: string | null;
  @ApiProperty({ type: String, nullable: true }) integrityHash!: string | null;
  @ApiProperty({ format: 'date-time' }) authoredAt!: Date;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) authoredByUserId!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) issuedAt!: Date | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) issuedByUserId!: string | null;
  @ApiProperty({ type: () => PrescriptionItemResponseDto, isArray: true }) items!: PrescriptionItemResponseDto[];
}

export class PrescriptionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty() currentRevision!: number;
  @ApiProperty({ type: Number, nullable: true }) currentIssuedRevision!: number | null;
  @ApiProperty({ type: Number, nullable: true }) latestIssuedRevision!: number | null;
  @ApiProperty({ type: () => PrescriptionRevisionResponseDto, nullable: true }) revision!: PrescriptionRevisionResponseDto | null;
}

export class PrescriptionListResponseDto {
  @ApiPropertyOptional({ type: String, nullable: true }) patientDisplayName?: string | null;
  @ApiProperty({ type: () => PrescriptionResponseDto, isArray: true }) items!: PrescriptionResponseDto[];
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) nextCursor?: string | null;
}

export class PrescriptionHistoryResponseDto {
  @ApiProperty({ type: () => PrescriptionResponseDto, isArray: true }) items!: PrescriptionResponseDto[];
  @ApiProperty({ type: Number, nullable: true }) nextBefore!: number | null;
}
