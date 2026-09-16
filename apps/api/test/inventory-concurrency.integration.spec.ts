import { randomUUID } from 'node:crypto';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { CommerceInventoryService } from '../src/modules/commerce/inventory/commerce-inventory.service';

describe('commerce inventory atomic reservations (PostgreSQL integration)', () => {
  let app: NestFastifyApplication; let prisma: PrismaService; let tokens: AccessTokenService; let inventoryService: CommerceInventoryService; let clinicId: string;
  const userIds = new Set<string>(); const patientIds = new Set<string>(); const categoryIds = new Set<string>(); const productIds = new Set<string>(); const skuIds = new Set<string>(); const inventoryIds = new Set<string>(); const orderIds = new Set<string>();

  beforeAll(async () => { app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); tokens = app.get(AccessTokenService); inventoryService = app.get(CommerceInventoryService); clinicId = (await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id; }, 30_000);
  afterAll(async () => { await app.close(); });
  afterEach(async () => {
    const orders = [...orderIds]; const inventories = [...inventoryIds];
    if (orders.length) {
      const reservations = await prisma.inventoryReservation.findMany({ where: { orderId: { in: orders } }, select: { id: true } });
      await prisma.inventoryLedgerEntry.deleteMany({ where: { referenceId: { in: reservations.map(({ id }) => id) } } });
      await prisma.inventoryReservation.deleteMany({ where: { orderId: { in: orders } } });
      await prisma.auditEvent.deleteMany({ where: { subjectId: { in: orders } } });
      await prisma.$executeRawUnsafe('ALTER TABLE commerce_order_snapshots DISABLE TRIGGER commerce_order_snapshots_immutable');
      await prisma.commerceOrderSnapshot.deleteMany({ where: { orderId: { in: orders } } });
      await prisma.$executeRawUnsafe('ALTER TABLE commerce_order_snapshots ENABLE TRIGGER commerce_order_snapshots_immutable');
      await prisma.commerceOrderLine.deleteMany({ where: { orderId: { in: orders } } }); await prisma.commerceOrder.deleteMany({ where: { id: { in: orders } } });
    }
    if (patientIds.size) { await prisma.commerceCartItem.deleteMany({ where: { cart: { patientId: { in: [...patientIds] } } } }); await prisma.commerceCart.deleteMany({ where: { patientId: { in: [...patientIds] } } }); }
    if (inventories.length) await prisma.inventoryLedgerEntry.deleteMany({ where: { inventoryItemId: { in: inventories } } });
    if (inventories.length) await prisma.inventoryItem.deleteMany({ where: { id: { in: inventories } } });
    if (skuIds.size) await prisma.commerceSku.deleteMany({ where: { id: { in: [...skuIds] } } }); if (productIds.size) await prisma.commerceProduct.deleteMany({ where: { id: { in: [...productIds] } } }); if (categoryIds.size) await prisma.commerceCategory.deleteMany({ where: { id: { in: [...categoryIds] } } });
    if (patientIds.size) await prisma.patientProfile.deleteMany({ where: { id: { in: [...patientIds] } } }); if (userIds.size) await prisma.user.deleteMany({ where: { id: { in: [...userIds] } } });
    userIds.clear(); patientIds.clear(); categoryIds.clear(); productIds.clear(); skuIds.clear(); inventoryIds.clear(); orderIds.clear();
  });

  const headers = (token: string, idempotencyKey?: string) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) });
  const patient = async () => { const user = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }); userIds.add(user.id); const profile = await prisma.patientProfile.create({ data: { userId: user.id, clinicId } }); patientIds.add(profile.id); return { id: profile.id, token: await tokens.issue({ userId: user.id, sessionId: randomUUID(), roles: ['PATIENT'] }) }; };
  const sku = async (onHandQuantity: number) => { const suffix = randomUUID().slice(0, 8); const category = await prisma.commerceCategory.create({ data: { clinicId, name: `inventory ${suffix}`, slug: `inventory-${suffix}` } }); categoryIds.add(category.id); const product = await prisma.commerceProduct.create({ data: { clinicId, categoryId: category.id, title: `inventory ${suffix}`, slug: `inventory-product-${suffix}`, status: 'ACTIVE' } }); productIds.add(product.id); const record = await prisma.commerceSku.create({ data: { clinicId, productId: product.id, code: `INV-${suffix}`, currentPriceToman: 10_000n, currentTaxToman: 0n, isActive: true, inventoryItem: { create: { clinicId, onHandQuantity } } }, include: { inventoryItem: true } }); skuIds.add(record.id); inventoryIds.add(record.inventoryItem!.id); return record; };
  const addToCart = async (token: string, skuId: string, quantity: number) => { const result = await app.inject({ method: 'PUT', url: '/v1/patients/me/cart', headers: headers(token), payload: { skuId, quantity } }); expect(result.statusCode).toBe(200); };
  const checkout = async (token: string, key = `inventory-${randomUUID()}`) => app.inject({ method: 'POST', url: '/v1/patients/me/orders', headers: headers(token, key), payload: { shippingMethod: 'PICKUP' } });

  it('serializes competing checkouts without overselling and preserves a failed cart', async () => {
    const record = await sku(2); const patients = await Promise.all([patient(), patient(), patient()]);
    await Promise.all(patients.map(({ token }) => addToCart(token, record.id, 1)));
    const responses = await Promise.all(patients.map(({ token }) => checkout(token)));
    const succeeded = responses.filter((response) => response.statusCode === 201); const failed = responses.filter((response) => response.statusCode === 409);
    expect(succeeded).toHaveLength(2); expect(failed).toHaveLength(1); expect(failed[0].json().code).toBe('COMMERCE_INVENTORY_INSUFFICIENT');
    for (const response of succeeded) orderIds.add(response.json().id as string);
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { skuId: record.id } }); expect(item).toMatchObject({ onHandQuantity: 2, reservedQuantity: 2 });
    const reservations = await prisma.inventoryReservation.findMany({ where: { inventoryItemId: item.id } }); expect(reservations).toHaveLength(2); expect(reservations.every((reservation) => reservation.status === 'ACTIVE')).toBe(true);
    const entries = await prisma.inventoryLedgerEntry.findMany({ where: { inventoryItemId: item.id }, orderBy: { idempotencyKey: 'asc' } }); expect(entries.map(({ entryType, quantityDelta }) => [entryType, quantityDelta])).toEqual([['RESERVATION', 1], ['RESERVATION', 1]]);
    const failedPatient = patients[responses.findIndex((response) => response.statusCode === 409)]; const cart = await prisma.commerceCart.findUniqueOrThrow({ where: { patientId: failedPatient.id }, include: { items: true } }); expect(cart.items).toHaveLength(1);
  });

  it('rolls back every reservation and ledger mutation when a multi-SKU checkout is short', async () => {
    const first = await sku(3); const second = await sku(1); const buyer = await patient();
    await addToCart(buyer.token, first.id, 1); await addToCart(buyer.token, second.id, 2);
    const response = await checkout(buyer.token); expect(response.statusCode).toBe(409); expect(response.json().code).toBe('COMMERCE_INVENTORY_INSUFFICIENT');
    for (const record of [first, second]) { const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { skuId: record.id } }); expect(item.reservedQuantity).toBe(0); expect(await prisma.inventoryReservation.count({ where: { inventoryItemId: item.id } })).toBe(0); expect(await prisma.inventoryLedgerEntry.count({ where: { inventoryItemId: item.id } })).toBe(0); }
    expect(await prisma.commerceOrder.count({ where: { patientId: buyer.id } })).toBe(0); expect((await prisma.commerceCart.findUniqueOrThrow({ where: { patientId: buyer.id }, include: { items: true } })).items).toHaveLength(2);
  });

  it('makes release and consumption idempotent with one ledger terminal entry', async () => {
    const record = await sku(4); const buyer = await patient(); await addToCart(buyer.token, record.id, 1); const first = await checkout(buyer.token); expect(first.statusCode).toBe(201); const releaseOrderId = first.json().id as string; orderIds.add(releaseOrderId);
    expect(await prisma.$transaction((tx) => inventoryService.releaseOrderReservations(tx, releaseOrderId))).toBe(1); expect(await prisma.$transaction((tx) => inventoryService.releaseOrderReservations(tx, releaseOrderId))).toBe(0);
    await addToCart(buyer.token, record.id, 2); const second = await checkout(buyer.token); expect(second.statusCode).toBe(201); const consumeOrderId = second.json().id as string; orderIds.add(consumeOrderId);
    expect(await prisma.$transaction((tx) => inventoryService.consumeOrderReservations(tx, consumeOrderId))).toBe(1); expect(await prisma.$transaction((tx) => inventoryService.consumeOrderReservations(tx, consumeOrderId))).toBe(0);
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { skuId: record.id } }); expect(item).toMatchObject({ onHandQuantity: 2, reservedQuantity: 0 });
    const entries = await prisma.inventoryLedgerEntry.findMany({ where: { inventoryItemId: item.id }, orderBy: { createdAt: 'asc' } }); expect(entries.map(({ entryType, quantityDelta }) => [entryType, quantityDelta])).toEqual([['RESERVATION', 1], ['RELEASE', -1], ['RESERVATION', 2], ['CONSUMPTION', -2]]);
  });
});
