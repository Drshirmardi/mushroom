import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

const taskKinds = ['MEDICATION', 'EXERCISE'] as const;

export class CreateTreatmentTaskDto {
  @ApiProperty({ enum: taskKinds }) @IsIn(taskKinds) kind!: (typeof taskKinds)[number];
  @ApiProperty({ format: 'date-time' }) @IsDateString({ strict: true }) scheduledFor!: string;
}

export class RescheduleTreatmentTaskDto {
  @ApiProperty({ format: 'date-time' }) @IsDateString({ strict: true }) scheduledFor!: string;
}

export class RecordMedicationAdherenceDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Optional matching MEDICATION task in the same treatment plan.' }) @IsOptional() @IsUUID('4') treatmentTaskId?: string;
}
