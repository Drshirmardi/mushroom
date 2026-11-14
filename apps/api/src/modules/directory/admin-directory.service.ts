import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DirectoryPublicationStatus, Prisma, VisitMode } from '../../generated/prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import type { CreateDoctorDto, CreateDoctorServiceDto, CreateServiceDto, CreateSpecialtyDto, DirectoryListQueryDto, DoctorListQueryDto, DoctorServiceListQueryDto, UpdateClinicDto, UpdateDoctorDto, UpdateDoctorServiceDto, UpdateServiceDto, UpdateSpecialtyDto } from './admin-directory.dto';

const inputInvalid = (fields: string[]) => new UnprocessableEntityException({ code: 'DIRECTORY_INPUT_INVALID', message: 'Directory input is invalid.', details: { fields } });
const clinicNotFound = () => new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'The active clinic was not found.', details: {} });
const recordNotFound = (type: 'DOCTOR' | 'SPECIALTY' | 'SERVICE') => new NotFoundException({ code: `${type}_NOT_FOUND`, message: `${type[0]}${type.slice(1).toLowerCase()} was not found.`, details: {} });
const nameConflict = () => new ConflictException({ code: 'DIRECTORY_NAME_CONFLICT', message: 'A directory record with that name already exists.', details: {} });
const recordInUse = () => new ConflictException({ code: 'DIRECTORY_RECORD_IN_USE', message: 'The directory record is in use and cannot be deleted.', details: {} });
const publicationInvalid = () => new ConflictException({ code: 'DIRECTORY_PUBLICATION_INVALID', message: 'The directory record cannot be published in its current state.', details: {} });
const doctorServiceNotFound = () => new NotFoundException({ code: 'DOCTOR_SERVICE_NOT_FOUND', message: 'Doctor service was not found.', details: {} });
const doctorServiceConflict = () => new ConflictException({ code: 'DOCTOR_SERVICE_CONFLICT', message: 'A doctor service with that mode already exists.', details: {} });
const doctorServiceInputInvalid = (fields: string[]) => new UnprocessableEntityException({ code: 'DOCTOR_SERVICE_INPUT_INVALID', message: 'Doctor service input is invalid.', details: { fields } });

const canonicalName = (value: string): string => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
const requiredText = (value: string, field: string, max: number): string => { const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' '); if (!normalized || normalized.length > max) throw inputInvalid([field]); return normalized; };
const nullableText = (value: string | null | undefined, field: string, max: number): string | null | undefined => { if (value === undefined || value === null) return value; return requiredText(value, field, max); };
const canonicalList = (values: string[] | undefined, field: string, maxItems: number, maxLength: number, unique: boolean): string[] | undefined => { if (values === undefined) return undefined; if (values.length > maxItems) throw inputInvalid([field]); const result = values.map((value) => requiredText(value, field, maxLength)); if (unique && new Set(result.map(canonicalName)).size !== result.length) throw inputInvalid([field]); return result; };
const publicationData = (status: DirectoryPublicationStatus | undefined) => status === undefined ? {} : { publicationStatus: status, publishedAt: status === DirectoryPublicationStatus.PUBLISHED ? new Date() : null };
type NamedRecord = { id: string; name: string; canonicalName: string; description: string | null; isActive: boolean; publicationStatus: DirectoryPublicationStatus; publishedAt: Date | null; createdAt: Date; updatedAt: Date };
type NamedRepository = { count(args: { where: Prisma.SpecialtyWhereInput | Prisma.ServiceWhereInput }): Promise<number>; findMany(args: { where: Prisma.SpecialtyWhereInput | Prisma.ServiceWhereInput; orderBy: unknown; skip: number; take: number }): Promise<NamedRecord[]>; create(args: { data: Prisma.SpecialtyUncheckedCreateInput | Prisma.ServiceUncheckedCreateInput }): Promise<NamedRecord>; findFirst(args: { where: Prisma.SpecialtyWhereInput | Prisma.ServiceWhereInput }): Promise<NamedRecord | null>; update(args: { where: { id: string }; data: Prisma.SpecialtyUncheckedUpdateInput | Prisma.ServiceUncheckedUpdateInput }): Promise<NamedRecord>; delete(args: { where: { id: string } }): Promise<NamedRecord> };
type AuditContext = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };

