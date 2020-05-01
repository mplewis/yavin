import { createConnection } from 'typeorm';
import classify from '../workers/classify';

async function main(): Promise<void> {
  const conn = await createConnection();
  const results = await classify();
  console.log(results);
  await conn.close();
}

main();
