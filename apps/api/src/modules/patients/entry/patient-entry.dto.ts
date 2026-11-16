import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

const profileGenderValues = ['FEMALE', 'MALE'] as const;

export class EntryProfileDto {
  @ApiProperty({ maxLength: 80 }) @IsString() @MaxLength(80) firstName!: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MaxLength(100) lastName!: string;
  @ApiProperty({ enum: profileGenderValues }) @IsIn(profileGenderValues) gender!: (typeof profileGenderValues)[number];
  @ApiProperty({ format: 'date' }) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate!: string;
}
export class EntryPolicyUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^(0|[1-9][0-9]{0,18})$/) amountRial?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowDeferral?: boolean;
  @ApiPropertyOptional({ maxLength: 20000, nullable: true, type: String }) @IsOptional() @IsString() @MaxLength(20000) introduction?: string | null;
  @ApiProperty() @IsBoolean() enabled!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) @IsOptional() @IsUUID('4') assessmentVersionId!: string | null;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) expectedRevision!: number;
}
export class EntryPolicyDto {
  @ApiPropertyOptional() amountRial?: string;
  @ApiPropertyOptional() allowDeferral?: boolean;
  @ApiPropertyOptional({ type: String, nullable: true }) introduction?: string | null;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) assessmentVersionId!: string | null;
  @ApiProperty({ type: String, nullable: true }) assessmentTitle!: string | null;
  @ApiProperty() revision!: number;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) enforcedFrom!: Date | null;
}
export class PatientEntryStatusDto {
  @ApiPropertyOptional() amountRial?: string;
  @ApiPropertyOptional() allowDeferral?: boolean;
  @ApiPropertyOptional() reminder?: boolean;
  @ApiPropertyOptional({type:String,nullable:true}) intentId?: string|null;
  @ApiPropertyOptional() introduction?: string;
  @ApiProperty() required!: boolean;
  @ApiProperty() assessmentRequired!: boolean;
  @ApiProperty({ enum: ['PROFILE', 'PAYMENT', 'ASSESSMENT', 'RESULT', 'COMPLETE', 'UNAVAILABLE'] }) phase!: 'PROFILE' | 'PAYMENT' | 'ASSESSMENT' | 'RESULT' | 'COMPLETE' | 'UNAVAILABLE';
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) assessmentVersionId!: string | null;
  @ApiProperty({ type: String, nullable: true }) assessmentTitle!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) submissionId!: string | null;
  @ApiProperty({ type: String, nullable: true }) firstName!: string | null;
  @ApiProperty({ type: String, nullable: true }) lastName!: string | null;
  @ApiProperty({ type: String, nullable: true, enum: profileGenderValues }) gender!: (typeof profileGenderValues)[number] | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) birthDate!: string | null;
}
