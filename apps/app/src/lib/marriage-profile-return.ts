/** Only exact internal service destinations may be used after editing a profile. */
export function marriageProfileReturn(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || url.hash) return null;
    const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
    const validId = new RegExp('^' + uuid + '$', 'i');

    if (url.pathname === '/assessment/couples') {
      const entries = [...url.searchParams.entries()];
      const selection = url.searchParams.get('newTestId');
      if (!selection || !validId.test(selection) || entries.length < 1 || entries.length > 2) return null;
      if (new Set(entries.map(([name]) => name)).size !== entries.length) return null;
      if (entries.some(([name, id]) => !['newTestId', 'replaceRequestId'].includes(name) || !validId.test(id))) return null;
      return url.pathname + url.search;
    }
    if (new RegExp('^/assessment/marriage/requests/' + uuid + '$', 'i').test(url.pathname)) {
      return url.search ? null : url.pathname;
    }
    if (!new RegExp('^/assessment/marriage/new/' + uuid + '$', 'i').test(url.pathname)) return null;
    const entries = [...url.searchParams.entries()];
    if (entries.length > 1 || entries.some(([name, id]) => name !== 'replaceRequestId' || !validId.test(id))) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
