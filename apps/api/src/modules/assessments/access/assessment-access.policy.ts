import { Prisma } from '../../../generated/prisma/client';

export const ownedAssessmentGrantWhere: Prisma.AssessmentAccessGrantWhereInput = {
  processingConsent: { withdrawnAt: null },
  OR: [{ purchase: { intent: { purpose: 'ASSESSMENT', status: 'PAID' } } }, { purchaseId: null, method: 'FREE', freeAdminPublicationId: { not: null } }],
};

// Null contexts are grandfathered; SQL prevents new unentitled inserts for governed sources.
export const accessibleAssessmentWhere: Prisma.PatientAssessmentSubmissionWhereInput = {
  OR: [{ accessGrantId: null }, { accessGrant: { ...ownedAssessmentGrantWhere, patient: { clinic: { status: 'ACTIVE' }, user: { status: 'ACTIVE', roles: { some: { role: { code: 'PATIENT' } } } } } } }],
};

export async function processableAssessmentGrants(tx: Prisma.TransactionClient, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_access_grants WHERE id IN (${Prisma.join([...new Set(ids)].map(id => Prisma.sql`${id}::uuid`))}) AND assessment_grant_processable(id)`);
  return new Set(rows.map(row => row.id));
}
