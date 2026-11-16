import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Prisma } from '../../../generated/prisma/client';

export class ProgramOfferingCardQueryDto {
  @ApiPropertyOptional({ type: Number, default: 20, maximum: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20)
  limit = 20;

  @ApiPropertyOptional({ maxLength: 128 })
  @IsOptional() @IsString() @MaxLength(128)
  cursor?: string;
}

class OfferingCardDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
  @ApiProperty() category!: string;
  @ApiProperty() amountRial!: string;
}

export class ReadyOfferingCardDto extends OfferingCardDto {
  @ApiProperty() baseAmountRial!: string;
  @ApiProperty() discountPercent!: number;
  @ApiProperty({ enum: ['DAYS', 'PERPETUAL'] }) accessMode!: string;
  @ApiProperty({ type: Number, nullable: true }) accessDurationDays!: number | null;
}

class OfferingCardPhysicianDto {
  @ApiProperty() displayName!: string;
}

export class CustomOfferingCardDto extends OfferingCardDto {
  @ApiProperty({ type: OfferingCardPhysicianDto }) physician!: OfferingCardPhysicianDto;
  @ApiProperty() requestSupported!: boolean;
}

class OfferingCardPageDto {
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}

export class ReadyOfferingCardPageDto extends OfferingCardPageDto {
  @ApiProperty({ type: [ReadyOfferingCardDto] }) items!: ReadyOfferingCardDto[];
}

export class CustomOfferingCardPageDto extends OfferingCardPageDto {
  @ApiProperty({ type: [CustomOfferingCardDto] }) items!: CustomOfferingCardDto[];
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export function offeringCardBoundary(cursor: string | undefined) {
  if (cursor === undefined) return Prisma.empty;
  try {
    const decoded = Buffer.from(cursor, 'base64url');
    const parsed: unknown = JSON.parse(decoded.toString('utf8'));
    if (decoded.toString('base64url') === cursor && Array.isArray(parsed) && parsed.length === 3) {
      const [version, timestamp, id] = parsed;
      if (version === 1 && typeof timestamp === 'string' && typeof id === 'string' && uuid.test(id)) {
        const date = new Date(timestamp);
        if (date.toISOString() === timestamp) {
          return Prisma.sql`AND (pub.created_at, pub.id) < (${date}::timestamptz, ${id}::uuid)`;
        }
      }
    }
  } catch {
    // Treat decoding, JSON and date errors identically.
  }
  throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Invalid catalog cursor.', details: {} });
}

export function nextOfferingCardCursor(rows: { id: string; createdAt: Date }[], limit: number) {
  if (rows.length <= limit) return null;
  const last = rows[limit - 1]!;
  return Buffer.from(JSON.stringify([1, last.createdAt.toISOString(), last.id])).toString('base64url');
}
