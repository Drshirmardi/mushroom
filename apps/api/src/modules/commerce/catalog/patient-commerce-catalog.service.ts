import { imageMetadata, type ImageRecord } from '../media/product-image.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PatientCommerceListQueryDto } from './patient-commerce-catalog.dto';
import { publicContent, publicContentSummary, type PublicContentSummaryRecord } from './product-content.policy';

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
      this.prisma.commerceProduct.findMany({ where, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, select: this.listSelect }),
    ]);
    return { items: products.map((product) => this.product(product)), page: query.page, pageSize: query.pageSize, total };
  }

  async detail(id: string) {
    const clinic = await this.activeClinic();
    const product = await this.prisma.commerceProduct.findFirst({ where: { id, clinicId: clinic.id, status: 'ACTIVE', category: { isActive: true }, skus: { some: { isActive: true } } }, include: this.include });
    if (!product) throw missing();
    return { ...this.product(product), content: publicContent(product) };
  }

  readonly include = { image: true, category: true, skus: { where: { isActive: true }, orderBy: [{ code: 'asc' }, { id: 'asc' }] } } satisfies Prisma.CommerceProductInclude;
  private readonly listSelect = {
    id: true, title: true, slug: true, brand: true, shortDescription: true, description: true,
    legacyContent: true, contentRevision: true, approvedContentRevision: true,
    contentApprovedAt: true, contentApprovedByUserId: true,
    image: { select: { id: true, status: true, mimeType: true, sizeBytes: true, width: true, height: true, altText: true } },
    category: { select: { id: true, name: true, slug: true } },
    skus: { ...this.include.skus, select: { id: true, code: true, title: true, currentPriceToman: true, currentTaxToman: true } },
  } satisfies Prisma.CommerceProductSelect;
  private async activeClinic() {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, select: { id: true } });
    if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The active clinic was not found.', details: {} });
    return clinic;
  }
  product(product: PublicContentSummaryRecord & { id: string; title: string; slug: string; image?: ImageRecord | null; category: { id: string; name: string; slug: string }; skus: Array<{ id: string; code: string; title: string | null; currentPriceToman: bigint; currentTaxToman: bigint }> }) {
    return { image: imageMetadata(product.id, product.image), id: product.id, title: product.title, slug: product.slug, ...publicContentSummary(product), category: { id: product.category.id, name: product.category.name, slug: product.category.slug }, skus: product.skus.map((sku) => ({ id: sku.id, code: sku.code, title: sku.title, currentPriceToman: sku.currentPriceToman.toString(), currentTaxToman: sku.currentTaxToman.toString() })) };
  }
}
