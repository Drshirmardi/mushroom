import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../src/index';

const document = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf-8'));

describe('dashboard numeric pagination contract', () => {
  it.each([
    '/v1/admin/assessment-commercial-publications',
    '/v1/admin/assessment-protocols/{assessmentVersionId}/reviews',
    '/v1/admin/assessment-guidance',
    '/v1/admin/couple-result-protocols',
    '/v1/admin/guidance-content',
    '/v1/admin/services',
  ])('describes page controls as integers for %s', path => {
    const parameters = document.paths[path].get.parameters;
    for (const name of ['page', 'pageSize']) {
      const parameter = parameters.find((item: { name: string }) => item.name === name);
      expect(parameter).toMatchObject({ in: 'query', required: false, schema: { type: 'integer', minimum: 1 } });
      expect(parameter.schema.maximum).toBe(name === 'page' ? 10_000 : 50);
    }
  });

  it('sends numeric page controls through the generated request types', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{}', { status: 200 }));
    const client = createApiClient({ baseUrl: 'https://api.example.test', fetch });
    await client.GET('/v1/admin/services', { params: { query: { page: 2, pageSize: 20 } } });
    const request = fetch.mock.calls[0][0] as Request;
    expect(new URL(request.url).searchParams.get('page')).toBe('2');
    expect(new URL(request.url).searchParams.get('pageSize')).toBe('20');
  });
});
