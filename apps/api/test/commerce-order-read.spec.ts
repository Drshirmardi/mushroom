import { describe, expect, it, vi } from 'vitest';
import { CommerceOrderOperationsService } from '../src/modules/commerce/orders/commerce-order-operations.service';

describe('scoped order management reads', () => {
  it('searches on the server, normalizes local digits and bounds the returned page', async () => {
    const count = vi.fn().mockResolvedValue(45); const findMany = vi.fn().mockResolvedValue([]);
    const service = new CommerceOrderOperationsService({ clinic: { findFirst: async () => ({ id: 'active-clinic' }) }, commerceOrder: { count, findMany }, $transaction: (queries: Promise<unknown>[]) => Promise.all(queries) } as never, {} as never, {} as never);
    expect(await service.search({ page: 3, pageSize: 20, query: '۱۲۳', status: 'PAID', shippingMethod: 'COURIER' })).toEqual({ items: [], total: 45, page: 3, pageSize: 20 });
    const args = findMany.mock.calls[0]![0];
    expect(args).toMatchObject({ skip: 40, take: 20, where: { clinicId: 'active-clinic', status: 'PAID', shippingMethod: 'COURIER' } });
    expect(args.where.OR).toContainEqual({ orderNumber: 123n });
    expect(count).toHaveBeenCalledWith({ where: args.where });
  });
  it('does not retrieve an order outside the active clinic by id', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new CommerceOrderOperationsService({ clinic: { findFirst: async () => ({ id: 'active-clinic' }) }, commerceOrder: { findFirst } } as never, {} as never, {} as never);
    await expect(service.detail('foreign-order')).rejects.toMatchObject({ response: { code: 'COMMERCE_ORDER_NOT_FOUND' } });
    expect(findFirst.mock.calls[0]![0].where).toEqual({ id: 'foreign-order', clinicId: 'active-clinic' });
  });
});
