import { createConnection } from 'typeorm';
import persist from '../workers/persist';
import { createClient } from '../lib/auth';

async function main(): Promise<void> {
  const conn = await createConnection();
  const client = await createClient();
  if (!client) {
    throw new Error(
      'Client is not ready. Please complete the auth flow first.',
    );
  }
  const results = await persist(client);
  console.log(results);
  await conn.close();
}

main();
