import 'reflect-metadata';
import { createConnection } from 'typeorm';
// import Message from './entities/message';
import { getMessage, listMessages } from './gmail_api';
import createClient from './auth';
import Message from './entities/message';
import { SNU } from './types';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

async function shouldSaveMessage(messageId: SNU): Promise<boolean> {
  if (!messageId) return false;
  const existing = await Message.findOne({ gmailId: messageId });
  if (existing) {
    console.log(`Message ${messageId} exists already; skipping`);
    return false;
  }
  return true;
}

function keepTruthy<T>(thing: (T | null | undefined)[]): T[] {
  return thing.filter(Boolean) as T[];
}

async function main(): Promise<void> {
  const client = await createClient(SCOPES);
  // Sparse messages have message ID and thread ID, nothing else
  const allSparseMessages = await listMessages(client);
  const conn = await createConnection();

  // TODO: Why is this not working properly?
  const sparseMessagesToRetrieve = keepTruthy(await Promise.all(
    allSparseMessages.map(async (message) => {
      const shouldSave = await shouldSaveMessage(message.id);
      if (shouldSave) return null;
      return message;
    }),
  ));

  // Hydrate the sparse messages
  const retrievedMessages = await Promise.all(
    sparseMessagesToRetrieve.map(({ id }) => {
      if (!id) throw new Error('message lacks id');
      return getMessage(client, id);
    }),
  );

  await Promise.all(retrievedMessages.map(async (messageData) => {
    const message = new Message();
    if (!messageData.id) throw new Error('message lacks id');
    message.gmailId = messageData.id;
    message.data = messageData;
    await message.save();
    console.log(`Saved message ${message.gmailId}`);
  }));

  await conn.close();
}

main();
