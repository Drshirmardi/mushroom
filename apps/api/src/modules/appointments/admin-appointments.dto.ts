import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

const statuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const;

export class AppointmentReportingKpiDefinitionResponseDto {
  @ApiProperty({ enum: ['KPI-04', 'KPI-05', 'KPI-06', 'KPI-07', 'KPI-08', 'KPI-09'] }) id!: string;
  @ApiProperty() formula!: string;
  @ApiProperty() dataOwner!: 'Appointments';
  @ApiProperty() sourceOfTruth!: string;
  @ApiProperty({ enum: ['tenant-and-clinic'] }) scope!: 'tenant-and-clinic';
  @ApiProperty({ example: 'Asia/Tehran' }) timeZone!: 'Asia/Tehran';
  @ApiProperty() rounding!: string;
  @ApiProperty() zeroOrNotApplicableRule!: string;
  @ApiProperty() partialDataRule!: string;
  @ApiProperty() staleDataRule!: string;
}

export const appointmentReportingKpiDefinitions = [
  { id: 'KPI-04', formula: 'count(Appointment.id) with startsAt in range and status in {PENDING, CONFIRMED, CHECKED_IN, QUEUED, IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED}', dataOwner: 'Appointments', sourceOfTruth: 'PostgreSQL Appointment.startsAt/status', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count', zeroOrNotApplicableRule: 'zero when no rows', partialDataRule: 'identify the unavailable Appointment range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-05', formula: 'count(Appointment.id) with completedAt in range and status=COMPLETED', dataOwner: 'Appointments', sourceOfTruth: 'PostgreSQL Appointment.completedAt/status', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count', zeroOrNotApplicableRule: 'zero when no rows', partialDataRule: 'identify the unavailable Appointment range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-06', formula: 'count(Appointment.id) with cancelledAt in range and status=CANCELLED', dataOwner: 'Appointments', sourceOfTruth: 'PostgreSQL Appointment.cancelledAt/status', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count', zeroOrNotApplicableRule: 'zero when no rows', partialDataRule: 'identify the unavailable Appointment range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-07', formula: 'count(Appointment.id) with noShowAt in range and status=NO_SHOW', dataOwner: 'Appointments', sourceOfTruth: 'PostgreSQL Appointment.noShowAt/status', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'count', zeroOrNotApplicableRule: 'zero when no rows', partialDataRule: 'identify the unavailable Appointment range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-08', formula: 'KPI-05 / count(appointments whose terminal event in range is COMPLETED, CANCELLED, or NO_SHOW) × 100', dataOwner: 'Appointments', sourceOfTruth: 'PostgreSQL Appointment lifecycle', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'one decimal percentage', zeroOrNotApplicableRule: 'denominator 0 → not-applicable, never 0%', partialDataRule: 'identify the unavailable Appointment range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
  { id: 'KPI-09', formula: 'round-half-up(sum(startedAt - checkedInAt in whole minutes) / count(rows with both timestamps), 0)', dataOwner: 'Appointments', sourceOfTruth: 'PostgreSQL Appointment.checkedInAt/startedAt', scope: 'tenant-and-clinic', timeZone: 'Asia/Tehran', rounding: 'whole minutes, round-half-up', zeroOrNotApplicableRule: 'no qualifying rows → not-applicable', partialDataRule: 'identify the unavailable Appointment range; never estimate', staleDataRule: 'current at response asOf; do not claim stale without a retained snapshot' },
] as const satisfies readonly AppointmentReportingKpiDefinitionResponseDto[];

export class AppointmentReportingQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') clinicId?: string;
  @ApiPropertyOptional({ example: '2026-09-01' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/u) from?: string;
  @ApiPropertyOptional({ example: '2026-09-30' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/u) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class AppointmentReportingListItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ enum: statuses }) status!: string;
}

export class AppointmentReportingResponseDto {
  @ApiProperty({ format: 'uuid' }) clinicId!: string;
  @ApiProperty() timeZone!: string;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({ format: 'date-time' }) asOf!: Date;
  @ApiProperty({ enum: ['current', 'partial', 'stale'] }) sourceStatus!: 'current' | 'partial' | 'stale';
  @ApiProperty() scheduled!: number;
  @ApiProperty() completed!: number;
  @ApiProperty() cancelled!: number;
  @ApiProperty() noShow!: number;
  @ApiProperty({ nullable: true }) completionRate!: number | null;
  @ApiProperty({ nullable: true }) averageWaitMinutes!: number | null;
  @ApiProperty({ type: AppointmentReportingListItemResponseDto, isArray: true }) items!: AppointmentReportingListItemResponseDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
}

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
  @ApiPropertyOptional({ type: String, nullable: true }) patientDisplayName?: string | null;
  @ApiPropertyOptional() doctorDisplayName?: string;
  @ApiPropertyOptional() serviceName?: string;
  @ApiPropertyOptional({ enum: ['ONLINE', 'IN_PERSON'] }) visitMode?: string;
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
export class AdminQueueEntryResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ format: 'date-time' }) queuedAt!: Date; @ApiProperty({ type: AdminAppointmentResponseDto }) appointment!: AdminAppointmentResponseDto; }
export class AdminQueueResponseDto { @ApiProperty({ type: AdminQueueEntryResponseDto, isArray: true }) items!: AdminQueueEntryResponseDto[]; }
export class DashboardTodayPlanEntryResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ format: 'date-time' }) startsAt!: Date; @ApiProperty({ format: 'date-time' }) endsAt!: Date; @ApiProperty({ enum: statuses }) status!: string; @ApiProperty({ enum: ['IN_PERSON', 'ONLINE'] }) visitMode!: string; }
export class DashboardAppointmentActivityResponseDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() type!: string; @ApiPropertyOptional({ format: 'uuid', nullable: true }) appointmentId!: string | null; @ApiPropertyOptional({ format: 'uuid', nullable: true }) patientId!: string | null; @ApiProperty({ format: 'date-time' }) createdAt!: Date; }
export class DashboardAppointmentSummaryResponseDto {
  @ApiProperty({ format: 'date-time' }) asOf!: Date; @ApiProperty() timeZone!: string;
  @ApiProperty() todayAppointments!: number; @ApiProperty() inPersonAppointments!: number; @ApiProperty() onlineAppointments!: number; @ApiProperty() pendingRequests!: number;
  @ApiProperty() checkedIn!: number; @ApiProperty() queued!: number; @ApiProperty() inProgress!: number; @ApiProperty() completed!: number; @ApiProperty({ nullable: true }) averageWaitMinutes!: number | null;
  @ApiProperty({ type: DashboardTodayPlanEntryResponseDto, isArray: true }) todayPlan!: DashboardTodayPlanEntryResponseDto[];
  @ApiProperty({ type: DashboardAppointmentActivityResponseDto, isArray: true }) recentAppointmentActivity!: DashboardAppointmentActivityResponseDto[];
}
