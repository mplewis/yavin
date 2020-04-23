import 'reflect-metadata';
import { createConnection } from 'typeorm';
import createClient from './auth';
import persist from './workers/persist';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

async function main(): Promise<void> {
  const conn = await createConnection();
  const client = await createClient(SCOPES);
  const results = await persistUnseenMessages(client);
  console.log(results);
  await conn.close();
}

main();
