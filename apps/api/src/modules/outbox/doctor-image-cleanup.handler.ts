import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ProductImageStorage } from '../commerce/media/product-image-storage';

@Injectable()
export class DoctorImageCleanupHandler {
  constructor(private readonly prisma: PrismaService, private readonly storage: ProductImageStorage) {}

  async handle(payload: unknown) {
    const { key } = payload as { key?: string };
    if (!key || !/^doctors\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/u.test(key)) {
      throw new Error('Invalid doctor image cleanup key');
    }
    if (await this.prisma.doctorProfile.findFirst({ where: { profileImageObjectKey: key }, select: { id: true } })) return;
    await this.storage.delete(key);
  }
}
