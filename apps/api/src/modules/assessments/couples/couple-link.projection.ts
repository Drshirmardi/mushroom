import type { Prisma } from '../../../generated/prisma/client';

export const coupleSessionSelect = {
  id: true, state: true, minimumAgeYears: true, consentPolicyVersionId: true, createdAt: true, updatedAt: true,
  participants: { select: { patientId: true, slot: true, revokedAt: true }, orderBy: { slot: 'asc' as const }, take: 2 },
} satisfies Prisma.CoupleSessionSelect;
type LinkRow = Prisma.CoupleSessionGetPayload<{ select: typeof coupleSessionSelect }>;
export const coupleSessionSummary = (row: LinkRow, selfPatientId: string) => ({
  id: row.id, state: row.state, minimumAgeYears: row.minimumAgeYears, consentPolicyVersionId: row.consentPolicyVersionId,
  participants: row.participants.map(item => ({ slot: item.slot, isSelf: item.patientId === selfPatientId, consentState: item.revokedAt ? 'REVOKED' : 'ACCEPTED' })),
  createdAt: row.createdAt, updatedAt: row.updatedAt, assessmentReady: false as const,
});
