import { DirectoryPublicationStatus, type Prisma } from '../../generated/prisma/client';
import type { PatientServiceListQueryDto } from './patient-directory.dto';
const visible = { isActive: true, publicationStatus: DirectoryPublicationStatus.PUBLISHED };
export const patientServiceScope = (clinicId: string, query: Pick<PatientServiceListQueryDto, 'doctorId' | 'visitMode'> = {}): Prisma.ServiceWhereInput => ({
  clinicId, ...visible,
  doctorServices: { some: { ...visible, doctor: visible, ...(query.doctorId ? { doctorId: query.doctorId } : {}), ...(query.visitMode ? { visitMode: query.visitMode } : {}) } },
});
