import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';

const forbidden = () => new ForbiddenException({
  code: 'CLINICAL_RESOURCE_FORBIDDEN',
  message: 'The clinical resource is not available to this actor.',
  details: {},
});

@Injectable()
export class ClinicalResourceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async patient(userId: string, patientId: string) {
    const patient = await this.prisma.patientProfile.findFirst({
      where: { id: patientId, clinic: { clinicalClinicAccesses: { some: { userId } } } },
      select: { id: true, clinicId: true },
    });
    if (!patient) throw forbidden();
    return patient;
  }
}
