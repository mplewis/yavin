import { writeFile } from 'fs-extra';
import createClient from './auth';
import { listThreads, getThread } from './gmail_api';
import { extractContent } from './message';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

const COUNT = 10;
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
      const content = extractContent(message);
      if (!content) {
        console.warn(`${message.id} has no content`);
        writeFile(`message_${message.id}.json`, JSON.stringify(message, null, 2));
        return;
      }
      writeFile(`parsed_${message.id}.txt`, content.replace(/\s\s+/g, ' ').trim());
    });
  });
  console.log();
}

main();
