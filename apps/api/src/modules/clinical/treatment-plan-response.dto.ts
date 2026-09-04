import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const treatmentPlanStates = ['DRAFT', 'ACTIVE', 'COMPLETED', 'VOIDED'] as const;

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
