import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

const treatmentPlanStates = ['DRAFT', 'ACTIVE', 'COMPLETED', 'VOIDED'] as const;

export class TreatmentPlanReportingKpiDefinitionResponseDto {
  @ApiProperty({ enum: ['KPI-13'] }) id!: string;
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

export const treatmentPlanReportingKpiDefinitions = [
  {
    id: 'KPI-13', formula: 'count(TreatmentPlan.id) where TreatmentPlan.state = ACTIVE in the current snapshot at response asOf', dataOwner: 'Clinical',
    sourceOfTruth: 'PostgreSQL TreatmentPlan.state', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count',
    zeroOrNotApplicableRule: 'zero when no ACTIVE plan exists; DRAFT, COMPLETED, and VOIDED are excluded',
    partialDataRule: 'identify the unavailable TreatmentPlan snapshot source; never estimate',
    staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot',
  },
] as const satisfies readonly TreatmentPlanReportingKpiDefinitionResponseDto[];

export class TreatmentReportingQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') clinicId?: string;
  @ApiPropertyOptional({ example: '2026-09-01' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/u) from?: string;
  @ApiPropertyOptional({ example: '2026-09-30' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/u) to?: string;
}

export class TreatmentReportingResponseDto {
  @ApiProperty({ format: 'uuid' }) clinicId!: string;
  @ApiProperty() timeZone!: string;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ format: 'date-time' }) asOf!: Date;
  @ApiProperty({ enum: ['current', 'partial', 'stale'] }) sourceStatus!: 'current' | 'partial' | 'stale';
  @ApiProperty() activePlans!: number;
  @ApiProperty() dueTasks!: number;
  @ApiProperty() completedTasks!: number;
  @ApiProperty({ nullable: true }) completionRate!: number | null;
}

export class TreatmentMedicationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) dosage!: string | null;
  @ApiProperty({ type: String, nullable: true }) instructions!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class TreatmentSessionPlanResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() position!: number;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, isArray: true }) goals!: string[];
  @ApiProperty({ type: String, nullable: true }) instructions!: string | null;
  @ApiProperty({ type: String, nullable: true }) patientInstructions!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class ExercisePlanResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) instructions!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class NutritionPlanResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) instructions!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class TreatmentPlanResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ enum: treatmentPlanStates }) state!: (typeof treatmentPlanStates)[number];
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ type: () => TreatmentMedicationResponseDto, isArray: true }) medications!: TreatmentMedicationResponseDto[];
  @ApiProperty({ type: () => TreatmentSessionPlanResponseDto, isArray: true }) sessionPlans!: TreatmentSessionPlanResponseDto[];
  @ApiProperty({ type: () => ExercisePlanResponseDto, isArray: true }) exercisePlans!: ExercisePlanResponseDto[];
  @ApiProperty({ type: () => NutritionPlanResponseDto, isArray: true }) nutritionPlans!: NutritionPlanResponseDto[];
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class TreatmentPlanListResponseDto {
  @ApiProperty({ type: () => TreatmentPlanResponseDto, isArray: true }) items!: TreatmentPlanResponseDto[];
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) nextCursor?: string | null;
}
