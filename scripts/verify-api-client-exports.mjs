import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const packageRoot = resolve('packages/api-client');
const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
for (const [name, conditions] of Object.entries(manifest.exports)) {
  const target = typeof conditions === 'string' ? conditions : conditions.import ?? conditions.default;
  if (typeof target !== 'string') throw new Error(`Export ${name} has no runtime target`);
  const file = resolve(packageRoot, target);
  if (!file.startsWith(packageRoot + sep)) throw new Error(`Invalid export path for ${name}`);
  await import(pathToFileURL(file).href);
  console.log(`Verified API client export ${name}`);
}
