import createClient from 'openapi-fetch';

import type { paths } from './schema.generated';

export type { components, operations, paths } from './schema.generated';
export type ApiPaths = paths;

export interface CreateApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export const createApiClient = ({
  baseUrl,
  fetch,
}: CreateApiClientOptions) =>
  createClient<paths>({
    baseUrl: baseUrl.replace(/\/$/, ''),
    credentials: 'include',
    fetch,
  });
