import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ProductImageStorage } from '../commerce/media/product-image-storage';

@Injectable()
export class ProductImageCleanupHandler {
  constructor(private readonly prisma: PrismaService, private readonly storage: ProductImageStorage) {}
  async handle(payload: unknown) {
    const input = payload as { key?: string; productId?: string; imageId?: string; deadline?: string };
    if (!input.key) return;
    if (!/^store\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(input.key) || !input.productId || !input.imageId) throw new Error('Invalid product image cleanup intent');
    if (input.key.split('/')[2] !== input.productId || input.key.split('/')[3] !== `${input.imageId}.webp`) throw new Error('Product image cleanup generation mismatch');
    if (input.deadline && Date.now() <= Date.parse(input.deadline)) throw new Error('Image upload is still in progress');
    const current = await this.prisma.commerceProductImage.findUnique({ where: { objectKey: input.key } });
    if (current?.status === 'READY') return;
    await this.storage.delete(input.key);
    await this.prisma.commerceProductImage.deleteMany({ where: { id: input.imageId, productId: input.productId, objectKey: input.key, status: 'DELETE_PENDING' } });
  }
}
