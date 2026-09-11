import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CommerceInventoryService } from '../inventory/commerce-inventory.service';
import { CommerceDiscountService } from '../discounts/commerce-discount.service';
import type { CheckoutCommerceOrderDto, CreateCommerceAddressDto, UpdateCommerceAddressDto, UpdateCourierShippingRateDto } from './commerce-checkout.dto';

type AuditContext = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
type AddressSnapshot = { id: string; label: string; recipientName: string; phone: string; province: string; city: string; postalCode: string | null; line1: string; line2: string | null };

const profileMissing = () => new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });
const addressMissing = () => new NotFoundException({ code: 'COMMERCE_ADDRESS_NOT_FOUND', message: 'Commerce address was not found.', details: {} });
const orderMissing = () => new NotFoundException({ code: 'COMMERCE_ORDER_NOT_FOUND', message: 'Commerce order was not found.', details: {} });
const cartEmpty = () => new ConflictException({ code: 'COMMERCE_CART_EMPTY', message: 'Commerce cart is empty.', details: {} });
const unavailable = () => new ConflictException({ code: 'SHIPPING_METHOD_UNAVAILABLE', message: 'The selected shipping method is unavailable.', details: {} });
const inputInvalid = (fields: string[]) => new UnprocessableEntityException({ code: 'COMMERCE_ORDER_INPUT_INVALID', message: 'Commerce checkout input is invalid.', details: { fields } });
const keyRequired = () => new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key is required.', details: {} });
const keyReused = () => new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency-Key was already used with different checkout input.', details: {} });
const skuUnavailable = () => new ConflictException({ code: 'COMMERCE_SKU_NOT_FOUND', message: 'A cart SKU is no longer available for checkout.', details: {} });

const text = (value: string, field: string, max: number) => {
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (!normalized || normalized.length > max) throw inputInvalid([field]);
  return normalized;
};

@Injectable()
export class CommerceCheckoutService {
  constructor(private readonly prisma: PrismaService, private readonly inventory: CommerceInventoryService, private readonly discounts: CommerceDiscountService) {}

  async listAddresses(userId: string) {
    const patient = await this.patient(userId);
    const addresses = await this.prisma.commerceAddress.findMany({ where: { patientId: patient.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] });
    return addresses.map((address) => this.address(address));
  }

  async createAddress(userId: string, body: CreateCommerceAddressDto) {
    const patient = await this.patient(userId);
    return this.prisma.$transaction(async (tx) => {
      const hasAddress = await tx.commerceAddress.count({ where: { patientId: patient.id } });
      const isDefault = body.isDefault ?? hasAddress === 0;
      if (isDefault) await tx.commerceAddress.updateMany({ where: { patientId: patient.id, isDefault: true }, data: { isDefault: false } });
      const address = await tx.commerceAddress.create({ data: this.addressData(patient.id, body, isDefault) });
      return this.address(address);
    });
  }

  async updateAddress(userId: string, addressId: string, body: UpdateCommerceAddressDto) {
    if (!Object.keys(body).length) throw inputInvalid(['body']);
    const patient = await this.patient(userId);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.commerceAddress.findFirst({ where: { id: addressId, patientId: patient.id } });
      if (!current) throw addressMissing();
      if (body.isDefault === true) await tx.commerceAddress.updateMany({ where: { patientId: patient.id, isDefault: true, id: { not: addressId } }, data: { isDefault: false } });
      const address = await tx.commerceAddress.update({ where: { id: addressId }, data: {
        ...(body.label === undefined ? {} : { label: text(body.label, 'label', 100) }),
        ...(body.recipientName === undefined ? {} : { recipientName: text(body.recipientName, 'recipientName', 160) }),
        ...(body.phone === undefined ? {} : { phone: text(body.phone, 'phone', 32) }),
        ...(body.province === undefined ? {} : { province: text(body.province, 'province', 100) }),
        ...(body.city === undefined ? {} : { city: text(body.city, 'city', 100) }),
        ...(body.line1 === undefined ? {} : { line1: text(body.line1, 'line1', 500) }),
        ...(body.postalCode === undefined ? {} : { postalCode: body.postalCode === null ? null : text(body.postalCode, 'postalCode', 32) }),
        ...(body.line2 === undefined ? {} : { line2: body.line2 === null ? null : text(body.line2, 'line2', 500) }),
        ...(body.isDefault === undefined ? {} : { isDefault: body.isDefault }),
      } });
      return this.address(address);
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const patient = await this.patient(userId);
    const deleted = await this.prisma.commerceAddress.deleteMany({ where: { id: addressId, patientId: patient.id } });
    if (deleted.count !== 1) throw addressMissing();
  }

