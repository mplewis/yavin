import { getMessage, listMessages } from './api';
import { GmailClient, SNU, Message as GmailMessage } from '../types';
import Message from '../entities/message';
import { keepTruthy } from '../util';

/**
 * True if the message has an ID and is not in the DB; false otherwise
 * @param messageId The Gmail ID of the message to be checked
 */
async function shouldSaveMessage(messageId: SNU): Promise<boolean> {
  if (!messageId) return false;
  const existing = await Message.findOne({ gmailId: messageId });
  return !existing;
}

/**
 * Check a list of sparse messages and return only the ones that do not yet exist in the database.
 * @param sparseMessages The sparse messages to check
 */
async function omitKnownMessages(sparseMessages: GmailMessage[]): Promise<GmailMessage[]> {
  return keepTruthy(
    await Promise.all(
      sparseMessages.map(async (message) => (
        (await shouldSaveMessage(message.id)) ? message : null)),
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
async function hydrateAll(
  client: GmailClient, sparseMessages: GmailMessage[],
): Promise<GmailMessage[]> {
  return Promise.all(
    sparseMessages.map(({ id }) => {
      if (!id) throw new Error('message lacks id');
      return getMessage(client, id);
    }),
  );
}

/**
 * Save Gmail messages to the database and return the number of successful saves.
 * @param messages The messages to be saved to the database
 */
async function persistAll(messages: GmailMessage[]): Promise<number> {
  const saves = messages.map(async (message) => {
    const row = new Message();
    if (!message.id) throw new Error('message lacks id');
    row.gmailId = message.id;
    row.data = message;
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
 * TODO: This only handles the first page of messages (100). Implement pagination.
 *
 * @param client The Gmail client to be used to access the user's inbox
 */
export async function persistUnseenMessages(
  client: GmailClient,
): Promise<{ listed: number; saved: number }> {
  const allSparseMessages = await listMessages(client);
  const listed = allSparseMessages.length;
  const sparseMessagesToRetrieve = await omitKnownMessages(allSparseMessages);
  const hydrated = await hydrateAll(client, sparseMessagesToRetrieve);
  const saved = await persistAll(hydrated);
  return { listed, saved };
}
