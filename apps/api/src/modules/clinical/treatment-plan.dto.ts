import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

const treatmentPlanStates = ['DRAFT', 'ACTIVE', 'COMPLETED', 'VOIDED'] as const;

export class TreatmentMedicationDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @IsNotEmpty() @MaxLength(255) name!: string;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) dosage?: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
}

export class TreatmentSessionPlanDto {
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) position!: number;
  @ApiProperty({ maxLength: 255 }) @IsString() @IsNotEmpty() @MaxLength(255) title!: string;
  @ApiProperty({ type: String, isArray: true, maxItems: 50 }) @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @IsNotEmpty({ each: true }) @MaxLength(1_000, { each: true }) goals!: string[];
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) patientInstructions?: string;
}

export class ExercisePlanDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @IsNotEmpty() @MaxLength(255) title!: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
}

export class NutritionPlanDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @IsNotEmpty() @MaxLength(255) title!: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
}

export class CreateTreatmentPlanDto {
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) title?: string;
  @ApiPropertyOptional({ type: () => TreatmentMedicationDto, isArray: true, maxItems: 100 }) @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => TreatmentMedicationDto) medications?: TreatmentMedicationDto[];
  @ApiPropertyOptional({ type: () => TreatmentSessionPlanDto, isArray: true, maxItems: 100 }) @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => TreatmentSessionPlanDto) sessionPlans?: TreatmentSessionPlanDto[];
  @ApiPropertyOptional({ type: () => ExercisePlanDto, isArray: true, maxItems: 100 }) @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ExercisePlanDto) exercisePlans?: ExercisePlanDto[];
  @ApiPropertyOptional({ type: () => NutritionPlanDto, isArray: true, maxItems: 100 }) @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => NutritionPlanDto) nutritionPlans?: NutritionPlanDto[];
}

export class UpdateTreatmentPlanDto {
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) title?: string;
  @ApiPropertyOptional({ enum: treatmentPlanStates }) @IsOptional() @IsEnum(treatmentPlanStates) state?: (typeof treatmentPlanStates)[number];
}

export class UpdateTreatmentMedicationDto {
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) name?: string;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) dosage?: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
}

export class UpdateTreatmentSessionPlanDto {
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) position?: number;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) title?: string;
  @ApiPropertyOptional({ type: String, isArray: true, maxItems: 50 }) @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @IsNotEmpty({ each: true }) @MaxLength(1_000, { each: true }) goals?: string[];
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) patientInstructions?: string;
}

export class UpdateExercisePlanDto {
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) title?: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
}

export class UpdateNutritionPlanDto {
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) title?: string;
  @ApiPropertyOptional({ maxLength: 10_000 }) @IsOptional() @IsString() @MaxLength(10_000) instructions?: string;
}
