import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const eventTypes = ['TASK_COMPLETED', 'MEDICATION_ADHERENCE_RECORDED'] as const;

export class TreatmentProgressEventResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) treatmentPlanId!: string;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) treatmentTaskId!: string | null;
  @ApiProperty({ enum: eventTypes }) eventType!: (typeof eventTypes)[number];
  @ApiProperty({ format: 'date-time' }) occurredAt!: Date;
}

export class TreatmentProgressResponseDto {
  @ApiProperty({ format: 'uuid' }) treatmentPlanId!: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) percentage!: number;
  @ApiProperty({ minimum: 0 }) completedTasks!: number;
  @ApiProperty({ minimum: 0 }) totalTasks!: number;
  @ApiProperty({ type: () => TreatmentProgressEventResponseDto, isArray: true }) timeline!: TreatmentProgressEventResponseDto[];
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) nextCursor!: string | null;
}
