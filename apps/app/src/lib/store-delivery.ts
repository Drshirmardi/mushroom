type DeliveryAddress = { id: string; isDefault?: boolean };

const deliveryKey = (userId: string) => `store-delivery-address:${userId}`;
const memorySelection = new Map<string, string>();

export function readStoredDelivery(userId: string | null): string | null {
  if (!userId || typeof window === "undefined") return null;
  try { return window.localStorage.getItem(deliveryKey(userId)) ?? memorySelection.get(userId) ?? null; }
  catch { return memorySelection.get(userId) ?? null; }
}

export function storeDelivery(userId: string | null, addressId: string): void {
  if (!userId || typeof window === "undefined") return;
  memorySelection.set(userId, addressId);
  try { window.localStorage.setItem(deliveryKey(userId), addressId); } catch { /* Optional preference; private-mode storage may be unavailable. */ }
}

/** Only select addresses still returned by this patient's server-scoped list. */
export function resolveDeliveryAddress<T extends DeliveryAddress>(addresses: T[], currentId: string | null | undefined, storedId: string | null): T | undefined {
  return addresses.find(item => item.id === currentId)
    ?? addresses.find(item => item.id === storedId)
    ?? addresses.find(item => item.isDefault)
    ?? addresses[0];
}
