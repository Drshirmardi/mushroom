import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CreatePatientAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  doctorServiceId!: string;

  @ApiProperty({ format: 'date-time', example: '2026-09-10T08:30:00.000Z' })
  @IsDateString({ strict: true })
  startsAt!: string;
}

export class PatientAppointmentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) clinicId!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid' }) doctorServiceId!: string;
  @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ format: 'date-time' }) endsAt!: Date;
  @ApiProperty({ enum: ['PENDING'] }) status!: string;
  @ApiProperty() priceAmount!: number;
  @ApiProperty({ enum: ['IRR'] }) currency!: string;
  @ApiProperty({ format: 'date-time' }) priceCapturedAt!: Date;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
