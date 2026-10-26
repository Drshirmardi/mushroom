import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreatePatientAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  doctorServiceId!: string;

  @ApiProperty({ format: 'date-time', example: '2026-09-10T08:30:00.000Z' })
  @IsDateString({ strict: true })
  startsAt!: string;
}

export class PatientAppointmentListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class CancelPatientAppointmentDto {
  @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ReschedulePatientAppointmentDto extends CreatePatientAppointmentDto {}

export class PatientAppointmentResponseDto {
  @ApiPropertyOptional({ enum: ['ONLINE', 'IN_PERSON'] }) visitMode?: string;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) clinicId!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid' }) doctorServiceId!: string;
  @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ format: 'date-time' }) endsAt!: Date;
  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] }) status!: string;
  @ApiProperty() priceAmount!: number;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ format: 'date-time' }) priceCapturedAt!: Date;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class PatientAppointmentPageResponseDto { @ApiProperty({ type: PatientAppointmentResponseDto, isArray: true }) items!: PatientAppointmentResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }

export class AppointmentTimelineQueryDto extends PatientAppointmentListQueryDto {}
export class AppointmentStatusHistoryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'], nullable: true }) fromStatus!: string | null;
  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] }) toStatus!: string;
  @ApiProperty() action!: string;
  @ApiPropertyOptional({ maxLength: 500, nullable: true }) reason!: string | null;
  @ApiProperty({ type: Object }) metadata!: Record<string, unknown>;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class AppointmentStatusHistoryPageResponseDto { @ApiProperty({ type: AppointmentStatusHistoryResponseDto, isArray: true }) items!: AppointmentStatusHistoryResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
