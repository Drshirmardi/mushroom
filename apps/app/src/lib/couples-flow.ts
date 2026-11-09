/** Routes for the canonical two-person test journey. Historical links remain valid. */
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function coupleStartHref(publicationId: string, replacesId?: string): string {
  const query = new URLSearchParams({ start: publicationId });
  if (replacesId) query.set('replaceRequestId', replacesId);
  return '/assessment/couples?' + query.toString();
}

export function selectedCoupleTest(query: URLSearchParams): { publicationId: string; replacesId?: string } | null {
  const entries = [...query.entries()];
  if (entries.length < 1 || entries.length > 2 || entries.some(([key]) => !['start', 'replaceRequestId'].includes(key))) return null;
  if (entries.filter(([key]) => key === 'start').length !== 1 || entries.filter(([key]) => key === 'replaceRequestId').length > 1) return null;
  const publicationId = query.get('start');
  const replacesId = query.get('replaceRequestId');
  if (!publicationId || !uuid.test(publicationId) || (replacesId !== null && !uuid.test(replacesId))) return null;
  return replacesId ? { publicationId, replacesId } : { publicationId };
}

export function isCoupleSelectionRoute(pathname: string, search: string): boolean {
  return pathname === '/assessment/couples' &&
    selectedCoupleTest(new URLSearchParams(search)) !== null;
}

/** Historical and current offerings coexist; only new, payable MARRIAGE publications may be started here. */
export function canStartCoupleTest(row: { servicePurpose?: string | null; priceMode: string }): boolean {
  return row.servicePurpose === 'MARRIAGE' && row.priceMode === 'PAID';
}

export function prioritizeCoupleRequests<T extends { status: string; isInitiator: boolean }>(rows: readonly T[]): T[] {
  const rank = (row: T) => row.status === 'PENDING' ? (row.isInitiator ? 1 : 0) : row.status === 'ACCEPTED' ? 2 : 3;
  return rows.map((row, index) => ({ row, index }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.index - b.index)
    .map(({ row }) => row);
}
