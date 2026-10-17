import { Prisma } from '../../../generated/prisma/client';

// Null contexts are grandfathered; SQL prevents new free inserts for commercially governed sources.
export const accessibleAssessmentWhere: Prisma.PatientAssessmentSubmissionWhereInput = {
  OR: [{ accessGrantId: null }, { accessGrant: { patient: { clinic: { status: 'ACTIVE' }, user: { status: 'ACTIVE', roles: { some: { role: { code: 'PATIENT' } } } } }, processingConsent: { withdrawnAt: null }, purchase: { intent: { purpose: 'ASSESSMENT', status: 'PAID' } } } }],
};

export async function processableAssessmentGrants(tx: Prisma.TransactionClient, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_access_grants WHERE id IN (${Prisma.join([...new Set(ids)].map(id => Prisma.sql`${id}::uuid`))}) AND assessment_grant_processable(id)`);
  return new Set(rows.map(row => row.id));
}
