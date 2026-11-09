/** Only exact internal invitation destinations may be used after editing a profile. */
export function marriageProfileReturn(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || url.hash) return null;

    const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
    const isUuid = (id: string | null) => !!id && new RegExp('^' + uuid + '$', 'i').test(id);
    const entries = [...url.searchParams.entries()];

    if (url.pathname === '/assessment/couples') {
      const start = url.searchParams.get('start');
      const replacement = url.searchParams.get('replaceRequestId');
      if (!isUuid(start) || entries.length < 1 || entries.length > 2 ||
          entries.filter(([key]) => key === 'start').length !== 1 ||
          entries.filter(([key]) => key === 'replaceRequestId').length > 1 ||
          entries.some(([key]) => !['start', 'replaceRequestId'].includes(key)) ||
          (replacement !== null && !isUuid(replacement))) return null;
      return url.pathname + url.search;
    }

    if (new RegExp('^/assessment/marriage/requests/' + uuid + '$', 'i').test(url.pathname))
      return entries.length ? null : url.pathname;

    if (!new RegExp('^/assessment/marriage/new/' + uuid + '$', 'i').test(url.pathname)) return null;
    if (entries.length > 1 || entries.some(([key, id]) => key !== 'replaceRequestId' || !isUuid(id))) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
