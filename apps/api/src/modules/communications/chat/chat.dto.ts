import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CHAT_REASON_CATEGORIES = [
  'ABUSE_OR_HARASSMENT',
  'THREAT_OR_SAFETY',
  'SENSITIVE_DATA_EXPOSURE',
  'SPAM_OR_SCAM',
  'MALICIOUS_CONTENT',
  'OTHER',
] as const;

export const CHAT_BLOCK_SCOPES = [
  'PATIENT_DOCTOR',
  'PATIENT_CLINIC_OPERATOR',
] as const;

export const CHAT_REPORT_RESOLUTIONS = [
  'DISMISSED_NO_VIOLATION',
  'UPHELD_POLICY_VIOLATION',
  'INSUFFICIENT_EVIDENCE',
  'ESCALATED_SAFETY_OR_LEGAL',
] as const;

export const CHAT_REPORT_ACTIONS = [
  'NO_ADDITIONAL_ACTION',
  'RESTRICT_MESSAGE',
  'RECORD_WARNING',
  'CONFIRM_PATIENT_DOCTOR_BLOCK',
  'CONFIRM_PATIENT_CLINIC_OPERATOR_BLOCK',
  'LIFT_TEMPORARY_BLOCK',
] as const;

export class ChatHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Opaque, versioned server cursor.' })
  @IsOptional() @IsString() @MaxLength(512) cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}

export class ChatVisibilityReconciliationQueryDto {
  @ApiPropertyOptional({ description: 'Opaque, server-bound cursor for durable visibility transitions.' })
  @IsOptional() @IsString() @MaxLength(512) cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}

export class SendChatMessageDto {
  @ApiProperty({ format: 'uuid', description: 'Client-generated idempotency identifier.' })
  @IsUUID('4') clientMessageId!: string;

  @ApiProperty({ maxLength: 4000 })
  @IsString() body!: string;
}

export class CreateChatReportDto {
  @ApiProperty({ enum: CHAT_REASON_CATEGORIES })
  @IsEnum(CHAT_REASON_CATEGORIES) reasonCategory!: (typeof CHAT_REASON_CATEGORIES)[number];

  @ApiPropertyOptional({ maxLength: 500, description: 'Optional non-sensitive note; never message or medical text.' })
  @IsOptional() @IsString() @MaxLength(500) reporterNote?: string;

  @ApiPropertyOptional({ description: 'Request an effective pending-review conversation-scoped block.' })
  @IsOptional() @IsBoolean() requestImmediateBlock?: boolean;

  @ApiPropertyOptional({ enum: CHAT_BLOCK_SCOPES, description: 'ADMIN-only explicit block scope.' })
  @IsOptional() @IsEnum(CHAT_BLOCK_SCOPES) blockScope?: (typeof CHAT_BLOCK_SCOPES)[number];
}

export class ChangeChatVisibilityDto {
  @ApiProperty({ enum: ['RESTRICTED', 'VISIBLE'] })
  @IsEnum(['RESTRICTED', 'VISIBLE']) visibility!: 'RESTRICTED' | 'VISIBLE';

  @ApiPropertyOptional({ enum: CHAT_REASON_CATEGORIES })
  @IsOptional() @IsEnum(CHAT_REASON_CATEGORIES) reasonCategory?: (typeof CHAT_REASON_CATEGORIES)[number];

  @ApiPropertyOptional({ maxLength: 500, description: 'Non-sensitive administrative note.' })
  @IsOptional() @IsString() @MaxLength(500) safeNote?: string;
}

export class ResolveChatReportDto {
  @ApiProperty({ enum: CHAT_REPORT_RESOLUTIONS })
  @IsEnum(CHAT_REPORT_RESOLUTIONS) resolution!: (typeof CHAT_REPORT_RESOLUTIONS)[number];

  @ApiProperty({ enum: CHAT_REPORT_ACTIONS })
  @IsEnum(CHAT_REPORT_ACTIONS) action!: (typeof CHAT_REPORT_ACTIONS)[number];

  @ApiPropertyOptional({ maxLength: 500, description: 'Non-sensitive administrative note.' })
  @IsOptional() @IsString() @MaxLength(500) safeNote?: string;
}

export class ChatMessageResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() sequence!: string;
  @ApiProperty({ enum: ['PATIENT', 'DOCTOR', 'CLINIC_OPERATOR'] }) senderKind!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ enum: ['VISIBLE', 'RESTRICTED'] }) visibility!: string;
  @ApiPropertyOptional() body?: string;
  @ApiPropertyOptional({ enum: CHAT_REASON_CATEGORIES }) restrictedReasonCategory?: string;
  @ApiPropertyOptional({ description: 'Safe tombstone shown instead of restricted text.' }) tombstone?: string;
}

export class ChatConversationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty({ format: 'uuid' }) clinicId!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty() createdAt!: Date;
}

export class ChatHistoryResponseDto {
  @ApiProperty({ type: ChatMessageResponseDto, isArray: true }) items!: ChatMessageResponseDto[];
  @ApiPropertyOptional() nextCursor?: string | null;
  @ApiProperty() highWaterSequence!: string;
}

export class ChatVisibilityReconciliationItemDto {
  @ApiProperty({ description: 'Opaque durable moderation transition identity.' }) revision!: string;
  @ApiProperty({ type: ChatMessageResponseDto }) message!: ChatMessageResponseDto;
}

export class ChatVisibilityReconciliationResponseDto {
  @ApiProperty({ type: ChatVisibilityReconciliationItemDto, isArray: true }) items!: ChatVisibilityReconciliationItemDto[];
  @ApiPropertyOptional() nextCursor?: string | null;
  @ApiPropertyOptional({ description: 'Opaque checkpoint to persist after applying this page.' }) checkpointCursor?: string | null;
  @ApiPropertyOptional({ description: 'Opaque high-water revision identity.' }) highWaterRevision?: string | null;
}
