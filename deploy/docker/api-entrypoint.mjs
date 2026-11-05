import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const fileBackedVariables = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'ARVAN_ACCESS_KEY_ID',
  'ARVAN_SECRET_ACCESS_KEY',
  'DATABASE_URL',
  'GA4_API_SECRET',
  'JWT_ACCESS_SECRET',
  'REFRESH_TOKEN_PEPPER',
  'OTP_PEPPER',
  'SMS_CREDENTIAL_ENCRYPTION_KEY',
  'SMS_CREDENTIAL_DECRYPTION_KEYS',
  'PAYMENT_CREDENTIAL_ENCRYPTION_KEY',
  'PAYMENT_CREDENTIAL_DECRYPTION_KEYS',
];

for (const name of fileBackedVariables) {
  const filePath = process.env[`${name}_FILE`];
  if (!filePath) continue;

  try {
    process.env[name] = (await readFile(filePath, 'utf8')).replace(/[\r\n]+$/, '');
  } catch (error) {
    console.error(`${name}_FILE is not readable`);
    throw error;
  }
}

const [script = 'dist/main.js', ...scriptArgs] = process.argv.slice(2);
const child = spawn(process.execPath, [script, ...scriptArgs], {
  env: process.env,
  stdio: 'inherit',
});

child.once('error', (error) => {
  console.error('API child process could not start', error);
  process.exitCode = 1;
});
child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
