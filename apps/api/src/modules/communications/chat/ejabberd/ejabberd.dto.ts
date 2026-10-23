import { ChatAccessResponseDto } from '../chat.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class EjabberdSessionDto extends ChatAccessResponseDto {
  @ApiProperty({ enum: ['ejabberd'] }) transport!: 'ejabberd';
  @ApiProperty({ format: 'uuid' }) conversationId!: string;
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty() websocketUrl!: string;
  @ApiProperty() jid!: string;
  @ApiProperty({ description: 'Short-lived XMPP password. Keep in memory; never log or persist.' }) token!: string;
  @ApiProperty({ enum: ['sabz'] }) resource!: 'sabz';
  @ApiProperty() roomJid!: string;
  @ApiProperty({ enum: ['PATIENT', 'DOCTOR', 'CLINIC_OPERATOR'] }) senderKind!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ description: 'Authoritative retained history; use its opaque cursor for recovery.' }) historyUrl!: string;
  @ApiProperty({ description: 'Durable moderation changes must also be reconciled on reconnect.' }) visibilityUrl!: string;
}

export const ENGINE_ACTIONS = ['SESSION', 'JOIN', 'HISTORY', 'SEND', 'DELIVER', 'RECEIPT', 'READ'] as const;

/** Private engine-to-API contract. No credentials or body are put in a URL. */
export class EjabberdPolicyDto {
  @IsEnum(ENGINE_ACTIONS) action!: (typeof ENGINE_ACTIONS)[number];
  @IsString() @MaxLength(256) actorJid!: string;
  @IsOptional() @IsString() @MaxLength(256) roomJid?: string;
  @IsOptional() @IsUUID('4') messageId?: string;
  @IsOptional() @IsUUID('4') clientMessageId?: string;
  @IsOptional() @IsString() @MaxLength(8000) body?: string;
}
