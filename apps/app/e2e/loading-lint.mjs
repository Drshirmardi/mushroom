import { ESLint } from '../../dashboard/node_modules/eslint/lib/api.js';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const files = [...new Set([...git('diff', '--name-only', '--relative', '--', 'src').split('\n'), ...git('ls-files', '--others', '--exclude-standard', 'src').split('\n')])].filter(file => /\.(tsx|ts)$/.test(file));
const eslint = new ESLint({ overrideConfigFile: path.resolve('../dashboard/eslint.config.mjs') });
// React compiler diagnostics contain line-numbered code frames; compare stable messages.
const key = message => `${message.severity}:${message.ruleId}:${message.message.split('\n\n')[0]}`;
const delta = [];
let baselineErrors = 0, baselineWarnings = 0;
for (const file of files) {
  const [current] = await eslint.lintText(await readFile(file, 'utf8'), { filePath: path.resolve(file) });
  let baseline = { messages: [] };
  try { [baseline] = await eslint.lintText(git('show', `HEAD:apps/app/${file}`), { filePath: path.resolve(file) }); } catch { /* New files have no baseline. */ }
  baselineErrors += baseline.messages.filter(message => message.severity === 2).length;
  baselineWarnings += baseline.messages.filter(message => message.severity === 1).length;
  const counts = new Map();
  for (const message of baseline.messages) counts.set(key(message), (counts.get(key(message)) ?? 0) + 1);
  const added = current.messages.filter(message => {
    const count = counts.get(key(message)) ?? 0;
    if (count) { counts.set(key(message), count - 1); return false; }
    return true;
  });
  if (added.length) delta.push({ file, messages: added });
}
const summary = { files: files.length, baselineErrors, baselineWarnings, newErrors: delta.flatMap(item => item.messages).filter(message => message.severity === 2).length, newWarnings: delta.flatMap(item => item.messages).filter(message => message.severity === 1).length };
await mkdir('.local/loading', { recursive: true });
await writeFile('.local/loading/lint-delta.json', JSON.stringify({ summary, delta }, null, 2));
console.log(JSON.stringify({ ...summary, added: delta.map(item => ({ file: item.file, messages: item.messages.map(message => ({ line: message.line, rule: message.ruleId, message: message.message.split('\n\n')[0] })) })) }));
if (summary.newErrors || summary.newWarnings) process.exitCode = 1;
