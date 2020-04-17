import 'reflect-metadata';
import { createConnection } from 'typeorm';
// import Message from './entities/message';
import { Message as GmailMessage } from './types';
import { listThreads, getThread } from './gmail_api';
import createClient from './auth';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

async function main(): Promise<void> {
  const client = await createClient(SCOPES);
  const threads = await listThreads(client);
  const conn = await createConnection();

  // HACK: This only retrieves the first page of emails
  const messageListPromises = threads
    .filter((thread) => thread.id) // Not sure which threads lack IDs
    .map(async (thread) => {
      if (!thread.id) throw new Error('thread was missing id');
      console.log(`retrieving thread id: ${thread.id}`);
      const messages = await getThread(client, thread.id);
      console.log(`thread id: ${thread.id}, messages: ${messages.length}`);
      return messages;
    });
  const messageListList = await Promise.all(messageListPromises);

  let messageList: GmailMessage[] = [];
  messageListList.forEach((oneList) => { messageList = messageList.concat(oneList); });

  console.log(messageList);

  await conn.close();
}

main();
