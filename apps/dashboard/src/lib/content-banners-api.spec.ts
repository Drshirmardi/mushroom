import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock('./api', async () => {
  const { createApiClient, createSessionAwareFetch } = await import('@sabz-zendegi/api-client');
  const transport = createSessionAwareFetch((...args) => globalThis.fetch(...args)); transport.setAccessTokenProvider(async () => 'fresh-session-token');
  return { apiBaseUrl: 'https://api.test', apiClient: createApiClient({ baseUrl: 'https://api.test', fetch: transport.fetch }) };
});
import { ContentBannerApiError, listAdminBanners, previewBannerMedia, removeBannerMedia, updateBanner } from './content-banners-api';

describe('banner API uses the current protected session transport', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('refreshes the supplied stale bearer and preserves cache, version and operation headers', async () => {
    const requests: Request[] = [];
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      requests.push(request);
      if (request.method === 'DELETE') return new Response(null, { status: 204 });
      if (request.url.endsWith('/content')) return new Response(new Blob(['image'], { type: 'image/webp' }));
      return Response.json(request.method === 'PATCH' ? { id: 'b1' } : { items: [] });
    }));
    await listAdminBanners('stale'); await updateBanner('stale', 'b1', { destinationUrl: null }, '"etag"');
    await previewBannerMedia('stale', 'b1'); await removeBannerMedia('stale', 'b1', { etag: '"etag"', key: 'operation-1' });
    expect(requests).toHaveLength(4); for (const request of requests) expect(request.headers.get('authorization')).toBe('Bearer fresh-session-token');
    expect(requests[0]!.cache).toBe('no-store'); expect(requests[1]!.headers.get('if-match')).toBe('"etag"');
    expect(requests[3]!.headers.get('idempotency-key')).toBe('operation-1');
  });
  it('preserves a conflict code instead of reporting image validation or false success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'CONTENT_REVISION_CONFLICT' }, { status: 412 })));
    await expect(updateBanner('old', 'b1', { title: 'Edited' }, '"old"')).rejects.toMatchObject({ status: 412, code: 'CONTENT_REVISION_CONFLICT' });
  });
  it('reports an unavailable network as an ambiguous request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network unavailable'); }));
    await expect(listAdminBanners('old')).rejects.toEqual(expect.objectContaining<Partial<ContentBannerApiError>>({ status: 0 }));
  });
});
