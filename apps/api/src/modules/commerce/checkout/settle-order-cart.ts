import type { Prisma } from '../../../generated/prisma/client';

/** Remove only unchanged checkout entries; later additions and edits belong to the next purchase. */
export async function settleOrderCart(tx: Prisma.TransactionClient, orderId: string) {
  const snapshot = await tx.commerceOrderSnapshot.findUnique({ where: { orderId }, include: { order: { select: { patientId: true } } } });
  const payload = snapshot?.payload;
  if (!snapshot || !payload || typeof payload !== 'object' || Array.isArray(payload) || !Array.isArray(payload.cartEntries)) return;
  for (const entry of payload.cartEntries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.id !== 'string' || typeof entry.quantity !== 'number' || typeof entry.updatedAt !== 'string') continue;
    const updatedAt = new Date(entry.updatedAt);
    if (!Number.isFinite(updatedAt.getTime())) continue;
    await tx.commerceCartItem.deleteMany({ where: { id: entry.id, quantity: entry.quantity, updatedAt, cart: { patientId: snapshot.order.patientId } } });
  }
}
