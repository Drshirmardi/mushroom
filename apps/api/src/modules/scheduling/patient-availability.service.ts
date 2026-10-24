import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AppointmentStatus, DirectoryPublicationStatus, DoctorAvailabilityExceptionKind, VisitMode } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { PatientAvailabilityQueryDto } from './patient-availability.dto';

type Window = { start: Date; end: Date };
type OccupiedWindow = { startsAt: Date; endsAt: Date };
type LocalDate = { year: number; month: number; day: number };
const visible = { isActive: true, publicationStatus: DirectoryPublicationStatus.PUBLISHED };
const queryInvalid = (fields: string[]) => new UnprocessableEntityException({ code: 'AVAILABILITY_QUERY_INVALID', message: 'Availability query is invalid.', details: { fields } });
const serviceNotFound = () => new NotFoundException({ code: 'DOCTOR_SERVICE_NOT_FOUND', message: 'Doctor service was not found.', details: {} });
const clinicNotFound = () => new NotFoundException({ code: 'CLINIC_NOT_FOUND', message: 'Patient clinic was not found.', details: {} });

const dayKey = (date: LocalDate) => `${date.year.toString().padStart(4, '0')}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
const parseDay = (value: string): LocalDate => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) throw queryInvalid(['fromDate', 'toDate']);
  const result = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (new Date(Date.UTC(result.year, result.month - 1, result.day)).getUTCFullYear() !== result.year || new Date(Date.UTC(result.year, result.month - 1, result.day)).getUTCMonth() !== result.month - 1 || new Date(Date.UTC(result.year, result.month - 1, result.day)).getUTCDate() !== result.day) throw queryInvalid(['fromDate', 'toDate']);
  return result;
};
const addDays = (date: LocalDate, amount: number): LocalDate => { const next = new Date(Date.UTC(date.year, date.month - 1, date.day + amount)); return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }; };
const compareDays = (a: LocalDate, b: LocalDate) => dayKey(a).localeCompare(dayKey(b));
const ISO_WEEKDAY = (date: LocalDate) => ((new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() + 6) % 7) + 1;

const formatter = (timeZone: string) => new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const parts = (value: Date, timeZone: string) => Object.fromEntries(formatter(timeZone).formatToParts(value).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])) as Record<string, number>;
const offset = (value: Date, timeZone: string) => { const p = parts(value, timeZone); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - value.getTime(); };
const localInstant = (day: LocalDate, time: string, timeZone: string): Date | null => {
  const [hour, minute] = time.split(':').map(Number); const wall = Date.UTC(day.year, day.month - 1, day.day, hour, minute);
  let candidate = new Date(wall - offset(new Date(wall), timeZone));
  candidate = new Date(wall - offset(candidate, timeZone));
  const actual = parts(candidate, timeZone);
  return actual.year === day.year && actual.month === day.month && actual.day === day.day && actual.hour === hour && actual.minute === minute ? candidate : null;
};
const localDateTime = (value: Date, timeZone: string) => { const p = parts(value, timeZone); return { localDate: `${p.year.toString().padStart(4, '0')}-${p.month.toString().padStart(2, '0')}-${p.day.toString().padStart(2, '0')}`, localTime: `${p.hour.toString().padStart(2, '0')}:${p.minute.toString().padStart(2, '0')}` }; };
const timeString = (value: Date) => value.toISOString().slice(11, 16);
const merge = (windows: Window[]) => windows.sort((a, b) => a.start.getTime() - b.start.getTime()).reduce<Window[]>((merged, current) => { const previous = merged.at(-1); if (previous && current.start <= previous.end) { if (current.end > previous.end) previous.end = current.end; } else merged.push({ ...current }); return merged; }, []);
const subtract = (windows: Window[], blocks: Window[]) => merge(windows).flatMap((window) => merge(blocks).reduce<Window[]>((pieces, block) => pieces.flatMap((piece) => { if (block.end <= piece.start || block.start >= piece.end) return [piece]; const result: Window[] = []; if (block.start > piece.start) result.push({ start: piece.start, end: block.start }); if (block.end < piece.end) result.push({ start: block.end, end: piece.end }); return result; }), [window]));

@Injectable()
export class PatientAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}
  async candidate(userId: string, doctorServiceId: string, startsAt: Date) {
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) return null;
    const clinic = await this.patientClinic(userId);
    const local = localDateTime(startsAt, clinic.timeZone);
    const availability = await this.get(userId, doctorServiceId, {
      fromDate: local.localDate,
      toDate: local.localDate,
      page: 1,
      pageSize: 100,
    }, true);
    return availability.items.find((item) => item.startsAt.getTime() === startsAt.getTime()) ?? null;
  }

  async get(userId: string, doctorServiceId: string, query: PatientAvailabilityQueryDto, forCandidate = false) {
    const from = parseDay(query.fromDate); const to = parseDay(query.toDate);
    if (compareDays(from, to) > 0 || Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000) + 1 > 31) throw queryInvalid(['fromDate', 'toDate']);
    const clinic = await this.patientClinic(userId);
    const offering = await this.prisma.doctorService.findFirst({ where: { id: doctorServiceId, clinicId: clinic.id, ...visible, doctor: visible, service: visible }, select: { id: true, doctorId: true, visitMode: true, durationMinutes: true, bufferMinutes: true } });
    if (!offering) throw serviceNotFound();
    const endExclusive = addDays(to, 1);
    const rangeStart = localInstant(from, '00:00', clinic.timeZone); const rangeEnd = localInstant(endExclusive, '00:00', clinic.timeZone);
    if (!rangeStart || !rangeEnd) throw queryInvalid(['fromDate', 'toDate']);
    const now = new Date();
    const [rules, closures, exceptions, appointments, holds] = await Promise.all([
      this.prisma.availabilityRule.findMany({ where: { clinicId: clinic.id, doctorId: offering.doctorId, visitMode: offering.visitMode, isActive: true, isoWeekday: { in: Array.from({ length: Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 2 }, (_, index) => ISO_WEEKDAY(addDays(from, index))) } }, select: { isoWeekday: true, startLocalTime: true, endLocalTime: true } }),
      this.prisma.clinicClosure.findMany({ where: { clinicId: clinic.id, isActive: true, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } }, select: { startsAt: true, endsAt: true } }),
      this.prisma.doctorAvailabilityException.findMany({ where: { clinicId: clinic.id, doctorId: offering.doctorId, isActive: true, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart }, OR: [{ visitMode: offering.visitMode }, { visitMode: null }] }, select: { kind: true, visitMode: true, startsAt: true, endsAt: true } }),
      forCandidate ? Promise.resolve([] as OccupiedWindow[]) : this.prisma.appointment.findMany({ where: { clinicId: clinic.id, doctorId: offering.doctorId, status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN, AppointmentStatus.QUEUED, AppointmentStatus.IN_PROGRESS] }, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } }, select: { startsAt: true, endsAt: true } }),
      forCandidate ? Promise.resolve([] as OccupiedWindow[]) : this.prisma.appointmentHold.findMany({ where: { clinicId: clinic.id, doctorId: offering.doctorId, releasedAt: null, expiresAt: { gt: now }, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } }, select: { startsAt: true, endsAt: true } }),
    ]);
    const closureWindows = closures.map((closure) => ({ start: closure.startsAt, end: closure.endsAt }));
    const unavailable = exceptions.filter((exception) => exception.kind === DoctorAvailabilityExceptionKind.UNAVAILABLE).map((exception) => ({ start: exception.startsAt, end: exception.endsAt }));
    const available = exceptions.filter((exception) => exception.kind === DoctorAvailabilityExceptionKind.AVAILABLE && exception.visitMode === offering.visitMode).map((exception) => ({ start: exception.startsAt, end: exception.endsAt }));
    const occupied = [...appointments, ...holds];
    const candidates: { startsAt: Date; endsAt: Date; localDate: string; localStartTime: string; localEndTime: string }[] = [];
    for (let day = from; compareDays(day, to) <= 0; day = addDays(day, 1)) {
      const dayStart = localInstant(day, '00:00', clinic.timeZone); const dayEnd = localInstant(addDays(day, 1), '00:00', clinic.timeZone);
      if (!dayStart || !dayEnd) continue;
      const recurring = rules.filter((rule) => rule.isoWeekday === ISO_WEEKDAY(day)).flatMap((rule) => { const start = localInstant(day, timeString(rule.startLocalTime), clinic.timeZone); const end = localInstant(day, timeString(rule.endLocalTime), clinic.timeZone); return start && end && start < end ? [{ start, end }] : []; });
      const availableForDay = available.filter((window) => window.end > dayStart && window.start < dayEnd).map((window) => ({ start: window.start < dayStart ? dayStart : window.start, end: window.end > dayEnd ? dayEnd : window.end }));
      const windows = subtract(merge([...recurring, ...availableForDay]), [...closureWindows, ...unavailable]);
      const step = (offering.durationMinutes + offering.bufferMinutes) * 60_000;
      for (const window of windows) for (let start = new Date(window.start); start.getTime() + step <= window.end.getTime(); start = new Date(start.getTime() + step)) {
        if (start <= now) continue;
        const end = new Date(start.getTime() + offering.durationMinutes * 60_000); const local = localDateTime(start, clinic.timeZone); const localEnd = localDateTime(end, clinic.timeZone);
        if (local.localDate >= query.fromDate && local.localDate <= query.toDate && (forCandidate || !occupied.some((window) => start < window.endsAt && end > window.startsAt))) candidates.push({ startsAt: start, endsAt: end, localDate: local.localDate, localStartTime: local.localTime, localEndTime: localEnd.localTime });
      }
    }
    candidates.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    return { doctorServiceId: offering.id, timeZone: clinic.timeZone, fromDate: query.fromDate, toDate: query.toDate, items: forCandidate ? candidates : candidates.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), page: query.page, pageSize: query.pageSize, total: candidates.length };
  }
  private async patientClinic(userId: string) { const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, include: { clinic: { select: { id: true, timeZone: true, status: true } } } }); if (!patient || patient.clinic.status !== 'ACTIVE') throw clinicNotFound(); return patient.clinic; }
}
