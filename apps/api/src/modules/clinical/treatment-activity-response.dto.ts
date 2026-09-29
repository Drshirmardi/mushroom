import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const taskKinds = ['MEDICATION', 'EXERCISE'] as const;
const taskStates = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

export class TreatmentActivityReportingKpiDefinitionResponseDto {
  @ApiProperty({ enum: ['KPI-14', 'KPI-15', 'KPI-16'] }) id!: string;
  @ApiProperty() formula!: string;
  @ApiProperty() dataOwner!: 'Clinical';
  @ApiProperty() sourceOfTruth!: string;
  @ApiProperty({ enum: ['tenant-and-clinic'] }) scope!: 'tenant-and-clinic';
  @ApiProperty({ example: 'Asia/Tehran' }) timeZone!: 'Asia/Tehran';
  @ApiProperty() rounding!: string;
  @ApiProperty() zeroOrNotApplicableRule!: string;
  @ApiProperty() partialDataRule!: string;
  @ApiProperty() staleDataRule!: string;
}

export const treatmentActivityReportingKpiDefinitions = [
  { id: 'KPI-14', formula: 'count(TreatmentTask.id) with scheduledFor in range and state=SCHEDULED', dataOwner: 'Clinical', sourceOfTruth: 'PostgreSQL TreatmentTask scheduledFor/state joined through plan clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count', zeroOrNotApplicableRule: 'zero when no rows; no task description/content is returned', partialDataRule: 'identify the unavailable TreatmentTask range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-15', formula: 'count(TreatmentTask.id) with completedAt in range and state=COMPLETED', dataOwner: 'Clinical', sourceOfTruth: 'PostgreSQL TreatmentTask.completedAt/state joined through plan clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count', zeroOrNotApplicableRule: 'zero when no rows', partialDataRule: 'identify the unavailable TreatmentTask range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-16', formula: 'at asOf, count(task in T where state=COMPLETED and completedAt <= asOf) / count(T) × 100, where T is tasks with scheduledFor in range and state in {SCHEDULED, COMPLETED}', dataOwner: 'Clinical', sourceOfTruth: 'PostgreSQL TreatmentTask.scheduledFor/state/completedAt joined through treatment plan to clinic', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'one decimal percentage', zeroOrNotApplicableRule: 'denominator 0 → not-applicable, never 0%; numerator is a subset of T', partialDataRule: 'identify the unavailable TreatmentTask range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
] as const satisfies readonly TreatmentActivityReportingKpiDefinitionResponseDto[];

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