@Injectable()
export class AdminDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getClinic() { return this.clinic(); }
  async updateClinic(body: UpdateClinicDto, context: AuditContext) {
    if (body.name === undefined && body.timeZone === undefined) throw inputInvalid(['body']);
    const clinic = await this.clinic();
    const data: Prisma.ClinicUpdateInput = {};
    if (body.name !== undefined) data.name = requiredText(body.name, 'name', 160);
    if (body.timeZone !== undefined) data.timeZone = this.timeZone(body.timeZone);
    return this.prisma.$transaction(async (tx) => { const updated = await tx.clinic.update({ where: { id: clinic.id }, data }); await this.audit(tx, 'DIRECTORY_CLINIC_UPDATED', updated.id, context, this.metadata(Object.keys(data), clinic, updated)); return updated; });
  }

  async listDoctors(query: DoctorListQueryDto) {
    const clinic = await this.clinic(); const search = query.query === undefined ? undefined : canonicalName(query.query);
    const where: Prisma.DoctorProfileWhereInput = { clinicId: clinic.id, ...(query.isActive === undefined ? {} : { isActive: query.isActive }), ...(query.publicationStatus === undefined ? {} : { publicationStatus: query.publicationStatus }), ...(search ? { displayName: { contains: search, mode: 'insensitive' } } : {}), ...(query.specialtyId ? { specialties: { some: { specialtyId: query.specialtyId, clinicId: clinic.id } } } : {}) };
    const [total, records] = await this.prisma.$transaction([this.prisma.doctorProfile.count({ where }), this.prisma.doctorProfile.findMany({ where, orderBy: [{ displayName: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { specialties: { include: { specialty: true }, orderBy: { specialty: { name: 'asc' } } } } })]);
    return { items: records.map((record) => this.doctorResponse(record)), page: query.page, pageSize: query.pageSize, total };
  }
  async createDoctor(body: CreateDoctorDto, context: AuditContext) { const clinic = await this.clinic(); return this.prisma.$transaction(async (tx) => { const specialtyIds = await this.specialtyIds(tx, clinic.id, body.specialtyIds); if (body.publicationStatus === DirectoryPublicationStatus.PUBLISHED) await this.publishedDoctorAllowed(tx, clinic.id, specialtyIds); const doctor = await tx.doctorProfile.create({ data: { clinicId: clinic.id, displayName: requiredText(body.displayName, 'displayName', 160), biography: nullableText(body.biography, 'biography', 3000) ?? null, yearsExperience: body.yearsExperience ?? null, profileImageUrl: nullableText(body.profileImageUrl, 'profileImageUrl', 2048) ?? null, languages: canonicalList(body.languages, 'languages', 10, 80, true) ?? [], education: canonicalList(body.education, 'education', 20, 240, false) ?? [], certifications: canonicalList(body.certifications, 'certifications', 20, 240, false) ?? [], isActive: body.isActive ?? false, specialties: specialtyIds.length ? { create: specialtyIds.map((specialtyId) => ({ specialtyId })) } : undefined } }); const published = body.publicationStatus === undefined ? doctor : await tx.doctorProfile.update({ where: { id: doctor.id }, data: publicationData(body.publicationStatus) }); const complete = await tx.doctorProfile.findUniqueOrThrow({ where: { id: published.id }, include: { specialties: { include: { specialty: true }, orderBy: { specialty: { name: 'asc' } } } } }); await this.audit(tx, 'DIRECTORY_DOCTOR_CREATED', doctor.id, context, { changedFields: ['created'] }); return this.doctorResponse(complete); }); }
  async getDoctor(id: string) { const clinic = await this.clinic(); const doctor = await this.prisma.doctorProfile.findFirst({ where: { id, clinicId: clinic.id }, include: { specialties: { include: { specialty: true }, orderBy: { specialty: { name: 'asc' } } } } }); if (!doctor) throw recordNotFound('DOCTOR'); return this.doctorResponse(doctor); }
  async updateDoctor(id: string, body: UpdateDoctorDto, context: AuditContext) { const clinic = await this.clinic(); const patch = this.doctorPatch(body); if (!Object.keys(patch).length && body.specialtyIds === undefined) throw inputInvalid(['body']); return this.prisma.$transaction(async (tx) => { const current = await tx.doctorProfile.findFirst({ where: { id, clinicId: clinic.id }, include: { specialties: { select: { specialtyId: true } } } }); if (!current) throw recordNotFound('DOCTOR'); const specialtyIds = body.specialtyIds === undefined ? current.specialties.map(({ specialtyId }) => specialtyId) : await this.specialtyIds(tx, clinic.id, body.specialtyIds); const nextStatus = body.publicationStatus ?? current.publicationStatus; if (nextStatus === DirectoryPublicationStatus.PUBLISHED) await this.publishedDoctorAllowed(tx, clinic.id, specialtyIds); const publication = publicationData(body.publicationStatus); delete patch.publicationStatus; delete patch.publishedAt; if (body.specialtyIds !== undefined) await tx.doctorProfile.update({ where: { id }, data: { specialties: { deleteMany: {}, create: specialtyIds.map((specialtyId) => ({ specialtyId })) } } }); const doctor = await tx.doctorProfile.update({ where: { id }, data: { ...patch, ...publication }, include: { specialties: { include: { specialty: true }, orderBy: { specialty: { name: 'asc' } } } } }); await this.audit(tx, 'DIRECTORY_DOCTOR_UPDATED', id, context, this.metadata([...Object.keys(body)], current, doctor)); return this.doctorResponse(doctor); }); }
  async deleteDoctor(id: string, context: AuditContext) { const clinic = await this.clinic(); return this.prisma.$transaction(async (tx) => { const doctor = await tx.doctorProfile.findFirst({ where: { id, clinicId: clinic.id }, select: { id: true, profileImageObjectKey: true, _count: { select: { specialties: true, doctorServices: true, availabilityRules: true, exceptions: true } } } }); if (!doctor) throw recordNotFound('DOCTOR'); if (doctor.profileImageObjectKey || Object.values(doctor._count).some(Boolean)) throw recordInUse(); await tx.doctorProfile.delete({ where: { id } }); await this.audit(tx, 'DIRECTORY_DOCTOR_DELETED', id, context, { changedFields: ['deleted'] }); }); }

  async listSpecialties(query: DirectoryListQueryDto) { return this.listNamed('specialty', query); }
  async createSpecialty(body: CreateSpecialtyDto, context: AuditContext) { return this.createNamed('specialty', body, context); }
  async getSpecialty(id: string) { return this.getNamed('specialty', id); }
  async updateSpecialty(id: string, body: UpdateSpecialtyDto, context: AuditContext) { return this.updateNamed('specialty', id, body, context); }
  async deleteSpecialty(id: string, context: AuditContext) { return this.deleteNamed('specialty', id, context); }
  async listServices(query: DirectoryListQueryDto) { return this.listNamed('service', query); }
  async createService(body: CreateServiceDto, context: AuditContext) { return this.createNamed('service', body, context); }
  async getService(id: string) { return this.getNamed('service', id); }
  async updateService(id: string, body: UpdateServiceDto, context: AuditContext) { return this.updateNamed('service', id, body, context); }
  async deleteService(id: string, context: AuditContext) { return this.deleteNamed('service', id, context); }

  async listDoctorServices(query: DoctorServiceListQueryDto) {
    const clinic = await this.clinic();
    const where: Prisma.DoctorServiceWhereInput = {
      clinicId: clinic.id,
      ...(query.doctorId === undefined ? {} : { doctorId: query.doctorId }),
      ...(query.serviceId === undefined ? {} : { serviceId: query.serviceId }),
      ...(query.visitMode === undefined ? {} : { visitMode: query.visitMode }),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.publicationStatus === undefined ? {} : { publicationStatus: query.publicationStatus }),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.doctorService.count({ where }),
      this.prisma.doctorService.findMany({ where, orderBy: [{ doctor: { displayName: 'asc' } }, { service: { name: 'asc' } }, { visitMode: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { doctor: { select: { id: true, displayName: true } }, service: { select: { id: true, name: true } } } }),
    ]);
    return { items: records.map((record) => this.doctorServiceResponse(record)), page: query.page, pageSize: query.pageSize, total };
  }

  async createDoctorService(body: CreateDoctorServiceDto, context: AuditContext) {
    const clinic = await this.clinic();
    return this.prisma.$transaction(async (tx) => {
      await this.doctorServiceParents(tx, clinic.id, body.doctorId, body.serviceId, body.publicationStatus === DirectoryPublicationStatus.PUBLISHED);
      this.validateDoctorServiceInput(body.visitMode, body.durationMinutes, body.bufferMinutes ?? 0, body.priceAmount, body.currency ?? 'IRR');
      try {
        const record = await tx.doctorService.create({ data: { clinicId: clinic.id, doctorId: body.doctorId, serviceId: body.serviceId, visitMode: body.visitMode, durationMinutes: body.durationMinutes, bufferMinutes: body.bufferMinutes ?? 0, priceAmount: body.priceAmount, currency: 'IRR', isActive: body.isActive ?? false, ...publicationData(body.publicationStatus) }, include: { doctor: { select: { id: true, displayName: true } }, service: { select: { id: true, name: true } } } });
        await this.audit(tx, 'DIRECTORY_DOCTOR_SERVICE_CREATED', record.id, context, { changedFields: ['created'] }); return this.doctorServiceResponse(record);
      } catch (error) { this.rethrowDoctorServiceConflict(error); }
    });
  }

  async getDoctorService(id: string) {
    const clinic = await this.clinic();
    const record = await this.prisma.doctorService.findFirst({ where: { id, clinicId: clinic.id }, include: { doctor: { select: { id: true, displayName: true } }, service: { select: { id: true, name: true } } } });
    if (!record) throw doctorServiceNotFound();
    return this.doctorServiceResponse(record);
  }

  async updateDoctorService(id: string, body: UpdateDoctorServiceDto, context: AuditContext) {
    const clinic = await this.clinic();
    if (Object.values(body).every((value) => value === undefined)) throw doctorServiceInputInvalid(['body']);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.doctorService.findFirst({ where: { id, clinicId: clinic.id } });
      if (!current) throw doctorServiceNotFound();
      const doctorId = body.doctorId ?? current.doctorId;
      const serviceId = body.serviceId ?? current.serviceId;
      const durationMinutes = body.durationMinutes ?? current.durationMinutes;
      const bufferMinutes = body.bufferMinutes ?? current.bufferMinutes;
      const priceAmount = body.priceAmount ?? current.priceAmount;
      const currency = body.currency ?? current.currency;
      const nextStatus = body.publicationStatus ?? current.publicationStatus;
      this.validateDoctorServiceInput(body.visitMode ?? current.visitMode, durationMinutes, bufferMinutes, priceAmount, currency);
      await this.doctorServiceParents(tx, clinic.id, doctorId, serviceId, nextStatus === DirectoryPublicationStatus.PUBLISHED);
      try {
        const record = await tx.doctorService.update({ where: { id }, data: { doctorId, serviceId, visitMode: body.visitMode ?? current.visitMode, durationMinutes, bufferMinutes, priceAmount, currency: 'IRR', ...(body.isActive === undefined ? {} : { isActive: body.isActive }), ...publicationData(body.publicationStatus) }, include: { doctor: { select: { id: true, displayName: true } }, service: { select: { id: true, name: true } } } });
        await this.audit(tx, 'DIRECTORY_DOCTOR_SERVICE_UPDATED', record.id, context, this.metadata(Object.keys(body), current, record)); return this.doctorServiceResponse(record);
      } catch (error) { this.rethrowDoctorServiceConflict(error); }
    });
  }

  async deleteDoctorService(id: string, context: AuditContext) {
    const clinic = await this.clinic();
    const record = await this.prisma.doctorService.findFirst({ where: { id, clinicId: clinic.id }, select: { id: true } });
    if (!record) throw doctorServiceNotFound();
    try { await this.prisma.$transaction(async (tx) => { await tx.doctorService.delete({ where: { id } }); await this.audit(tx, 'DIRECTORY_DOCTOR_SERVICE_DELETED', id, context, { changedFields: ['deleted'] }); }); } catch (error) { this.rethrowRecordInUse(error); }
  }

  private namedRepository(kind: 'specialty' | 'service'): NamedRepository { return this.prisma[kind] as unknown as NamedRepository; }
  private async listNamed(kind: 'specialty' | 'service', query: DirectoryListQueryDto) { const clinic = await this.clinic(); const search = query.query === undefined ? undefined : canonicalName(query.query); const where = { clinicId: clinic.id, ...(query.isActive === undefined ? {} : { isActive: query.isActive }), ...(query.publicationStatus === undefined ? {} : { publicationStatus: query.publicationStatus }), ...(search ? { canonicalName: { contains: search } } : {}) }; const repository = this.namedRepository(kind); const [total, records] = await Promise.all([repository.count({ where }), repository.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize })]); return { items: records, page: query.page, pageSize: query.pageSize, total }; }
  private async createNamed(kind: 'specialty' | 'service', body: CreateSpecialtyDto | CreateServiceDto, context: AuditContext) { const clinic = await this.clinic(); const name = requiredText(body.name, 'name', 160); try { return await this.prisma.$transaction(async (tx) => { const record = await (tx[kind] as unknown as NamedRepository).create({ data: { clinicId: clinic.id, name, canonicalName: canonicalName(name), description: nullableText(body.description, 'description', 1000) ?? null, isActive: body.isActive ?? false, ...publicationData(body.publicationStatus) } }); await this.audit(tx, `DIRECTORY_${kind.toUpperCase()}_CREATED`, record.id, context, { changedFields: ['created'] }); return record; }); } catch (error) { this.rethrowNameConflict(error); } }
  private async getNamed(kind: 'specialty' | 'service', id: string) { const clinic = await this.clinic(); const record = await this.namedRepository(kind).findFirst({ where: { id, clinicId: clinic.id } }); if (!record) throw recordNotFound(kind === 'specialty' ? 'SPECIALTY' : 'SERVICE'); return record; }
  private async updateNamed(kind: 'specialty' | 'service', id: string, body: UpdateSpecialtyDto | UpdateServiceDto, context: AuditContext) { const clinic = await this.clinic(); if (body.name === undefined && body.description === undefined && body.isActive === undefined && body.publicationStatus === undefined) throw inputInvalid(['body']); const name = body.name === undefined ? undefined : requiredText(body.name, 'name', 160); try { return await this.prisma.$transaction(async (tx) => { const repository = tx[kind] as unknown as NamedRepository; const current = await repository.findFirst({ where: { id, clinicId: clinic.id } }); if (!current) throw recordNotFound(kind === 'specialty' ? 'SPECIALTY' : 'SERVICE'); const record = await repository.update({ where: { id }, data: { ...(name === undefined ? {} : { name, canonicalName: canonicalName(name) }), ...(body.description === undefined ? {} : { description: nullableText(body.description, 'description', 1000) }), ...(body.isActive === undefined ? {} : { isActive: body.isActive }), ...publicationData(body.publicationStatus) } }); await this.audit(tx, `DIRECTORY_${kind.toUpperCase()}_UPDATED`, id, context, this.metadata(Object.keys(body), current, record)); return record; }); } catch (error) { this.rethrowNameConflict(error); } }
  private async deleteNamed(kind: 'specialty' | 'service', id: string, context: AuditContext) { const clinic = await this.clinic(); return this.prisma.$transaction(async (tx) => { const repository = tx[kind] as unknown as NamedRepository; const record = await repository.findFirst({ where: { id, clinicId: clinic.id } }); if (!record) throw recordNotFound(kind === 'specialty' ? 'SPECIALTY' : 'SERVICE'); const references = kind === 'specialty' ? await tx.doctorSpecialty.count({ where: { clinicId: clinic.id, specialtyId: id } }) : await tx.doctorService.count({ where: { clinicId: clinic.id, serviceId: id } }); if (references) throw recordInUse(); await repository.delete({ where: { id } }); await this.audit(tx, `DIRECTORY_${kind.toUpperCase()}_DELETED`, id, context, { changedFields: ['deleted'] }); }); }
  private validateDoctorServiceInput(visitMode: unknown, durationMinutes: unknown, bufferMinutes: unknown, priceAmount: unknown, currency: unknown) { if ((visitMode !== VisitMode.IN_PERSON && visitMode !== VisitMode.ONLINE) || !Number.isInteger(durationMinutes) || typeof durationMinutes !== 'number' || durationMinutes < 5 || durationMinutes > 480 || !Number.isInteger(bufferMinutes) || typeof bufferMinutes !== 'number' || bufferMinutes < 0 || bufferMinutes > 240 || durationMinutes + bufferMinutes > 480 || !Number.isInteger(priceAmount) || typeof priceAmount !== 'number' || priceAmount < 0 || priceAmount > 2_147_483_647 || currency !== 'IRR') throw doctorServiceInputInvalid(['visitMode', 'durationMinutes', 'bufferMinutes', 'priceAmount', 'currency']); }
  private async doctorServiceParents(tx: Prisma.TransactionClient, clinicId: string, doctorId: string, serviceId: string, requirePublished: boolean) { const [doctor, service] = await Promise.all([tx.doctorProfile.findFirst({ where: { id: doctorId, clinicId }, select: { isActive: true, publicationStatus: true } }), tx.service.findFirst({ where: { id: serviceId, clinicId }, select: { isActive: true, publicationStatus: true } })]); if (!doctor || !service) throw doctorServiceInputInvalid(['doctorId', 'serviceId']); if (requirePublished && (!doctor.isActive || doctor.publicationStatus !== DirectoryPublicationStatus.PUBLISHED || !service.isActive || service.publicationStatus !== DirectoryPublicationStatus.PUBLISHED)) throw publicationInvalid(); }
  private async clinic() { const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' } }); if (!clinic) throw clinicNotFound(); return clinic; }
  private timeZone(value: string) { const candidate = requiredText(value, 'timeZone', 64); try { const canonical = new Intl.DateTimeFormat('en-US', { timeZone: candidate }).resolvedOptions().timeZone; if (canonical !== candidate) throw new Error('noncanonical'); return candidate; } catch { throw new UnprocessableEntityException({ code: 'TIME_ZONE_INVALID', message: 'The time zone is invalid.', details: { field: 'timeZone' } }); } }
  private async specialtyIds(tx: Prisma.TransactionClient, clinicId: string, ids: string[] | undefined) { if (ids === undefined) return []; if (new Set(ids).size !== ids.length || ids.length > 10) throw inputInvalid(['specialtyIds']); const count = await tx.specialty.count({ where: { clinicId, id: { in: ids } } }); if (count !== ids.length) throw inputInvalid(['specialtyIds']); return ids; }
  private async publishedDoctorAllowed(tx: Prisma.TransactionClient, clinicId: string, specialtyIds: string[]) { if (!specialtyIds.length) throw publicationInvalid(); const count = await tx.specialty.count({ where: { clinicId, id: { in: specialtyIds }, isActive: true, publicationStatus: DirectoryPublicationStatus.PUBLISHED } }); if (!count) throw publicationInvalid(); }
  private doctorPatch(body: UpdateDoctorDto): Prisma.DoctorProfileUpdateInput { const data: Prisma.DoctorProfileUpdateInput = {}; if (body.displayName !== undefined) data.displayName = requiredText(body.displayName, 'displayName', 160); if (body.biography !== undefined) data.biography = nullableText(body.biography, 'biography', 3000); if (body.yearsExperience !== undefined) data.yearsExperience = body.yearsExperience; if (body.profileImageUrl !== undefined) data.profileImageUrl = nullableText(body.profileImageUrl, 'profileImageUrl', 2048); if (body.languages !== undefined) data.languages = canonicalList(body.languages, 'languages', 10, 80, true)!; if (body.education !== undefined) data.education = canonicalList(body.education, 'education', 20, 240, false)!; if (body.certifications !== undefined) data.certifications = canonicalList(body.certifications, 'certifications', 20, 240, false)!; if (body.isActive !== undefined) data.isActive = body.isActive; Object.assign(data, publicationData(body.publicationStatus)); return data; }
  private metadata(fields: string[], previous: Record<string, unknown>, next: Record<string, unknown>) { const changedFields = fields.filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field])); const metadata: Record<string, unknown> = { changedFields }; const stateFields = ['isActive', 'publicationStatus']; const transitions = stateFields.filter((field) => previous[field] !== next[field]).map((field) => ({ field, from: previous[field], to: next[field] })); if (transitions.length) metadata.stateTransitions = transitions; if (changedFields.includes('priceAmount') || changedFields.includes('currency')) metadata.price = { from: { priceAmount: previous.priceAmount, currency: previous.currency }, to: { priceAmount: next.priceAmount, currency: next.currency } }; return metadata; }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, context: AuditContext, metadata: Record<string, unknown>) { const actor = await tx.user.findUnique({ where: { id: context.actorUserId }, select: { id: true } }); const session = actor ? await tx.session.findFirst({ where: { id: context.actorSessionId, userId: actor.id }, select: { id: true } }) : null; await tx.auditEvent.create({ data: { action, actorUserId: actor?.id ?? null, actorSessionId: session?.id ?? null, subjectType: action.split('_').slice(0, -1).join('_'), subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: metadata as Prisma.InputJsonObject } }); }
  private doctorResponse(record: { id: string; userId: string | null; displayName: string; biography: string | null; yearsExperience: number | null; profileImageUrl: string | null; profileImageObjectKey: string | null; languages: string[]; education: string[]; certifications: string[]; isActive: boolean; publicationStatus: DirectoryPublicationStatus; publishedAt: Date | null; createdAt: Date; updatedAt: Date; specialties: { specialty: { id: string; name: string } }[] }) { return { id: record.id, userId: record.userId, displayName: record.displayName, biography: record.biography, yearsExperience: record.yearsExperience, profileImageUrl: record.profileImageObjectKey ? `/v1/admin/doctors/${record.id}/image` : record.profileImageUrl, languages: record.languages, education: record.education, certifications: record.certifications, specialties: record.specialties.map(({ specialty }) => ({ id: specialty.id, name: specialty.name })), isActive: record.isActive, publicationStatus: record.publicationStatus, publishedAt: record.publishedAt, createdAt: record.createdAt, updatedAt: record.updatedAt }; }
  private doctorServiceResponse(record: { id: string; doctor: { id: string; displayName: string }; service: { id: string; name: string }; visitMode: VisitMode; durationMinutes: number; bufferMinutes: number; priceAmount: number; currency: string; isActive: boolean; publicationStatus: DirectoryPublicationStatus; publishedAt: Date | null; createdAt: Date; updatedAt: Date }) { return { id: record.id, doctor: { id: record.doctor.id, name: record.doctor.displayName }, service: record.service, visitMode: record.visitMode, durationMinutes: record.durationMinutes, bufferMinutes: record.bufferMinutes, priceAmount: record.priceAmount, currency: record.currency, isActive: record.isActive, publicationStatus: record.publicationStatus, publishedAt: record.publishedAt, createdAt: record.createdAt, updatedAt: record.updatedAt }; }
  private rethrowNameConflict(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw nameConflict(); throw error; }
  private rethrowDoctorServiceConflict(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw doctorServiceConflict(); throw error; }
  private rethrowRecordInUse(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw recordInUse(); throw error; }
}
