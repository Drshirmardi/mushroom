import 'dotenv/config';

import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the development seed.');
}

const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query('SELECT 1');
  console.log('Development seed completed: no business data exists in Phase 00.');
} finally {
  await client.end();
}
