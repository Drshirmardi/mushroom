import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const statuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const;

export class CreateAdminAppointmentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') patientId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') doctorServiceId!: string;
  @ApiProperty({ format: 'date-time' }) @IsDateString({ strict: true }) startsAt!: string;
}

export class AdminAppointmentListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') patientId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorId?: string;
  @ApiPropertyOptional({ enum: statuses }) @IsOptional() @IsIn(statuses) status?: (typeof statuses)[number];
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString({ strict: true }) from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString({ strict: true }) to?: string;
  @ApiPropertyOptional({ minimum: 1, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class CancelAdminAppointmentDto { @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @IsString() @MaxLength(500) reason?: string; }
export class RescheduleAdminAppointmentDto { @ApiProperty({ format: 'uuid' }) @IsUUID('4') doctorServiceId!: string; @ApiProperty({ format: 'date-time' }) @IsDateString({ strict: true }) startsAt!: string; }

export class AdminAppointmentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ format: 'uuid' }) clinicId!: string; @ApiProperty({ format: 'uuid' }) patientId!: string; @ApiProperty({ format: 'uuid' }) doctorServiceId!: string; @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date; @ApiProperty({ format: 'date-time' }) endsAt!: Date; @ApiProperty({ enum: statuses }) status!: string; @ApiProperty() priceAmount!: number; @ApiProperty({ enum: ['IRR'] }) currency!: string; @ApiProperty({ format: 'date-time' }) priceCapturedAt!: Date; @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class AdminAppointmentPageResponseDto { @ApiProperty({ type: AdminAppointmentResponseDto, isArray: true }) items!: AdminAppointmentResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
export class AdminAppointmentTimelineQueryDto { @ApiPropertyOptional({ minimum: 1, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1; @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20; }
export class AdminAppointmentStatusHistoryResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiPropertyOptional({ nullable: true }) fromStatus!: string | null; @ApiProperty() toStatus!: string; @ApiProperty() action!: string; @ApiPropertyOptional({ nullable: true }) reason!: string | null; @ApiProperty({ type: Object }) metadata!: Record<string, unknown>; @ApiProperty({ format: 'date-time' }) createdAt!: Date; }
export class AdminAppointmentStatusHistoryPageResponseDto { @ApiProperty({ type: AdminAppointmentStatusHistoryResponseDto, isArray: true }) items!: AdminAppointmentStatusHistoryResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
export class OperationalActivityListQueryDto extends AdminAppointmentTimelineQueryDto { @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') appointmentId?: string; @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') patientId?: string; }
export class OperationalActivityResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() type!: string; @ApiPropertyOptional({ format: 'uuid', nullable: true }) appointmentId!: string | null; @ApiPropertyOptional({ format: 'uuid', nullable: true }) patientId!: string | null; @ApiProperty({ type: Object }) metadata!: Record<string, unknown>; @ApiProperty({ format: 'date-time' }) createdAt!: Date; }
export class OperationalActivityPageResponseDto { @ApiProperty({ type: OperationalActivityResponseDto, isArray: true }) items!: OperationalActivityResponseDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
