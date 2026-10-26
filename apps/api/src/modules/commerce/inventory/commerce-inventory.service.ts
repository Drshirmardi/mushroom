import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryReservationStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CommerceClock } from './commerce-clock';
import { CommerceDiscountService } from '../discounts/commerce-discount.service';

type Transaction = Prisma.TransactionClient;
type ReservationRow = { id: string; inventory_item_id: string; order_id: string; quantity: number; clinic_id: string };
type InventoryRow = { id: string; clinic_id: string; sku_id: string; on_hand_quantity: number; reserved_quantity: number; updated_at: Date };

const DEFAULT_RESERVATION_TTL_MINUTES = 20;
const insufficient = () => new ConflictException({ code: 'COMMERCE_INVENTORY_INSUFFICIENT', message: 'One or more cart items are no longer available.', details: {} });
const inventoryInvalid = () => new ConflictException({ code: 'COMMERCE_INVENTORY_INVALID', message: 'On-hand inventory cannot be below reserved inventory.', details: {} });
const reservationInvalid = () => new ConflictException({ code: 'COMMERCE_RESERVATION_STATE_INVALID', message: 'The inventory reservation is not in a valid state for this operation.', details: {} });
const inventoryMissing = () => new NotFoundException({ code: 'COMMERCE_INVENTORY_NOT_FOUND', message: 'Commerce inventory was not found.', details: {} });

