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

export const createApiClient = ({
  baseUrl,
  fetch,
}: CreateApiClientOptions) =>
  createClient<paths>({
    baseUrl: baseUrl.replace(/\/$/, ''),
    credentials: 'include',
    fetch,
  });
