import createClient from 'openapi-fetch';

import type { paths } from './schema.generated';

export type { components, operations, paths } from './schema.generated';
export type ApiPaths = paths;

export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Settles a request that has stalled at the browser/network layer. The source
 * promise remains observed after the timeout, so a later rejection is not
 * reported as an unhandled promise rejection.
 */
export function withRequestTimeout<T>(
  request: Promise<T>,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    request.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export interface CreateApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export type AccessTokenProvider = () => Promise<string | null>;

export interface SessionAwareFetch {
  fetch: typeof globalThis.fetch;
  setAccessTokenProvider: (provider: AccessTokenProvider) => void;
}

/**
 * Replaces a caller's bearer token immediately before protected requests are
 * sent. Public requests remain untouched, so refresh/login calls cannot
 * recursively trigger the provider.
 */
export function createSessionAwareFetch(
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): SessionAwareFetch {
  let accessTokenProvider: AccessTokenProvider | null = null;

  return {
    setAccessTokenProvider(provider) {
      accessTokenProvider = provider;
    },
    fetch: async (input, init) => {
      const request = new Request(input, init);
      if (!request.headers.has('authorization') || !accessTokenProvider) {
        return fetchImpl(request);
      }

      const accessToken = await accessTokenProvider();
      const headers = new Headers(request.headers);
      if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
      else headers.delete('authorization');

      return fetchImpl(new Request(request, { headers }));
    },
  };
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
