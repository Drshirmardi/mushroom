import { Injectable, NotFoundException } from '@nestjs/common';
import { DirectoryPublicationStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { PatientDoctorListQueryDto, PatientServiceListQueryDto } from './patient-directory.dto';
import { patientServiceScope } from './patient-directory.visibility';

const visible = { isActive: true, publicationStatus: DirectoryPublicationStatus.PUBLISHED };
const doctorNotFound = () => new NotFoundException({ code: 'DOCTOR_NOT_FOUND', message: 'Doctor was not found.', details: {} });
const clinicNotFound = () => new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'Patient clinic was not found.', details: {} });
const canonical = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ');

@Injectable()
export class PatientDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listDoctors(userId: string, query: PatientDoctorListQueryDto) {
    const clinic = await this.patientClinic(userId);
    const where: Prisma.DoctorProfileWhereInput = {
      clinicId: clinic.id,
      ...visible,
      ...(query.query && canonical(query.query) ? { displayName: { contains: canonical(query.query), mode: 'insensitive' } } : {}),
      specialties: { some: { ...(query.specialtyId ? { specialtyId: query.specialtyId } : {}), specialty: visible } },
      doctorServices: { some: { ...visible, service: visible, ...(query.serviceId ? { serviceId: query.serviceId } : {}), ...(query.visitMode ? { visitMode: query.visitMode } : {}) } },
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.doctorProfile.count({ where }),
      this.prisma.doctorProfile.findMany({ where, orderBy: [{ displayName: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: this.doctorRelations }),
    ]);
    return { items: records.map((record) => this.doctorItem(record)), page: query.page, pageSize: query.pageSize, total };
  }

  async getDoctor(userId: string, id: string) {
    return this.projectDoctor(await this.visibleDoctor(userId, id));
  }

  async visibleDoctor(userId: string, id: string) {
    const clinic = await this.patientClinic(userId);
    const record = await this.prisma.doctorProfile.findFirst({ where: { id, clinicId: clinic.id, ...visible, specialties: { some: { specialty: visible } }, doctorServices: { some: { ...visible, service: visible } } }, include: { ...this.doctorRelations, clinic: { select: { id: true, name: true, timeZone: true } } } });
    if (!record) throw doctorNotFound();
    return record;
  }

  private projectDoctor(record: Awaited<ReturnType<PatientDirectoryService['visibleDoctor']>>) {
    return { ...this.doctorItem(record), biography: record.biography, languages: record.languages, education: record.education, certifications: record.certifications, clinic: record.clinic };
  }

  async listServices(userId: string, query: PatientServiceListQueryDto) {
    const clinic = await this.patientClinic(userId);
    const where: Prisma.ServiceWhereInput = {
      ...patientServiceScope(clinic.id, query),
      ...(query.query && canonical(query.query) ? { name: { contains: canonical(query.query), mode: 'insensitive' } } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, select: { id: true, name: true, description: true } }),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  private readonly doctorRelations = {
    specialties: { where: { specialty: visible }, include: { specialty: { select: { id: true, name: true } } }, orderBy: { specialty: { name: 'asc' as const } } },
    doctorServices: { where: { ...visible, service: visible }, include: { service: { select: { id: true, name: true, description: true } } }, orderBy: [{ service: { name: 'asc' as const } }, { id: 'asc' as const }] },
  };
  private doctorItem(record: { id: string; displayName: string; profileImageUrl: string | null; profileImageObjectKey: string | null; yearsExperience: number | null; specialties: { specialty: { id: string; name: string } }[]; doctorServices: { id: string; service: { id: string; name: string; description: string | null }; visitMode: string; durationMinutes: number; bufferMinutes: number; priceAmount: number; currency: string }[] }) {
    return { id: record.id, displayName: record.displayName, profileImageUrl: record.profileImageObjectKey ? `/v1/directory/doctors/${record.id}/image` : record.profileImageUrl, yearsExperience: record.yearsExperience, specialties: record.specialties.map(({ specialty }) => specialty), offerings: record.doctorServices.map(({ id, service, visitMode, durationMinutes, bufferMinutes, priceAmount, currency }) => ({ id, service, visitMode, durationMinutes, bufferMinutes, priceAmount, currency })) };
  }
  private async patientClinic(userId: string) {
    const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, include: { clinic: { select: { id: true, name: true, timeZone: true, status: true } } } });
    if (!patient || patient.clinic.status !== 'ACTIVE') throw clinicNotFound();
    return patient.clinic;
  }
}
