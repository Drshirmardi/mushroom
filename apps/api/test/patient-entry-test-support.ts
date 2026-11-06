import type { Prisma } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/database/prisma/prisma.service';

/** Fixtures for protected features represent patients who already finished registration. */
export async function completeTestPatientEntry(prisma: PrismaService, userId: string) {
  const patient = await prisma.patientProfile.findUniqueOrThrow({ where: { userId } });
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const data = { firstName: profile?.firstName?.trim() || 'Synthetic', lastName: profile?.lastName?.trim() || 'Patient', gender: profile?.gender === 'MALE' ? 'MALE' : 'FEMALE' } as const;
  await prisma.userProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  if (!await prisma.patientEntry.findUnique({ where: { patientId: patient.id } })) {
    // Leave completion and assessment binding open: protected-feature fixtures may need
    // this same row as the exact owned initial-entry origin for one assessment attempt.
    await prisma.patientEntry.create({ data: { patientId: patient.id, clinicId: patient.clinicId, birthDate: new Date('1990-01-01T00:00:00Z') } });
  }
}

export async function clearTestPatientEntries(prisma: PrismaService, where: Prisma.PatientProfileWhereInput) {
  const patients = await prisma.patientProfile.findMany({ where, select: { userId: true } });
  await prisma.patientEntry.deleteMany({ where: { patient: where } });
  await prisma.userProfile.deleteMany({ where: { userId: { in: patients.map(patient => patient.userId) } } });
}

export async function createCompleteTestPatient(prisma: PrismaService, input: Prisma.PatientProfileCreateArgs) {
  const patient = await prisma.patientProfile.create(input);
  await completeTestPatientEntry(prisma, patient.userId);
  return patient;
}
