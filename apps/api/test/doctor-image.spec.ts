import { describe, expect, it, vi } from 'vitest';
import { DoctorImageService } from '../src/modules/directory/doctor-image.service';
import { DoctorImageCleanupHandler } from '../src/modules/outbox/doctor-image-cleanup.handler';
import type { PrismaService } from '../src/database/prisma/prisma.service';
import type { ProductImageStorage } from '../src/modules/commerce/media/product-image-storage';
import type { ProductImageProcessor } from '../src/modules/commerce/media/product-image-processor';
import type { OutboxService } from '../src/modules/outbox/outbox.service';
import type { PatientDirectoryService } from '../src/modules/directory/patient-directory.service';
import type { AuthenticatedRequest } from '../src/common/auth/access-token.guard';

const id = '11111111-1111-4111-8111-111111111111';
const clinicId = '22222222-2222-4222-8222-222222222222';
const key = `doctors/${clinicId}/${id}/33333333-3333-4333-8333-333333333333.webp`;
const doctor = { id, clinicId, updatedAt: new Date(), profileImageObjectKey: key };
const bytes = Buffer.from('image');

function fixture() {
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const read = vi.fn().mockResolvedValue(bytes);
  const put = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn().mockResolvedValue(undefined);
  const visibleDoctor = vi.fn().mockResolvedValue(doctor);
  const enqueue = vi.fn().mockResolvedValue(undefined);
  const findFirst = vi.fn().mockResolvedValue(doctor);
  const db = { doctorProfile: { findFirst, updateMany }, clinic: { findFirst: vi.fn().mockResolvedValue({ id: clinicId }) }, auditEvent: { create: vi.fn() } };
  const prisma = { ...db, $transaction: (run: (tx: typeof db) => Promise<unknown>) => run(db) } as unknown as PrismaService;
  const storage = { isEnabled: () => true, put, read, delete: remove } as unknown as ProductImageStorage;
  const processor = { process: vi.fn().mockResolvedValue({ bytes }) } as unknown as ProductImageProcessor;
  const images = new DoctorImageService(prisma, processor, storage, { enqueue } as unknown as OutboxService, { visibleDoctor } as unknown as PatientDirectoryService);
  return { images, prisma, storage, findFirst, updateMany, read, put, remove, visibleDoctor, enqueue };
}

const request = {
  auth: { userId: id, sessionId: id }, id, ip: '127.0.0.1', raw: { destroy: vi.fn() },
  isMultipart: () => true,
  async *parts() {
    yield { type: 'file', fieldname: 'file', toBuffer: async () => bytes, file: { truncated: false }, filename: 'portrait.jpg', mimetype: 'image/jpeg' };
  },
} as unknown as AuthenticatedRequest;

describe('doctor profile photo', () => {
  it('stores the processed image before replacing the photo and queues the old image for cleanup', async () => {
    const f = fixture();
    await f.images.upload(id, request);
    const newKey = f.put.mock.calls[0][0];
    expect(newKey).not.toBe(key);
    expect(f.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { profileImageObjectKey: newKey } }));
    expect(f.enqueue).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ payload: { key } }));
  });

  it('keeps the current photo if uploading to storage fails', async () => {
    const f = fixture();
    f.put.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(f.images.upload(id, request)).rejects.toThrow('storage unavailable');
    expect(f.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a non-multipart request and clears both managed and legacy URLs when removing', async () => {
    const f = fixture();
    await expect(f.images.upload(id, { ...request, isMultipart: () => false } as AuthenticatedRequest)).rejects.toThrow();
    expect(f.put).not.toHaveBeenCalled();
    await f.images.remove(id, request);
    expect(f.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { profileImageObjectKey: null, profileImageUrl: null } }));
  });

  it('does not read a photo for a patient whose directory cannot see this doctor', async () => {
    const f = fixture();
    f.visibleDoctor.mockRejectedValueOnce(new Error('not visible'));
    await expect(f.images.patientImage(id, 'outside-clinic')).rejects.toThrow('not visible');
    expect(f.read).not.toHaveBeenCalled();
  });

  it('only deletes a retired file once the profile no longer references it', async () => {
    const f = fixture();
    const handler = new DoctorImageCleanupHandler(f.prisma, f.storage);
    await handler.handle({ key });
    expect(f.remove).not.toHaveBeenCalled();
    f.findFirst.mockResolvedValueOnce(null);
    await handler.handle({ key });
    expect(f.remove).toHaveBeenCalledWith(key);
  });
});