@Injectable()
export class CommerceInventoryService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly clock: CommerceClock, private readonly discounts: CommerceDiscountService) {}

  reservationTtlMs(): number {
    const minutes = this.config.get<number>('COMMERCE_RESERVATION_TTL_MINUTES', DEFAULT_RESERVATION_TTL_MINUTES);
    return minutes * 60_000;
  }

  async reserveCheckout(tx: Transaction, input: { clinicId: string; orderId: string; lines: Array<{ skuId: string; quantity: number }> }) {
    const existing = await tx.inventoryReservation.findMany({ where: { orderId: input.orderId }, select: { id: true, expiresAt: true } });
    if (existing.length) return existing;
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + this.reservationTtlMs());
    const quantities = new Map<string, number>();
    for (const line of input.lines) quantities.set(line.skuId, (quantities.get(line.skuId) ?? 0) + line.quantity);
    const reservations: Array<{ id: string; expiresAt: Date | null }> = [];
    for (const [skuId, quantity] of [...quantities.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      const rows = await tx.$queryRaw<InventoryRow[]>(Prisma.sql`
        UPDATE inventory_items
        SET reserved_quantity = reserved_quantity + ${quantity}, updated_at = ${now}
        WHERE clinic_id = ${input.clinicId}::uuid
          AND sku_id = ${skuId}::uuid
          AND on_hand_quantity - reserved_quantity >= ${quantity}
        RETURNING id, clinic_id, sku_id, on_hand_quantity, reserved_quantity, updated_at
      `);
      const item = rows[0];
      if (!item) throw insufficient();
      const reservation = await tx.inventoryReservation.create({ data: { inventoryItemId: item.id, orderId: input.orderId, quantity, expiresAt } });
      await this.ledger(tx, { clinicId: item.clinic_id, inventoryItemId: item.id, entryType: 'RESERVATION', quantityDelta: quantity, referenceType: 'INVENTORY_RESERVATION', referenceId: reservation.id, idempotencyKey: `inventory:reservation:${reservation.id}` });
      reservations.push({ id: reservation.id, expiresAt: reservation.expiresAt });
    }
    return reservations;
  }

  async releaseOrderReservations(tx: Transaction, orderId: string) {
    const rows = await this.lockOrderReservations(tx, orderId);
    let released = 0;
    for (const row of rows) if (await this.releaseLocked(tx, row, InventoryReservationStatus.RELEASED)) released += 1;
    if (released) await this.discounts.releaseOrderReservation(tx, orderId);
    return released;
  }

  async consumeOrderReservations(tx: Transaction, orderId: string) {
    const rows = await this.lockOrderReservations(tx, orderId);
    if (!rows.length || rows.every((row) => row.status === 'CONSUMED')) return 0;
    if (rows.some((row) => row.status !== 'ACTIVE')) throw reservationInvalid();
    let consumed = 0;
    for (const row of rows) {
      const inventory = await tx.$queryRaw<InventoryRow[]>(Prisma.sql`
        UPDATE inventory_items
        SET on_hand_quantity = on_hand_quantity - ${row.quantity}, reserved_quantity = reserved_quantity - ${row.quantity}, updated_at = ${this.clock.now()}
        WHERE id = ${row.inventory_item_id}::uuid AND reserved_quantity >= ${row.quantity} AND on_hand_quantity >= ${row.quantity}
        RETURNING id, clinic_id, sku_id, on_hand_quantity, reserved_quantity, updated_at
      `);
      const item = inventory[0];
      if (!item) throw reservationInvalid();
      await tx.inventoryReservation.update({ where: { id: row.id }, data: { status: InventoryReservationStatus.CONSUMED } });
      await this.ledger(tx, { clinicId: item.clinic_id, inventoryItemId: item.id, entryType: 'CONSUMPTION', quantityDelta: -row.quantity, referenceType: 'INVENTORY_RESERVATION', referenceId: row.id, idempotencyKey: `inventory:consumption:${row.id}` });
      consumed += 1;
    }
    if (consumed) await this.discounts.consumeOrderReservation(tx, orderId);
    return consumed;
  }

  async expireDue(limit = 25) {
    const now = this.clock.now();
    return this.transaction(async (tx) => {
      const rows = await tx.$queryRaw<ReservationRow[]>(Prisma.sql`
        SELECT r.id, r.inventory_item_id, r.order_id, r.quantity, i.clinic_id
        FROM inventory_reservations r
        JOIN inventory_items i ON i.id = r.inventory_item_id
        JOIN commerce_orders o ON o.id = r.order_id
        WHERE r.status = 'ACTIVE' AND r.expires_at <= ${now}
        ORDER BY r.expires_at ASC, r.id ASC
        FOR UPDATE OF r, o SKIP LOCKED
        LIMIT ${limit}
      `);
      let expired = 0;
      let cancelled = 0;
      for (const row of rows) {
        if (await this.hasAmbiguousPayment(tx, row.order_id)) continue;
        if (await this.releaseLocked(tx, row, InventoryReservationStatus.EXPIRED)) {
          expired += 1;
          const active = await tx.inventoryReservation.count({ where: { orderId: row.order_id, status: InventoryReservationStatus.ACTIVE } });
          if (!active) await this.discounts.expireOrderReservation(tx, row.order_id);
          if (await this.cancelExpiredPendingOrder(tx, row.order_id, now)) cancelled += 1;
        }
      }
      return { expired, cancelled };
    });
  }

  async setAdminOnHand(tx: Transaction, input: { clinicId: string; skuId: string; onHandQuantity: number }) {
    const rows = await tx.$queryRaw<InventoryRow[]>(Prisma.sql`
      SELECT id, clinic_id, sku_id, on_hand_quantity, reserved_quantity, updated_at
      FROM inventory_items
      WHERE clinic_id = ${input.clinicId}::uuid AND sku_id = ${input.skuId}::uuid
      FOR UPDATE
    `);
    const item = rows[0];
    if (!item) throw inventoryMissing();
    if (input.onHandQuantity < item.reserved_quantity) throw inventoryInvalid();
    const delta = input.onHandQuantity - item.on_hand_quantity;
    if (delta === 0) return { inventoryItemId: item.id, skuId: item.sku_id, onHandQuantity: item.on_hand_quantity, reservedQuantity: item.reserved_quantity };
    const now = this.clock.now();
    await tx.inventoryItem.update({ where: { id: item.id }, data: { onHandQuantity: input.onHandQuantity } });
    await this.ledger(tx, { clinicId: item.clinic_id, inventoryItemId: item.id, entryType: 'ADJUSTMENT', quantityDelta: delta, referenceType: 'INVENTORY_ITEM', referenceId: item.id, idempotencyKey: `inventory:adjustment:${item.id}:${item.updated_at.toISOString()}:${input.onHandQuantity}` });
    return { inventoryItemId: item.id, skuId: item.sku_id, onHandQuantity: input.onHandQuantity, reservedQuantity: item.reserved_quantity, updatedAt: now };
  }

  async recordInitialReceipt(tx: Transaction, input: { clinicId: string; inventoryItemId: string; skuId: string; quantity: number }) {
    if (input.quantity <= 0) return;
    await this.ledger(tx, { clinicId: input.clinicId, inventoryItemId: input.inventoryItemId, entryType: 'RECEIPT', quantityDelta: input.quantity, referenceType: 'COMMERCE_SKU', referenceId: input.skuId, idempotencyKey: `inventory:receipt:${input.skuId}` });
  }

  private async releaseLocked(tx: Transaction, row: ReservationRow & { status?: string }, status: InventoryReservationStatus) {
    if (row.status && row.status !== 'ACTIVE') return false;
    const inventory = await tx.$queryRaw<InventoryRow[]>(Prisma.sql`
      UPDATE inventory_items
      SET reserved_quantity = reserved_quantity - ${row.quantity}, updated_at = ${this.clock.now()}
      WHERE id = ${row.inventory_item_id}::uuid AND reserved_quantity >= ${row.quantity}
      RETURNING id, clinic_id, sku_id, on_hand_quantity, reserved_quantity, updated_at
    `);
    const item = inventory[0];
    if (!item) throw reservationInvalid();
    await tx.inventoryReservation.update({ where: { id: row.id }, data: { status } });
    await this.ledger(tx, { clinicId: item.clinic_id, inventoryItemId: item.id, entryType: 'RELEASE', quantityDelta: -row.quantity, referenceType: 'INVENTORY_RESERVATION', referenceId: row.id, idempotencyKey: `inventory:release:${row.id}` });
    return true;
  }

  private async lockOrderReservations(tx: Transaction, orderId: string) {
    return tx.$queryRaw<Array<ReservationRow & { status: string }>>(Prisma.sql`
      SELECT r.id, r.inventory_item_id, r.order_id, r.quantity, r.status, i.clinic_id
      FROM inventory_reservations r JOIN inventory_items i ON i.id = r.inventory_item_id
      WHERE r.order_id = ${orderId}::uuid
      ORDER BY r.inventory_item_id ASC
      FOR UPDATE OF r
    `);
  }

  private async hasAmbiguousPayment(tx: Transaction, orderId: string) {
    return (await tx.paymentAttempt.count({ where: { orderId, status: { in: ['VERIFYING', 'REQUIRES_RECONCILIATION'] } } })) > 0 || (await tx.billingGatewayAttempt.count({ where: { intent: { orderId }, status: { in: ['CREATED', 'REDIRECT_READY', 'VERIFYING', 'REQUIRES_RECONCILIATION'] } } })) > 0;
  }

  private async cancelExpiredPendingOrder(tx: Transaction, orderId: string, now: Date) {
    const order = await tx.commerceOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
    if (!order || order.status !== 'PENDING_PAYMENT') return false;
    const [activeReservations, blockingAttempts] = await Promise.all([
      tx.inventoryReservation.count({ where: { orderId, status: InventoryReservationStatus.ACTIVE } }),
      tx.paymentAttempt.count({ where: { orderId, status: { in: ['CREATED', 'REDIRECT_READY', 'CALLBACK_RECEIVED', 'VERIFYING', 'REQUIRES_RECONCILIATION'] } } }),
    ]);
    if (activeReservations || blockingAttempts || await tx.billingGatewayAttempt.count({ where: { intent: { orderId }, status: { in: ['CREATED', 'REDIRECT_READY', 'VERIFYING', 'REQUIRES_RECONCILIATION'] } } })) return false;
    const updated = await tx.commerceOrder.updateMany({ where: { id: order.id, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED' } });
    if (updated.count !== 1) return false;
    await tx.auditEvent.create({ data: { action: 'COMMERCE_ORDER_CANCELLED_BY_RESERVATION_EXPIRY', actorUserId: null, actorSessionId: null, subjectType: 'COMMERCE_ORDER', subjectId: order.id, requestId: 'system:inventory-reservation-expiry', ipAddress: null, metadata: { expiredAt: now.toISOString() } } });
    return true;
  }

  private async ledger(tx: Transaction, input: { clinicId: string; inventoryItemId: string; entryType: 'RECEIPT' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE' | 'CONSUMPTION'; quantityDelta: number; referenceType: string; referenceId: string; idempotencyKey: string }) {
    await tx.inventoryLedgerEntry.upsert({ where: { idempotencyKey: input.idempotencyKey }, create: input, update: {} });
  }

  private async transaction<T>(callback: (tx: Transaction) => Promise<T>) {
    return this.prisma.$transaction(callback);
  }
}