  async shippingOptions(userId: string) {
    const patient = await this.patient(userId);
    const courier = await this.prisma.commerceShippingRate.findFirst({ where: { clinicId: patient.clinicId, method: 'COURIER', isActive: true } });
    return [{ method: 'PICKUP' as const, amountToman: '0' }, ...(courier ? [{ method: 'COURIER' as const, amountToman: courier.amountToman.toString() }] : [])];
  }

  async adminCourierRate() {
    const clinic = await this.clinic();
    const rate = await this.prisma.commerceShippingRate.findUnique({ where: { clinicId_method: { clinicId: clinic.id, method: 'COURIER' } } });
    return rate ? this.courierRate(rate) : { method: 'COURIER' as const, amountToman: null, isActive: false, isConfigured: false };
  }

  async updateCourierRate(body: UpdateCourierShippingRateDto, context: AuditContext) {
    const clinic = await this.clinic();
    return this.prisma.$transaction(async (tx) => {
      const rate = await tx.commerceShippingRate.upsert({ where: { clinicId_method: { clinicId: clinic.id, method: 'COURIER' } }, create: { clinicId: clinic.id, method: 'COURIER', amountToman: BigInt(body.amountToman), isActive: body.isActive }, update: { amountToman: BigInt(body.amountToman), isActive: body.isActive } });
      await this.audit(tx, 'COMMERCE_COURIER_SHIPPING_RATE_UPDATED', 'COMMERCE_SHIPPING_RATE', rate.id, context, { amountToman: rate.amountToman.toString(), isActive: rate.isActive });
      return this.courierRate(rate);
    });
  }

