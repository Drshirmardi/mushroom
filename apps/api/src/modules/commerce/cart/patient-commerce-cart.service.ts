import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { UpdatePatientCartDto, UpdatePatientWishlistDto } from './patient-commerce-cart.dto';

const profileMissing = () => new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });
const skuMissing = () => new NotFoundException({ code: 'COMMERCE_SKU_NOT_FOUND', message: 'An active commerce SKU was not found.', details: {} });

@Injectable()
export class PatientCommerceCartService {
  constructor(private readonly prisma: PrismaService) {}
  async cart(userId: string) { const patient = await this.patient(userId); const cart = await this.prisma.commerceCart.findUnique({ where: { patientId: patient.id }, include: this.cartInclude }); return { items: cart?.items.map((item) => this.cartItem(item)) ?? [] }; }
  async updateCart(userId: string, body: UpdatePatientCartDto) {
    const patient = await this.patient(userId);
    await this.prisma.$transaction(async (tx) => {
      const sku = await this.activeSku(tx, patient.clinicId, body.skuId);
      const cart = await tx.commerceCart.upsert({ where: { patientId: patient.id }, create: { clinicId: patient.clinicId, patientId: patient.id }, update: {} });
      if (body.quantity === 0) await tx.commerceCartItem.deleteMany({ where: { cartId: cart.id, skuId: sku.id } });
      else await tx.commerceCartItem.upsert({ where: { cartId_skuId: { cartId: cart.id, skuId: sku.id } }, create: { cartId: cart.id, skuId: sku.id, quantity: body.quantity }, update: { quantity: body.quantity } });
    });
    return this.cart(userId);
  }
  async wishlist(userId: string) { const patient = await this.patient(userId); const items = await this.prisma.wishlistItem.findMany({ where: { patientId: patient.id }, include: this.wishlistInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }); return { items: items.map((item) => this.wishlistItem(item)) }; }
  async updateWishlist(userId: string, body: UpdatePatientWishlistDto) {
    const patient = await this.patient(userId);
    await this.prisma.$transaction(async (tx) => {
      const sku = await this.activeSku(tx, patient.clinicId, body.skuId);
      if (body.saved) await tx.wishlistItem.upsert({ where: { patientId_skuId: { patientId: patient.id, skuId: sku.id } }, create: { patientId: patient.id, skuId: sku.id }, update: {} });
      else await tx.wishlistItem.deleteMany({ where: { patientId: patient.id, skuId: sku.id } });
    });
    return this.wishlist(userId);
  }
  private readonly skuInclude = { product: { include: { category: true } } } satisfies Prisma.CommerceSkuInclude;
  private readonly cartInclude = { items: { include: { sku: { include: this.skuInclude } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } satisfies Prisma.CommerceCartInclude;
  private readonly wishlistInclude = { sku: { include: this.skuInclude } } satisfies Prisma.WishlistItemInclude;
  private async patient(userId: string) { const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } }); if (!patient) throw profileMissing(); return patient; }
  private async activeSku(tx: Prisma.TransactionClient, clinicId: string, id: string) { const sku = await tx.commerceSku.findFirst({ where: { id, clinicId, isActive: true, product: { status: 'ACTIVE', category: { isActive: true } } }, select: { id: true } }); if (!sku) throw skuMissing(); return sku; }
  private sku(sku: { id: string; code: string; title: string | null; currentPriceToman: bigint; currentTaxToman: bigint }) { return { id: sku.id, code: sku.code, title: sku.title, currentPriceToman: sku.currentPriceToman.toString(), currentTaxToman: sku.currentTaxToman.toString() }; }
  private product(product: { id: string; title: string; slug: string; description: string | null; category: { id: string; name: string; slug: string } }) { return { id: product.id, title: product.title, slug: product.slug, description: product.description, category: product.category, skus: [] }; }
  private cartItem(item: { id: string; quantity: number; sku: { id: string; code: string; title: string | null; currentPriceToman: bigint; currentTaxToman: bigint; product: { id: string; title: string; slug: string; description: string | null; category: { id: string; name: string; slug: string } } } }) { return { id: item.id, quantity: item.quantity, sku: this.sku(item.sku), product: this.product(item.sku.product) }; }
  private wishlistItem(item: { id: string; sku: { id: string; code: string; title: string | null; currentPriceToman: bigint; currentTaxToman: bigint; product: { id: string; title: string; slug: string; description: string | null; category: { id: string; name: string; slug: string } } } }) { return { id: item.id, sku: this.sku(item.sku), product: this.product(item.sku.product) }; }
}
