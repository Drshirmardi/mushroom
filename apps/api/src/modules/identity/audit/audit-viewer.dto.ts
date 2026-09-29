import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export const auditActions = ['READ', 'CREATE', 'UPDATE', 'SIGN', 'AMEND', 'PUBLISH', 'EXPORT'] as const;

export class AuditViewerQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'An active clinic scope. If omitted, the server selects its active default clinic.' }) @IsOptional() @IsUUID('4') clinicId?: string;
  @ApiPropertyOptional({ example: '2026-09-01', description: 'Asia/Tehran local date.' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/u) from?: string;
  @ApiPropertyOptional({ example: '2026-09-30', description: 'Asia/Tehran local date.' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/u) to?: string;
  @ApiPropertyOptional({ enum: auditActions }) @IsOptional() @IsIn(auditActions) action?: (typeof auditActions)[number];
  @ApiPropertyOptional({ maxLength: 100, description: 'Clinical resource type only; this is not free-text search.' }) @IsOptional() @IsString() @MaxLength(100) subjectType?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Actor user identifier within the selected clinic audit scope.' }) @IsOptional() @IsUUID('4') actorId?: string;
  @ApiPropertyOptional({ maxLength: 512, description: 'Opaque cursor returned by the preceding page.' }) @IsOptional() @IsString() @MaxLength(512) cursor?: string;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 25 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
}

export class AuditViewerItemDto {
  @ApiProperty({ format: 'uuid', description: 'Opaque audit-event identifier.' }) id!: string;
  @ApiProperty({ enum: auditActions }) action!: (typeof auditActions)[number];
  @ApiProperty({ type: String, nullable: true, description: 'Redacted actor reference; never a user identifier.' }) actorReference!: string | null;
  @ApiProperty({ description: 'Redacted subject reference; never a patient identifier.' }) subjectReference!: string;
  @ApiProperty({ description: 'Allow-listed clinical resource type.' }) subjectType!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Redacted request/correlation reference.' }) requestCorrelationReference!: string | null;
  @ApiProperty({ type: Object, additionalProperties: { type: 'string' }, description: 'Fixed safe summary, never raw audit metadata.' }) metadataSummary!: Record<string, string>;
  @ApiProperty({ format: 'date-time' }) occurredAt!: Date;
}

export class AuditViewerPageDto {
  @ApiProperty({ format: 'uuid' }) clinicId!: string;
  @ApiProperty({ example: 'Asia/Tehran' }) timeZone!: 'Asia/Tehran';
  @ApiProperty({ example: '2026-09-01' }) from!: string;
  @ApiProperty({ example: '2026-09-30' }) to!: string;
  @ApiProperty({ format: 'date-time' }) asOf!: Date;
  @ApiProperty({ type: AuditViewerItemDto, isArray: true }) items!: AuditViewerItemDto[];
  @ApiPropertyOptional({ type: String, nullable: true }) nextCursor!: string | null;
}
