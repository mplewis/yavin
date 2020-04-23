import { createConnection } from 'typeorm';
import persist from '../workers/persist';
import createClient from '../auth';

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

async function main(): Promise<void> {
  const conn = await createConnection();
  const client = await createClient(SCOPES);
  const results = await persist(client);
  console.log(results);
  await conn.close();
}

main();
