import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationCategory, NotificationDeliveryChannel, NotificationDeliveryStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
const categories = Object.values(NotificationCategory);
@Injectable()
export class NotificationsService { constructor(private readonly prisma: PrismaService) {} private async patient(userId: string) { const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } }); if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} }); return patient; }
  async list(userId: string) { const rows = await this.prisma.notification.findMany({ where: { recipientId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }); return { items: rows.map((x) => ({ id: x.id, category: x.category, title: x.title, body: x.body, readAt: x.readAt, createdAt: x.createdAt })) }; }
  async adminList() { const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The active clinic was not found.', details: {} }); const rows = await this.prisma.notification.findMany({ where: { clinicId: clinic.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }); return { items: rows.map((x) => ({ id: x.id, category: x.category, title: x.title, body: x.body, readAt: x.readAt, createdAt: x.createdAt })) }; }
  async adminList() {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } });
    if (!clinic) throw new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The active clinic was not found.', details: {} });
    const rows = await this.prisma.notification.findMany({
      where: { clinicId: clinic.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100,
      select: {
        id: true, category: true, title: true, body: true, readAt: true, createdAt: true,
        recipient: { select: { userProfile: { select: { firstName: true, lastName: true } } } },
      },
    });
    return { items: rows.map(({ recipient, ...notification }) => ({
      ...notification,
      recipientDisplayName: [recipient.userProfile?.firstName, recipient.userProfile?.lastName].filter(Boolean).join(' ').trim() || null,
    })) };
  }
  async read(id: string, userId: string) { const item = await this.prisma.notification.findFirst({ where: { id, recipientId: userId } }); if (!item) throw new NotFoundException({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notification was not found.', details: {} }); if (!item.readAt) await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } }); return { id }; }
  async readAll(userId: string) { await this.prisma.notification.updateMany({ where: { recipientId: userId, readAt: null }, data: { readAt: new Date() } }); return { ok: true }; }
  async preferences(userId: string) { const patient = await this.patient(userId); const rows = await this.prisma.notificationPreference.findMany({ where: { patientId: patient.id } }); return { items: categories.map((category) => ({ category, inAppEnabled: rows.find((x) => x.category === category)?.inAppEnabled ?? true })) }; }
  async preference(userId: string, category: NotificationCategory, inAppEnabled: boolean) { const patient = await this.patient(userId); return this.prisma.notificationPreference.upsert({ where: { patientId_category: { patientId: patient.id, category } }, create: { patientId: patient.id, category, inAppEnabled }, update: { inAppEnabled } }); }
  async createInApp(tx: Prisma.TransactionClient, patientId: string, clinicId: string, recipientId: string, category: NotificationCategory, title: string, body: string) { const preference = await tx.notificationPreference.findUnique({ where: { patientId_category: { patientId, category } } }); if (preference?.inAppEnabled === false) return null; const notification = await tx.notification.create({ data: { clinicId, recipientId, category, title, body } }); await tx.notificationDelivery.create({ data: { notificationId: notification.id, channel: NotificationDeliveryChannel.IN_APP, status: NotificationDeliveryStatus.DELIVERED } }); return notification; }
}
