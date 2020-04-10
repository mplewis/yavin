import { writeFile } from 'fs-extra';
import createClient from './auth';
import { listThreads, getThread } from './gmail_api';
import { headerPairsToHash } from './util';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

const COUNT = 20;
const OFFSET = 0;

async function main(): Promise<void> {
  const client = await createClient(SCOPES);
  const threads = await listThreads(client);
  console.log(threads);
  threads.slice(OFFSET, COUNT + OFFSET).forEach(async (thread) => {
    console.log(thread.id);
    if (!thread.id) throw new Error('thread lacks id');
    const messages = await getThread(client, thread.id);
    messages.forEach(async (message) => {
      if (!message.payload?.headers) return;
      const headers = headerPairsToHash(message.payload.headers);
      writeFile(`${message.id}_headers.json`, JSON.stringify(headers, null, 4));
    });
  });
}

main();
