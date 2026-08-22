import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class SessionListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10_000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export class SessionListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  current!: boolean;

  @ApiProperty()
  remembered!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  lastUsedAt!: Date;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: Date;
}

export class SessionListResponseDto {
  @ApiProperty({ type: SessionListItemDto, isArray: true })
  items!: SessionListItemDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
