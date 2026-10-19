import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateBy } from 'class-validator';
import { safeBannerDestination } from './banner-media.policy';

export class MediaDto {
  @ApiProperty({ example: 'content/7c47f4af-3f20-4402-bb01-e6193cf79445/cover.webp' }) @IsString() @MaxLength(512) objectKey!: string;
  @ApiProperty({ example: 'image/webp' }) @IsString() @MaxLength(120) contentType!: string;
  @ApiProperty({ example: 245000 }) @IsInt() @Min(1) @Max(5_000_000) sizeBytes!: number;
}

export class CreateCategoryDto { @ApiProperty() @IsString() @MaxLength(120) name!: string; @ApiProperty() @IsString() @MaxLength(140) slug!: string; }
export class UpdateCategoryDto { @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string; @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(140) slug?: string; }
export class CreateArticleDto { @ApiProperty() @IsString() @MaxLength(180) slug!: string; @ApiProperty() @IsString() @MaxLength(240) title!: string; @ApiProperty() @IsString() @MaxLength(500) @IsOptional() summary?: string; @ApiProperty() @IsString() @MaxLength(100_000) body!: string; @ApiProperty() @IsString() categoryId!: string; @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }) @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) publicationStatus?: 'DRAFT'|'PUBLISHED'|'ARCHIVED'; @ApiPropertyOptional({ type: MediaDto }) @IsOptional() cover?: MediaDto; }
export class UpdateArticleDto { @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(180) slug?: string; @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) title?: string; @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) summary?: string; @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100_000) body?: string; @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string; @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }) @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) publicationStatus?: 'DRAFT'|'PUBLISHED'|'ARCHIVED'; @ApiPropertyOptional({ type: MediaDto }) @IsOptional() cover?: MediaDto; }
export class CreateBannerDto { @ApiProperty() @IsString() @MaxLength(240) title!: string; @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @ValidateBy({ name: 'bannerDestination', validator: { validate: safeBannerDestination } }) destinationUrl?: string | null; @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }) @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) publicationStatus?: 'DRAFT'|'PUBLISHED'|'ARCHIVED'; @ApiPropertyOptional({ type: MediaDto }) @IsOptional() media?: MediaDto; }
export class UpdateBannerDto { @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(240) title?: string; @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() @ValidateBy({ name: 'bannerDestination', validator: { validate: safeBannerDestination } }) destinationUrl?: string | null; @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }) @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) publicationStatus?: 'DRAFT'|'PUBLISHED'|'ARCHIVED'; @ApiPropertyOptional({ type: MediaDto }) @IsOptional() media?: MediaDto; }

export class PublicBannerDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) destinationUrl!: string | null;
  @ApiProperty({ type: String, nullable: true }) contentPath!: string | null;
}
export class AdminBannerDto extends PublicBannerDto {
  @ApiProperty({ format: 'uuid' }) clinicId!: string;
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }) publicationStatus!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) publishedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true }) mediaObjectKey!: string | null;
  @ApiProperty({ type: String, nullable: true }) mediaContentType!: string | null;
  @ApiProperty({ type: Number, nullable: true }) mediaSizeBytes!: number | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
  @ApiProperty() etag!: string;
}
export class PublicBannerListDto { @ApiProperty({ type: [PublicBannerDto] }) items!: PublicBannerDto[]; }
export class AdminBannerListDto { @ApiProperty({ type: [AdminBannerDto] }) items!: AdminBannerDto[]; }
