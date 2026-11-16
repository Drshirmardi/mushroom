import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { Draft } from './catalog-merge';

export type CatalogEntry = { programKey: string; locale: string; kind: 'READY_EDUCATION'; catalogRole?: 'SERVICE' | 'REFERENCE'; baseAmountRial: string; reviewRequired: boolean; draft: Draft; sources: object[]; invalidReason?: string };
export type CatalogBundle = { schemaVersion: 1; entries: CatalogEntry[]; hash: string };
@Injectable()
export class ProgramCatalogBundle {
  // Called only by authenticated import operations, never by patient content delivery.
  async load(): Promise<CatalogBundle> {
    try {
      const value = JSON.parse(await readFile(resolve(__dirname, '../../../../dist/resources/program-catalog.json'), 'utf8')) as CatalogBundle;
      const { hash, ...payload } = value;
      if (value.schemaVersion !== 1 || !Array.isArray(value.entries) || createHash('sha256').update(JSON.stringify(payload)).digest('hex') !== hash) throw new Error('Invalid bundle');
      return value;
    } catch {
      throw new ServiceUnavailableException({ code: 'PROGRAM_CATALOG_UNAVAILABLE', message: 'Build the private catalog before importing.', details: {} });
    }
  }
}
