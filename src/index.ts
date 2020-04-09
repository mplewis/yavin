import createClient from './auth';
import { decode } from './util';
import { listThreads, getThread } from './gmail_api';
import { MessagePart } from './types';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

const PREFERRED_MIMETYPES = [
  'text/plain',
  'text/html',
];

type SNU = string | null | undefined
type Pair = { name?: SNU; value?: SNU }
type Hash = { [key: string]: string }
function headerPairsToHash(pairs: Pair[]): Hash {
  const hash: Hash = {};
  pairs.forEach(({ name, value }) => {
    if (!name) return;
    if (!value) return;
    hash[name] = value;
  });
  return hash;
}

// async function getAttachment(client: GmailClient, id: string): Promise<MessagePartBody> {
//   const resp = await client.users.messages.attachments.get({ userId: 'me', id });
//   const { data } = resp;
//   if (!data) throw new Error('attachment has no data');
//   return data;
// }

// async function getBodyData(client: GmailClient, mpb: MessagePartBody): Promise<string> {
//   if (mpb.attachmentId) {
//     const attachmentData = await getAttachment(client, mpb.attachmentId);
//     return getBodyData(client, attachmentData);
//   }

//   const { data } = mpb;
//   if (!data) throw new Error('Message contained neither data nor reference to attachment');
//   return data;
// }

function selectPart(parts: MessagePart[]): MessagePart {
  let selected: MessagePart | undefined;
  PREFERRED_MIMETYPES.forEach((preferred) => {
    if (selected) return;
    selected = parts.find((part) => part.mimeType === preferred);
  });
  if (selected) return selected;
  return parts[0];
}

const COUNT = 5;
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
      const { payload } = message;
      if (!payload) throw new Error('message has no payload');
      const { headers: rawHeaders, parts } = payload;

      if (!rawHeaders) throw new Error('headers are blank');
      const headers = headerPairsToHash(rawHeaders);
      console.log(headers);

      if (!parts) throw new Error('message has no parts');
      const part = selectPart(parts);
      const data = part.body?.data;
      if (!data) throw new Error('part has no data');
      console.log(decode(data));
    });
  });
  console.log();
}

main();
