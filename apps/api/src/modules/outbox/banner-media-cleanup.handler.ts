import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ProductImageStorage } from '../commerce/media/product-image-storage';
import { ownBannerMedia } from '../content/banner-media.policy';

@Injectable()
export class BannerMediaCleanupHandler {
  constructor(private readonly prisma: PrismaService, private readonly storage: ProductImageStorage) {}
  async handle(payload: unknown) {
    const input = payload as { key?: string; bannerId?: string; clinicId?: string; deadline?: string };
    if (input.key === '') return;
    if (!input.bannerId || !input.clinicId || !/^[a-f0-9-]{36}$/u.test(input.bannerId) || !/^[a-f0-9-]{36}$/u.test(input.clinicId) || !ownBannerMedia({ id: input.bannerId, clinicId: input.clinicId, mediaObjectKey: input.key ?? null, mediaContentType: 'image/webp' })) throw new Error('Invalid banner cleanup intent');
    if (!input.deadline || !Number.isFinite(Date.parse(input.deadline)) || Date.now() <= Date.parse(input.deadline)) throw new Error('Banner upload deadline is not complete');
    if (await this.prisma.banner.findFirst({ where: { mediaObjectKey: input.key } })) return;
    await this.storage.delete(input.key!);
  }
}
