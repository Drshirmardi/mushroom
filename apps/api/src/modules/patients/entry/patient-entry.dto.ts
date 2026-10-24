import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

const profileGenderValues = ['FEMALE', 'MALE'] as const;

export class EntryProfileDto {
  @ApiProperty({ maxLength: 80 }) @IsString() @MaxLength(80) firstName!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MaxLength(100) lastName!: string;
  @ApiProperty({ enum: profileGenderValues }) @IsIn(profileGenderValues) gender!: (typeof profileGenderValues)[number];
  @ApiProperty({ format: 'date' }) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate!: string;
}
export class EntryPolicyUpdateDto {
  @ApiProperty() @IsBoolean() enabled!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) @IsOptional() @IsUUID('4') assessmentVersionId!: string | null;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) expectedRevision!: number;
}
export class EntryPolicyDto {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) assessmentVersionId!: string | null;
  @ApiProperty({ type: String, nullable: true }) assessmentTitle!: string | null;
  @ApiProperty() revision!: number;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) enforcedFrom!: Date | null;
}
export class PatientEntryStatusDto {
  @ApiProperty() required!: boolean;
  @ApiProperty() assessmentRequired!: boolean;
  @ApiProperty({ enum: ['PROFILE', 'ASSESSMENT', 'RESULT', 'COMPLETE', 'UNAVAILABLE'] }) phase!: 'PROFILE' | 'ASSESSMENT' | 'RESULT' | 'COMPLETE' | 'UNAVAILABLE';
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) assessmentVersionId!: string | null;
  @ApiProperty({ type: String, nullable: true }) assessmentTitle!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) submissionId!: string | null;
  @ApiProperty({ type: String, nullable: true }) firstName!: string | null;
  @ApiProperty({ type: String, nullable: true }) lastName!: string | null;
  @ApiProperty({ type: String, nullable: true, enum: profileGenderValues }) gender!: (typeof profileGenderValues)[number] | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) birthDate!: string | null;
}
