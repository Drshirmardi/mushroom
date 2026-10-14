import { ApiProperty } from '@nestjs/swagger';

export class ProductImageDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() contentPath!: string;
  @ApiProperty({ enum: ['image/webp'] }) mimeType!: string;
  @ApiProperty({ minimum: 1, maximum: 5242880 }) sizeBytes!: number;
  @ApiProperty({ minimum: 1, maximum: 1600 }) width!: number;
  @ApiProperty({ minimum: 1, maximum: 1600 }) height!: number;
  @ApiProperty({ maxLength: 240 }) altText!: string;
}

export type ImageRecord = { id: string; status: string; mimeType: string; sizeBytes: number; width: number; height: number; altText: string };

export function imageMetadata(productId: string, image: ImageRecord | null | undefined, admin = false): ProductImageDto | null {
  if (!image || image.status !== 'READY') return null;
  return {
    id: image.id,
    contentPath: admin ? `/v1/admin/commerce/products/${productId}/image/content` : `/v1/commerce/products/${productId}/images/${image.id}`,
    mimeType: image.mimeType, sizeBytes: image.sizeBytes, width: image.width, height: image.height, altText: image.altText,
  };
}

export const imageEtag = (image: ProductImageDto | null) => `"${image?.id ?? 'none'}"`;
