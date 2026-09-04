import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const taskKinds = ['MEDICATION', 'EXERCISE'] as const;
const taskStates = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

export class TreatmentTaskResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) treatmentPlanId!: string;
  @ApiProperty({ enum: taskKinds }) kind!: (typeof taskKinds)[number];
  @ApiProperty({ format: 'date-time' }) scheduledFor!: Date;
  @ApiProperty({ enum: taskStates }) state!: (typeof taskStates)[number];
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) completedAt!: Date | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class TreatmentTaskListResponseDto {
  @ApiProperty({ type: () => TreatmentTaskResponseDto, isArray: true }) items!: TreatmentTaskResponseDto[];
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) nextCursor?: string | null;
}

export class MedicationAdherenceResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) treatmentMedicationId!: string;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) treatmentTaskId!: string | null;
  @ApiProperty({ format: 'date-time' }) recordedAt!: Date;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