  async checkout(userId: string, idempotencyKey: string | undefined, body: CheckoutCommerceOrderDto, context: AuditContext) {
    const key = this.idempotencyKey(idempotencyKey);
    const discountCode = body.discountCode === undefined ? undefined : this.discounts.canonicalCode(body.discountCode);
    const checkout = { ...body, ...(discountCode === undefined ? {} : { discountCode }) };
    const patient = await this.patient(userId);
    const existing = await this.prisma.commerceOrder.findFirst({ where: { patientId: patient.id, idempotencyKey: key }, include: this.orderInclude });
    if (existing) return this.existingOrder(existing, checkout);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const concurrent = await tx.commerceOrder.findFirst({ where: { patientId: patient.id, idempotencyKey: key }, include: this.orderInclude });
        if (concurrent) return this.existingOrder(concurrent, checkout);
        if (checkout.shippingMethod === 'PICKUP' && checkout.addressId) throw inputInvalid(['addressId']);
        if (checkout.shippingMethod === 'COURIER' && !checkout.addressId) throw inputInvalid(['addressId']);
        const cart = await tx.commerceCart.findUnique({ where: { patientId: patient.id }, include: this.cartInclude });
        if (!cart?.items.length) throw cartEmpty();
        const invalidSku = cart.items.some((item) => !item.sku.isActive || item.sku.product.status !== 'ACTIVE' || !item.sku.product.category.isActive);
        if (invalidSku) throw skuUnavailable();
        const shipping = await this.shipping(tx, patient, checkout);
        const lines = cart.items.map((item, position) => {
          const price = item.sku.currentPriceToman * BigInt(item.quantity);
          const tax = item.sku.currentTaxToman * BigInt(item.quantity);
          return { position: position + 1, skuId: item.skuId, skuCodeSnapshot: item.sku.code, productTitleSnapshot: item.sku.product.title, quantity: item.quantity, unitPriceToman: item.sku.currentPriceToman, unitTaxToman: item.sku.currentTaxToman, discountAmountToman: 0n, lineTotalToman: price + tax };
        });
        const subtotal = lines.reduce((sum, line) => sum + line.unitPriceToman * BigInt(line.quantity), 0n);
        const tax = lines.reduce((sum, line) => sum + line.unitTaxToman * BigInt(line.quantity), 0n);
        const preparedDiscount = await this.discounts.prepareCheckout(tx, { clinicId: patient.clinicId, patientId: patient.id, discountCode, subtotalAmountToman: subtotal });
        const discountAmountToman = preparedDiscount?.amountToman ?? 0n;
        const discountedLines = this.applyDiscount(lines, subtotal, discountAmountToman);
        const total = subtotal + tax - discountAmountToman + shipping.amountToman;
        const payload = { version: 1, lines: discountedLines.map((line) => ({ skuId: line.skuId, skuCode: line.skuCodeSnapshot, productTitle: line.productTitleSnapshot, quantity: line.quantity, unitPriceToman: line.unitPriceToman.toString(), unitTaxToman: line.unitTaxToman.toString(), discountAmountToman: line.discountAmountToman.toString(), lineTotalToman: line.lineTotalToman.toString() })), discount: { code: preparedDiscount?.code ?? null, amountToman: discountAmountToman.toString() }, shipping: { method: checkout.shippingMethod, amountToman: shipping.amountToman.toString(), address: shipping.address }, totals: { subtotalAmountToman: subtotal.toString(), taxAmountToman: tax.toString(), discountAmountToman: discountAmountToman.toString(), shippingAmountToman: shipping.amountToman.toString(), totalAmountToman: total.toString() } };
        const order = await tx.commerceOrder.create({ data: { clinicId: patient.clinicId, patientId: patient.id, idempotencyKey: key, shippingMethod: checkout.shippingMethod, shippingAddressSnapshot: shipping.address === null ? Prisma.DbNull : shipping.address as Prisma.InputJsonValue, shippingDetailSnapshot: { sourceAddressId: shipping.address?.id ?? null, shippingRateId: shipping.rateId, method: checkout.shippingMethod, discountCode: preparedDiscount?.code ?? null }, subtotalAmountToman: subtotal, taxAmountToman: tax, discountAmountToman, shippingAmountToman: shipping.amountToman, totalAmountToman: total, lines: { create: discountedLines }, snapshot: { create: { subtotalAmountToman: subtotal, taxAmountToman: tax, discountAmountToman, shippingAmountToman: shipping.amountToman, totalAmountToman: total, payload: payload as Prisma.InputJsonValue, integrityHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex') } }, }, include: this.orderInclude });
        const reservations = await this.inventory.reserveCheckout(tx, { clinicId: patient.clinicId, orderId: order.id, lines: discountedLines.map((line) => ({ skuId: line.skuId!, quantity: line.quantity })) });
        await this.discounts.reserveCheckout(tx, { prepared: preparedDiscount, patientId: patient.id, orderId: order.id, expiresAt: reservations[0]?.expiresAt ?? null });
        await tx.commerceCartItem.deleteMany({ where: { cartId: cart.id } });
        await this.audit(tx, 'COMMERCE_ORDER_CHECKED_OUT', 'COMMERCE_ORDER', order.id, context, { shippingMethod: checkout.shippingMethod, discountCode: preparedDiscount?.code ?? null, totalAmountToman: order.totalAmountToman.toString(), lineCount: order.lines.length });
        return this.order(order);
      });
    } catch (error) {
      if (!this.unique(error)) throw error;
      const concurrent = await this.prisma.commerceOrder.findFirst({ where: { patientId: patient.id, idempotencyKey: key }, include: this.orderInclude });
      if (!concurrent) throw error;
      return this.existingOrder(concurrent, checkout);
    }
  }

  async listOrders(userId: string) {
    const patient = await this.patient(userId);
    const orders = await this.prisma.commerceOrder.findMany({ where: { patientId: patient.id }, include: this.orderInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return orders.map((order) => this.order(order));
  }

  async getOrder(userId: string, orderId: string) {
    const patient = await this.patient(userId);
    const order = await this.prisma.commerceOrder.findFirst({ where: { id: orderId, patientId: patient.id }, include: this.orderInclude });
    if (!order) throw orderMissing();
    return this.order(order);
  }

  private readonly cartInclude = { items: { include: { sku: { include: { product: { include: { category: true } } } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } satisfies Prisma.CommerceCartInclude;
  private readonly orderInclude = { lines: { orderBy: { position: 'asc' } } } satisfies Prisma.CommerceOrderInclude;
  private async patient(userId: string) { const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } }); if (!patient) throw profileMissing(); return patient; }
  private async clinic() { const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The active clinic was not found.', details: {} }); return clinic; }
  private addressData(patientId: string, body: CreateCommerceAddressDto, isDefault: boolean) { return { patientId, label: text(body.label, 'label', 100), recipientName: text(body.recipientName, 'recipientName', 160), phone: text(body.phone, 'phone', 32), province: text(body.province, 'province', 100), city: text(body.city, 'city', 100), postalCode: body.postalCode === undefined ? null : text(body.postalCode, 'postalCode', 32), line1: text(body.line1, 'line1', 500), line2: body.line2 === undefined ? null : text(body.line2, 'line2', 500), isDefault }; }
  private address(address: { id: string; label: string; recipientName: string; phone: string; province: string; city: string; postalCode: string | null; line1: string; line2: string | null; isDefault: boolean }) { return { id: address.id, label: address.label, recipientName: address.recipientName, phone: address.phone, province: address.province, city: address.city, postalCode: address.postalCode, line1: address.line1, line2: address.line2, isDefault: address.isDefault }; }
  private courierRate(rate: { amountToman: bigint; isActive: boolean }) { return { method: 'COURIER' as const, amountToman: rate.amountToman.toString(), isActive: rate.isActive, isConfigured: true }; }
  private async shipping(tx: Prisma.TransactionClient, patient: { id: string; clinicId: string }, body: CheckoutCommerceOrderDto): Promise<{ amountToman: bigint; rateId: string | null; address: AddressSnapshot | null }> { if (body.shippingMethod === 'PICKUP') return { amountToman: 0n, rateId: null, address: null }; const [rate, address] = await Promise.all([tx.commerceShippingRate.findFirst({ where: { clinicId: patient.clinicId, method: 'COURIER', isActive: true } }), tx.commerceAddress.findFirst({ where: { id: body.addressId, patientId: patient.id } })]); if (!rate) throw unavailable(); if (!address) throw addressMissing(); return { amountToman: rate.amountToman, rateId: rate.id, address: this.address(address) }; }
  private idempotencyKey(value: string | undefined) { const key = value?.trim(); if (!key || key.length > 240 || !/^[\x21-\x7e]+$/u.test(key)) throw keyRequired(); return key; }
  private existingOrder(order: { shippingMethod: string; shippingDetailSnapshot: Prisma.JsonValue; lines: Array<unknown> }, body: CheckoutCommerceOrderDto) { const detail = order.shippingDetailSnapshot && typeof order.shippingDetailSnapshot === 'object' && !Array.isArray(order.shippingDetailSnapshot) ? order.shippingDetailSnapshot as Record<string, unknown> : {}; if (order.shippingMethod !== body.shippingMethod || (detail.sourceAddressId ?? null) !== (body.addressId ?? null) || (detail.discountCode ?? null) !== (body.discountCode ?? null)) throw keyReused(); return this.order(order as never); }
  private applyDiscount<T extends { quantity: number; unitPriceToman: bigint; unitTaxToman: bigint }>(lines: T[], subtotal: bigint, discountAmountToman: bigint) { let allocated = 0n; return lines.map((line, index) => { const base = line.unitPriceToman * BigInt(line.quantity); const discount = index === lines.length - 1 ? discountAmountToman - allocated : base * discountAmountToman / subtotal; allocated += discount; return { ...line, discountAmountToman: discount, lineTotalToman: base + line.unitTaxToman * BigInt(line.quantity) - discount }; }); }
  private order(order: { id: string; orderNumber: bigint; status: string; shippingMethod: 'PICKUP' | 'COURIER'; shippingAddressSnapshot: Prisma.JsonValue | null; subtotalAmountToman: bigint; taxAmountToman: bigint; discountAmountToman: bigint; shippingAmountToman: bigint; totalAmountToman: bigint; createdAt: Date; lines: Array<{ skuCodeSnapshot: string; productTitleSnapshot: string; quantity: number; unitPriceToman: bigint; unitTaxToman: bigint; discountAmountToman: bigint; lineTotalToman: bigint }> }) { return { id: order.id, orderNumber: order.orderNumber.toString(), status: order.status, shippingMethod: order.shippingMethod, shippingAddress: order.shippingAddressSnapshot as AddressSnapshot | null, subtotalAmountToman: order.subtotalAmountToman.toString(), taxAmountToman: order.taxAmountToman.toString(), discountAmountToman: order.discountAmountToman.toString(), shippingAmountToman: order.shippingAmountToman.toString(), totalAmountToman: order.totalAmountToman.toString(), lines: order.lines.map((line) => ({ skuCode: line.skuCodeSnapshot, productTitle: line.productTitleSnapshot, quantity: line.quantity, unitPriceToman: line.unitPriceToman.toString(), unitTaxToman: line.unitTaxToman.toString(), discountAmountToman: line.discountAmountToman.toString(), lineTotalToman: line.lineTotalToman.toString() })), createdAt: order.createdAt.toISOString() }; }
  private unique(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'; }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectType: string, subjectId: string, context: AuditContext, metadata: Record<string, unknown>) { const actor = await tx.user.findUnique({ where: { id: context.actorUserId }, select: { id: true } }); const session = actor ? await tx.session.findFirst({ where: { id: context.actorSessionId, userId: actor.id }, select: { id: true } }) : null; await tx.auditEvent.create({ data: { action, actorUserId: actor?.id ?? null, actorSessionId: session?.id ?? null, subjectType, subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: metadata as Prisma.InputJsonValue } }); }
}
