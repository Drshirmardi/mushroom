import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const visitModes = ['IN_PERSON', 'ONLINE'] as const;

class PatientPageQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 10_000, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000)
  page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  pageSize = 20;
}

export class PatientDoctorListQueryDto extends PatientPageQueryDto {
  @ApiPropertyOptional({ maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) query?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') specialtyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') serviceId?: string;
  @ApiPropertyOptional({ enum: visitModes }) @IsOptional() @IsIn(visitModes) visitMode?: (typeof visitModes)[number];
}

export class PatientServiceListQueryDto extends PatientPageQueryDto {
  @ApiPropertyOptional({ maxLength: 160 }) @IsOptional() @IsString() @MaxLength(160) query?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') doctorId?: string;
  @ApiPropertyOptional({ enum: visitModes }) @IsOptional() @IsIn(visitModes) visitMode?: (typeof visitModes)[number];
}

export class PatientSpecialtyDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() name!: string; }
export class PatientServiceDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() name!: string; @ApiPropertyOptional({ nullable: true }) description!: string | null; }
export class PatientOfferingDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty({ type: PatientServiceDto }) service!: PatientServiceDto; @ApiProperty({ enum: visitModes }) visitMode!: string; @ApiProperty() durationMinutes!: number; @ApiProperty() bufferMinutes!: number; @ApiProperty() priceAmount!: number; @ApiProperty({ enum: ['IRR'] }) currency!: string; }
export class PatientDoctorListItemDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() displayName!: string; @ApiPropertyOptional({ nullable: true }) profileImageUrl!: string | null; @ApiPropertyOptional({ nullable: true }) yearsExperience!: number | null; @ApiProperty({ type: PatientSpecialtyDto, isArray: true }) specialties!: PatientSpecialtyDto[]; @ApiProperty({ type: PatientOfferingDto, isArray: true }) offerings!: PatientOfferingDto[]; }
export class PatientClinicDto { @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() name!: string; @ApiProperty() timeZone!: string; }
export class PatientDoctorDetailDto extends PatientDoctorListItemDto { @ApiPropertyOptional({ nullable: true }) biography!: string | null; @ApiProperty({ type: [String] }) languages!: string[]; @ApiProperty({ type: [String] }) education!: string[]; @ApiProperty({ type: [String] }) certifications!: string[]; @ApiProperty({ type: PatientClinicDto }) clinic!: PatientClinicDto; }
export class PatientDoctorPageResponseDto { @ApiProperty({ type: PatientDoctorListItemDto, isArray: true }) items!: PatientDoctorListItemDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
export class PatientServicePageResponseDto { @ApiProperty({ type: PatientServiceDto, isArray: true }) items!: PatientServiceDto[]; @ApiProperty() page!: number; @ApiProperty() pageSize!: number; @ApiProperty() total!: number; }
