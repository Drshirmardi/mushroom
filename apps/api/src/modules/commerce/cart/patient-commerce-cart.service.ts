import { imageMetadata, type ImageRecord } from '../media/product-image.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { UpdatePatientCartDto, UpdatePatientWishlistDto } from './patient-commerce-cart.dto';
import { publicContentSummary, type ContentRecord } from '../catalog/product-content.policy';

const profileMissing = () => new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });
const skuMissing = () => new NotFoundException({ code: 'COMMERCE_SKU_NOT_FOUND', message: 'An active commerce SKU was not found.', details: {} });

@Injectable()
export class PatientCommerceCartService {
  constructor(private readonly prisma: PrismaService) {}
  async cart(userId: string) {
    const patient = await this.patient(userId);
    const cart = await this.prisma.$transaction(async (tx) => {
      await this.pruneCart(tx, patient.id);
      return tx.commerceCart.findUnique({ where: { patientId: patient.id }, include: this.cartInclude });
    });
    return { items: cart?.items.map((item) => this.cartItem(item)) ?? [] };
  }
  async updateCart(userId: string, body: UpdatePatientCartDto) {
    const patient = await this.patient(userId);
    await this.prisma.$transaction(async (tx) => {
      if (body.quantity === 0) {
        const cart = await tx.commerceCart.findUnique({ where: { patientId: patient.id }, select: { id: true } });
        if (cart) await tx.commerceCartItem.deleteMany({ where: { cartId: cart.id, skuId: body.skuId } });
        return;
      }
      const sku = await this.activeSku(tx, patient.clinicId, body.skuId);
      const cart = await tx.commerceCart.upsert({ where: { patientId: patient.id }, create: { clinicId: patient.clinicId, patientId: patient.id }, update: {} });
      await tx.commerceCartItem.upsert({ where: { cartId_skuId: { cartId: cart.id, skuId: sku.id } }, create: { cartId: cart.id, skuId: sku.id, quantity: body.quantity }, update: { quantity: body.quantity } });
    });
    return this.cart(userId);
  }
  async wishlist(userId: string) {
    const patient = await this.patient(userId);
    const items = await this.prisma.$transaction(async (tx) => {
      await this.pruneWishlist(tx, patient.id);
      return tx.wishlistItem.findMany({ where: { patientId: patient.id }, include: this.wishlistInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    });
    return { items: items.map((item) => this.wishlistItem(item)) };
  }
  async updateWishlist(userId: string, body: UpdatePatientWishlistDto) {
    const patient = await this.patient(userId);
    await this.prisma.$transaction(async (tx) => {
      if (!body.saved) {
        await tx.wishlistItem.deleteMany({ where: { patientId: patient.id, skuId: body.skuId } });
        return;
      }
      const sku = await this.activeSku(tx, patient.clinicId, body.skuId);
      await tx.wishlistItem.upsert({ where: { patientId_skuId: { patientId: patient.id, skuId: sku.id } }, create: { patientId: patient.id, skuId: sku.id }, update: {} });
    });
    return this.wishlist(userId);
  }
  private readonly skuInclude = { product: { include: { image: true, skus: { where: { isActive: true }, select: { id: true }, take: 1 }, clinic: { select: { status: true } }, category: true } } } satisfies Prisma.CommerceSkuInclude;
  private readonly cartInclude = { items: { include: { sku: { include: this.skuInclude } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } satisfies Prisma.CommerceCartInclude;
  private readonly wishlistInclude = { sku: { include: this.skuInclude } } satisfies Prisma.WishlistItemInclude;
  private async pruneCart(tx: Prisma.TransactionClient, patientId: string) { await tx.commerceCartItem.deleteMany({ where: { cart: { patientId }, OR: [{ sku: { isActive: false } }, { sku: { product: { status: { not: 'ACTIVE' } } } }, { sku: { product: { category: { isActive: false } } } }] } }); }
  private async pruneWishlist(tx: Prisma.TransactionClient, patientId: string) { await tx.wishlistItem.deleteMany({ where: { patientId, OR: [{ sku: { isActive: false } }, { sku: { product: { status: { not: 'ACTIVE' } } } }, { sku: { product: { category: { isActive: false } } } }] } }); }
  private async patient(userId: string) { const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } }); if (!patient) throw profileMissing(); return patient; }
  private async activeSku(tx: Prisma.TransactionClient, clinicId: string, id: string) { const sku = await tx.commerceSku.findFirst({ where: { id, clinicId, isActive: true, product: { status: 'ACTIVE', category: { isActive: true } } }, select: { id: true } }); if (!sku) throw skuMissing(); return sku; }
  private sku(sku: { id: string; code: string; title: string | null; currentPriceToman: bigint; currentTaxToman: bigint }) { return { id: sku.id, code: sku.code, title: sku.title, currentPriceToman: sku.currentPriceToman.toString(), currentTaxToman: sku.currentTaxToman.toString() }; }
  private product(product: ContentRecord & { id: string; title: string; slug: string; description: string | null; image?: ImageRecord | null; skus?: Array<{ id: string }>; status?: string; clinic?: { status: string }; category: { id: string; name: string; slug: string; isActive?: boolean } }) { return { image: product.status === 'ACTIVE' && (product.skus?.length ?? 0) > 0 && product.clinic?.status === 'ACTIVE' && product.category.isActive ? imageMetadata(product.id, product.image) : null, id: product.id, title: product.title, slug: product.slug, ...publicContentSummary(product), category: product.category, skus: [] }; }
  private cartItem(item: { id: string; quantity: number; sku: { id: string; code: string; title: string | null; currentPriceToman: bigint; currentTaxToman: bigint; product: ContentRecord & { id: string; title: string; slug: string; description: string | null; image?: ImageRecord | null; skus?: Array<{ id: string }>; status?: string; clinic?: { status: string }; category: { id: string; name: string; slug: string; isActive?: boolean } } } }) { return { id: item.id, quantity: item.quantity, sku: this.sku(item.sku), product: this.product(item.sku.product) }; }
  private wishlistItem(item: { id: string; sku: { id: string; code: string; title: string | null; currentPriceToman: bigint; currentTaxToman: bigint; product: ContentRecord & { id: string; title: string; slug: string; description: string | null; image?: ImageRecord | null; skus?: Array<{ id: string }>; status?: string; clinic?: { status: string }; category: { id: string; name: string; slug: string; isActive?: boolean } } } }) { return { id: item.id, sku: this.sku(item.sku), product: this.product(item.sku.product) }; }
}
