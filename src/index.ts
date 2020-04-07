import { gmail_v1 as GmailV1 } from 'googleapis';
import createClient from './auth';
import { GmailClient } from './types';

type Message = GmailV1.Schema$Message

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

async function getMessages(client: GmailClient): Promise<Message[]> {
  const resp = await client.users.messages.list({ userId: 'me' });
  const { messages } = resp.data;
  if (!messages) return [];
  return messages;
}

async function main(): Promise<void> {
  const client = await createClient(SCOPES);
  console.log(await getMessages(client));
}

main();
