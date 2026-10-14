import { imageMetadata, type ImageRecord } from '../media/product-image.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PatientCommerceListQueryDto } from './patient-commerce-catalog.dto';

const missing = () => new NotFoundException({ code: 'COMMERCE_PRODUCT_NOT_FOUND', message: 'Commerce product was not found.', details: {} });
const normalizeQuery = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ');

@Injectable()
export class PatientCommerceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PatientCommerceListQueryDto) {
    const clinic = await this.activeClinic();
    const where: Prisma.CommerceProductWhereInput = {
      clinicId: clinic.id,
      status: 'ACTIVE',
      category: { isActive: true },
      skus: { some: { isActive: true } },
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.query ? { title: { contains: normalizeQuery(query.query), mode: 'insensitive' } } : {}),
    };
    const [total, products] = await this.prisma.$transaction([
      this.prisma.commerceProduct.count({ where }),
      this.prisma.commerceProduct.findMany({ where, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: this.include }),
    ]);
    return { items: products.map((product) => this.product(product)), page: query.page, pageSize: query.pageSize, total };
  }

  async detail(id: string) {
    const clinic = await this.activeClinic();
    const product = await this.prisma.commerceProduct.findFirst({ where: { id, clinicId: clinic.id, status: 'ACTIVE', category: { isActive: true }, skus: { some: { isActive: true } } }, include: this.include });
    if (!product) throw missing();
    return this.product(product);
  }

  private readonly include = { image: true, category: true, skus: { where: { isActive: true }, orderBy: [{ code: 'asc' }, { id: 'asc' }] } } satisfies Prisma.CommerceProductInclude;
  private async activeClinic() {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, select: { id: true } });
    if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The active clinic was not found.', details: {} });
    return clinic;
  }
  private product(product: { id: string; title: string; slug: string; description: string | null; image?: ImageRecord | null; category: { id: string; name: string; slug: string }; skus: Array<{ id: string; code: string; title: string | null; currentPriceToman: bigint; currentTaxToman: bigint }> }) {
    return { image: imageMetadata(product.id, product.image), id: product.id, title: product.title, slug: product.slug, description: product.description, category: { id: product.category.id, name: product.category.name, slug: product.category.slug }, skus: product.skus.map((sku) => ({ id: sku.id, code: sku.code, title: sku.title, currentPriceToman: sku.currentPriceToman.toString(), currentTaxToman: sku.currentTaxToman.toString() })) };
  }
}
