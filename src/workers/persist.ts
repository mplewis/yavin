import { getMessage, listMessages } from '../gmail/api';
import { GmailClient, Message as GmailMessage } from '../types';
import Message from '../entities/message';
import { keepTruthy, headerPairsToHash } from '../lib/util';

/** The Gmail search query to get messages in the user's inbox. */
const IN_INBOX_QUERY = 'in:inbox';

/** Simply a GmailMessage with a guaranteed present ID. */
export interface SparseMessage extends GmailMessage {
  id: string;
}

/**
 * Cast a Gmail Message into SparseMessage. Used for ergonomics.
 * @param sparseMessage The message to be cast
 */
export function castToSparse(sparseMessage: GmailMessage): SparseMessage {
  if (!sparseMessage.id) throw new Error('message lacks id');
  return { ...sparseMessage, id: sparseMessage.id };
}

/**
 * True if the message has an ID and is not in the DB; false otherwise
 * @param messageId The Gmail ID of the message to be checked
 */
export async function shouldSaveMessage(messageId: string): Promise<boolean> {
  return !(await Message.findOne({ gmailId: messageId }));
}

/**
 * Check a list of sparse messages and return only the ones that do not yet exist in the database.
 * @param sparseMessages The sparse messages to check
 */
export async function omitKnownMessages(
  sparseMessages: SparseMessage[],
): Promise<SparseMessage[]> {
  return keepTruthy(
    await Promise.all(
      sparseMessages.map(async (message) => {
        if (await shouldSaveMessage(message.id)) return message;
        return null;
      }),
    ),
  );
}

/**
 * Hydrate sparse messages from the Gmail server.
 *
 * Gmail's list messages endpoint returns sparse messages, not items with data.
 * To hydrate a message, we take its ID and get the full message data from the get message endpoint.
 *
 * A sparse message looks like: `{id: 'abcd123', thread_id: 'wxyz456'}`. It has no other keys.
 *
 * @param sparseMessages The sparse messages to hydrate
 */
export async function hydrateAll(
  client: GmailClient,
  sparseMessages: SparseMessage[],
): Promise<GmailMessage[]> {
  return Promise.all(
    sparseMessages.map(({ id }) => {
      if (!id) throw new Error('message lacks id');
      return getMessage(client, id);
    }),
  );
}

/**
 * Parse the Received date from a message.
 * @param message The message with headers to parse
 */
export function parseReceivedHeader(message: GmailMessage): Date {
  const raw = message.payload?.headers;
  if (!raw) throw new Error('Message has no headers, cannot parse date');
  const headers = headerPairsToHash(raw);

  const receivedRaw = headers.Received;
  const matcher = /;\s*(.+)/;
  const match = receivedRaw.match(matcher);
  if (!match) throw new Error(`Cannot parse date: ${receivedRaw}`);
  const parsed = match[1];

  const received = new Date(parsed);
  if (received.toString() === 'Invalid Date') {
    throw new Error(`Message date is invalid: ${receivedRaw}`);
  }

  return received;
}

/**
 * Save Gmail messages to the database and return the number of successful saves.
 * @param messages The messages to be saved to the database
 */
export async function persistAll(messages: GmailMessage[]): Promise<number> {
  const saves = messages.map(async (message) => {
    const row = new Message();
    if (!message.id) throw new Error('message lacks id');
    row.gmailId = message.id;
    row.data = message;
    row.receivedAt = parseReceivedHeader(message);
    await row.save();
    return true;
  });
  const results = await Promise.all(saves);
  return keepTruthy(results).length;
}

/**
 * Download messages that do not yet exist in the database. Returns the count of listed emails
 * (`messages.list`, which returns a list of sparse email IDs) and retrieved emails
 * (`messages.get`, unseen emails we retrieved and persisted in the database).
 *
 * @param client The Gmail client to be used to access the user's inbox
 * @param query The Gmail query to be used to list messages. Defaults to messages in the inbox.
 */
export default async function persist(
  client: GmailClient,
  query = IN_INBOX_QUERY,
): Promise<{ listed: number; saved: number; pages: number }> {
  let listed = 0;
  let saved = 0;
  let pages = 0;
  let nextPageToken: string | undefined;

  console.log(`Retrieving messages from Gmail using query ${query}`);

  /* eslint-disable no-await-in-loop */
  do {
    pages += 1;
    console.log(`Retrieving page ${pages}`);
    const result = await listMessages(client, query, nextPageToken);
    const { messages } = result;
    nextPageToken = result.nextPageToken;

    const allSparseMessages = messages.map((m) => castToSparse(m));
    listed += allSparseMessages.length;

    const sparseMessagesToRetrieve = await omitKnownMessages(allSparseMessages);
    const hydrated = await hydrateAll(client, sparseMessagesToRetrieve);
    saved += await persistAll(hydrated);
  } while (nextPageToken);
  /* eslint-enable no-await-in-loop */

  return { listed, saved, pages };
}
