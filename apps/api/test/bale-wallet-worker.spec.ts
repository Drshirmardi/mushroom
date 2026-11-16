import { describe, expect, it, vi } from 'vitest';
import { BillingWorker } from '../src/modules/billing/billing.worker';

describe('Independent payment maintenance', () => {
  it('still reconciles Bale payments when Sadad maintenance fails', async () => {
    const expire = vi.fn().mockResolvedValue(0);
    const sadadMaintain = vi.fn().mockRejectedValue(new Error('Sadad temporarily unavailable'));
    const baleMaintain = vi.fn().mockResolvedValue(1);
    const worker = new BillingWorker(
      { expire } as never, { maintain: sadadMaintain } as never, { maintain: baleMaintain } as never,
    );
    await worker.tick();
    expect(expire).toHaveBeenCalledOnce();
    expect(sadadMaintain).toHaveBeenCalledOnce();
    expect(baleMaintain).toHaveBeenCalledOnce();
  });

  it('continues both providers when billing expiration fails', async () => {
    const expire = vi.fn().mockRejectedValue(new Error('Expiration temporarily unavailable'));
    const sadadMaintain = vi.fn().mockResolvedValue(0);
    const baleMaintain = vi.fn().mockResolvedValue(1);
    const worker = new BillingWorker(
      { expire } as never, { maintain: sadadMaintain } as never, { maintain: baleMaintain } as never,
    );
    await worker.tick();
    expect(sadadMaintain).toHaveBeenCalledOnce();
    expect(baleMaintain).toHaveBeenCalledOnce();
  });
});
