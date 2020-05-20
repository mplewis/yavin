import { GmailClient, Thread, Message } from '../../types';

/**
 * Get the first page of threads from the currently signed-in user's inbox.
 * @param client An authorized GmailClient
 */
export async function listThreads(client: GmailClient): Promise<Thread[]> {
  const resp = await client.users.threads.list({ userId: 'me' });
  const { threads } = resp.data;
  if (!threads) return [];
  return threads;
}

/**
 * Get a page of messages from the currently signed-in user's inbox.
 * @param client An authorized GmailClient
 * @param query The Gmail search query to use to filter the results
 * @param pageToken If not provided, retrieves the first page of results. If provided, retrieves
 * the page of results following the query page that returned the token.
 */
export async function listMessages(
  client: GmailClient,
  query: string,
  pageToken?: string,
): Promise<{ messages: Message[]; nextPageToken?: string }> {
  const resp = await client.users.messages.list({
    userId: 'me',
    q: query,
    pageToken,
  });
  const { messages, nextPageToken } = resp.data;
  return {
    messages: messages || [],
    nextPageToken: nextPageToken || undefined,
  };
}

/**
 * Get the messages in a thread.
 * @param client An authorized GmailClient
 * @param id The ID of the thread to retrieve
 */
export async function getThread(
  client: GmailClient,
  id: string,
): Promise<Message[]> {
  const resp = await client.users.threads.get({ userId: 'me', id });
  const { messages } = resp.data;
  if (!messages) throw new Error('thread has no messages');
  return messages;
}

/**
 * Get a single message.
 * @param client An authorized GmailClient
 * @param id The ID of the message to retrieve
 */
export async function getMessage(
  client: GmailClient,
  id: string,
): Promise<Message> {
  const resp = await client.users.messages.get({ userId: 'me', id });
  return resp.data;
}
