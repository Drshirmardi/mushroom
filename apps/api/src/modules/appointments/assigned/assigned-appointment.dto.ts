import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { AppointmentStatus } from '../../../generated/prisma/client';
export class AssignedAppointmentQueryDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @ApiProperty({ required: false, enum: AppointmentStatus }) @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
  @ApiProperty({ required: false, format: 'date-time' }) @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u) from?: string;
  @ApiProperty({ required: false, format: 'date-time' }) @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u) to?: string;
}
export class AssignedAppointmentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ type: String, nullable: true }) patientDisplayName!: string | null;
  @ApiProperty({ format: 'uuid' }) doctorServiceId!: string;
  @ApiProperty() serviceName!: string;
  @ApiProperty({ enum: ['ONLINE', 'IN_PERSON'] }) visitMode!: string;
  @ApiProperty({ enum: AppointmentStatus }) status!: AppointmentStatus;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ format: 'date-time' }) endsAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) startedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) completedAt!: Date | null;
}
export class AssignedAppointmentPageDto {
  @ApiProperty({ type: [AssignedAppointmentDto] }) items!: AssignedAppointmentDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class AssignedEncounterDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() state!: string;
}
export class AssignedConsultationContextDto extends AssignedAppointmentDto {
  @ApiProperty() canStart!: boolean;
  @ApiProperty() canComplete!: boolean;
  @ApiProperty() canOpenAssessmentContext!: boolean;
  @ApiProperty({ type: AssignedEncounterDto, nullable: true }) encounter!: AssignedEncounterDto | null;
  @ApiProperty() textConsultationSupported!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) conversationId!: string | null;
  @ApiProperty({ enum: [false] }) voiceSupported!: false;
  @ApiProperty({ enum: [false] }) videoSupported!: false;
}
