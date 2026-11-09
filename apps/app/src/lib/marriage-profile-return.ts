/** Only exact internal service destinations may be used after editing a profile. */
export function marriageProfileReturn(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || url.hash) return null;
    const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
    if (url.pathname === '/assessment/couples') {
      const entries = [...url.searchParams.entries()];
      const start = url.searchParams.get('start');
      const replace = url.searchParams.get('replaceRequestId');
      if (entries.length < 1 || entries.length > 2 ||
          entries.filter(([key]) => key === 'start').length !== 1 ||
          entries.some(([key]) => !['start', 'replaceRequestId'].includes(key)) ||
          entries.filter(([key]) => key === 'replaceRequestId').length > 1 ||
          !start || !new RegExp('^'+uuid+'
    if (!new RegExp('^/assessment/marriage/new/'+uuid+'$', 'i').test(url.pathname)) return null;
    const entries = [...url.searchParams.entries()];
    if (entries.length > 1 || entries.some(([key, id]) => key !== 'replaceRequestId' || !new RegExp('^'+uuid+'$', 'i').test(id))) return null;
    return url.pathname + url.search;
  } catch { return null; }
}
, 'i').test(start) ||
          (replace !== null && !new RegExp('^'+uuid+'
    if (!new RegExp('^/assessment/marriage/new/'+uuid+'$', 'i').test(url.pathname)) return null;
    const entries = [...url.searchParams.entries()];
    if (entries.length > 1 || entries.some(([key, id]) => key !== 'replaceRequestId' || !new RegExp('^'+uuid+'$', 'i').test(id))) return null;
    return url.pathname + url.search;
  } catch { return null; }
}
, 'i').test(replace))) return null;
      return url.pathname + url.search;
    }
    if (new RegExp('^/assessment/marriage/requests/'+uuid+'
    if (!new RegExp('^/assessment/marriage/new/'+uuid+'$', 'i').test(url.pathname)) return null;
    const entries = [...url.searchParams.entries()];
    if (entries.length > 1 || entries.some(([key, id]) => key !== 'replaceRequestId' || !new RegExp('^'+uuid+'$', 'i').test(id))) return null;
    return url.pathname + url.search;
  } catch { return null; }
}
, 'i').test(url.pathname)) return url.search ? null : url.pathname;
    if (!new RegExp('^/assessment/marriage/new/'+uuid+'$', 'i').test(url.pathname)) return null;
    const entries = [...url.searchParams.entries()];
    if (entries.length > 1 || entries.some(([key, id]) => key !== 'replaceRequestId' || !new RegExp('^'+uuid+'$', 'i').test(id))) return null;
    return url.pathname + url.search;
  } catch { return null; }
}
