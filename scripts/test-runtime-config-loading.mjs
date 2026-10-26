import { readFileSync } from 'node:fs';

for (const application of ['web', 'app', 'dashboard']) {
  const layout = readFileSync(`apps/${application}/src/app/layout.tsx`, 'utf8');
  if (/<Script\b[^>]*src=["']\/runtime-config\.js["']/.test(layout)) {
    throw new Error(`${application} must not schedule runtime config through next/script`);
  }
  const head = layout.indexOf('<head>');
  const script = layout.indexOf('<script src="/runtime-config.js" />');
  const body = layout.indexOf('<body');
  if (head < 0 || script < head || body < script) {
    throw new Error(`${application} must load runtime config synchronously in head before body hydration`);
  }
}

console.log('Runtime config loading contract checks passed.');
