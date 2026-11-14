import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { AuthenticatedRequest } from '../../common/auth/access-token.guard';
import { ProductImageProcessor, readProductImageUpload } from '../commerce/media/product-image-processor';
import { ProductImageStorage } from '../commerce/media/product-image-storage';
import { OutboxService } from '../outbox/outbox.service';
import { PatientDirectoryService } from './patient-directory.service';

const missing = () => new NotFoundException({ code: 'DOCTOR_NOT_FOUND', message: 'Doctor or image was not found.', details: {} });

@Injectable()
export class DoctorImageService {
  private activeUploads = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: ProductImageProcessor,
    private readonly storage: ProductImageStorage,
    private readonly outbox: OutboxService,
    private readonly directory: PatientDirectoryService,
  ) {}

  private async adminDoctor(id: string) {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, select: { id: true } });
    const doctor = clinic && await this.prisma.doctorProfile.findFirst({ where: { id, clinicId: clinic.id } });
    if (!doctor) throw missing();
    return doctor;
  }

  async upload(id: string, request: AuthenticatedRequest) {
    const current = await this.adminDoctor(id);
    if (!this.storage.isEnabled() || this.activeUploads >= 2) throw new ServiceUnavailableException();
    this.activeUploads++;
    const deadline = Date.now() + 60_000;
    const timer = setTimeout(() => request.raw.destroy(), 60_000);
    timer.unref();
    try {
      const upload = await readProductImageUpload(request);
      const image = await this.processor.process(upload);
      const key = `doctors/${current.clinicId}/${id}/${randomUUID()}.webp`;
      await this.prisma.$transaction(tx => this.cleanup(tx, key, new Date(deadline + 90_000)));
      if (Date.now() >= deadline) throw new ServiceUnavailableException();
      await this.storage.put(key, image.bytes);
      await this.update(current, key, request, deadline);
    } finally {
      clearTimeout(timer);
      this.activeUploads--;
    }
  }

  async remove(id: string, request: AuthenticatedRequest) {
    const current = await this.adminDoctor(id);
    await this.update(current, null, request);
  }

  async preview(id: string) {
    const doctor = await this.adminDoctor(id);
    if (!doctor.profileImageObjectKey) throw missing();
    return this.storage.read(doctor.profileImageObjectKey);
  }

  async patientImage(id: string, userId: string) {
    const before = await this.directory.visibleDoctor(userId, id);
    if (!before.profileImageObjectKey) throw missing();
    const bytes = await this.storage.read(before.profileImageObjectKey);
    const after = await this.directory.visibleDoctor(userId, id);
    if (before.profileImageObjectKey !== after.profileImageObjectKey) throw missing();
    return bytes;
  }

  private async update(current: Awaited<ReturnType<DoctorImageService['adminDoctor']>>, key: string | null, request: AuthenticatedRequest, deadline = Infinity) {
    await this.prisma.$transaction(async tx => {
      if (Date.now() >= deadline) throw new ServiceUnavailableException();
      const changed = await tx.doctorProfile.updateMany({
        where: { id: current.id, clinicId: current.clinicId, updatedAt: current.updatedAt, profileImageObjectKey: current.profileImageObjectKey },
        data: { profileImageObjectKey: key, ...(key === null ? { profileImageUrl: null } : {}) },
      });
      if (changed.count !== 1) throw new ConflictException({ code: 'DOCTOR_IMAGE_CONFLICT', message: 'Doctor profile changed. Refresh before retrying.', details: {} });
      if (current.profileImageObjectKey) await this.cleanup(tx, current.profileImageObjectKey);
      await tx.auditEvent.create({ data: {
        actorUserId: request.auth.userId, actorSessionId: request.auth.sessionId,
        requestId: request.id, ipAddress: request.ip,
        action: key ? 'DIRECTORY_DOCTOR_IMAGE_UPLOADED' : 'DIRECTORY_DOCTOR_IMAGE_REMOVED',
        subjectType: 'DOCTOR', subjectId: current.id, metadata: {},
      } });
    });
  }

  private async cleanup(tx: Prisma.TransactionClient, key: string, availableAt?: Date) {
    const doctorId = key.split('/')[2];
    await this.outbox.enqueue(tx, {
      eventType: 'DIRECTORY_DOCTOR_IMAGE_CLEANUP', aggregateType: 'DOCTOR', aggregateId: doctorId,
      idempotencyKey: `doctor-image:${availableAt ? 'staged' : 'retired'}:${key}`, payload: { key }, availableAt,
    });
  }
}
