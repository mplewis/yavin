import {
  GmailClient, Thread, Message, Label,
} from '../../types';

// The special value "me" can be used to indicate the authenticated user.
const SELF = { userId: 'me' };

/**
 * Get the first page of threads from the currently signed-in user's inbox.
 * @param client An authorized GmailClient
 */
export async function listThreads(client: GmailClient): Promise<Thread[]> {
  const resp = await client.users.threads.list({ ...SELF });
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
    ...SELF,
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
  const resp = await client.users.threads.get({ ...SELF, id });
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
  const resp = await client.users.messages.get({ ...SELF, id });
  return resp.data;
}

/**
 * List all existing labels.
 * @param client An authorized GmailClient
 */
export async function listLabels(client: GmailClient): Promise<Label[]> {
  const {
    data: { labels },
  } = await client.users.labels.list({ ...SELF });
  if (!labels) throw new Error('Received no labels');
  return labels;
}

/**
 * Create a label.
 * @param client An authorized GmailClient
 * @param name The name of the label to create
 */
export async function createLabel(
  client: GmailClient,
  name: string,
): Promise<Label> {
  const resp = await client.users.labels.create({
    ...SELF,
    requestBody: { name },
  });
  return resp.data;
}

/**
 * Get one or more existing labels by name if they exist. Otherwise, create them.
 * @param client An authorized GmailClient
 * @param name The name of the labels to retrieve or create
 */
export async function ensureLabels(
  client: GmailClient,
  names: string[],
): Promise<{ [name: string]: Label }> {
  const existingLabels = await listLabels(client);
  const created: { [name: string]: Label } = {};
  await Promise.all(
    names.map(async (name) => {
      const existingLabel = existingLabels.find((label) => label.name === name);
      if (existingLabel) {
        created[name] = existingLabel;
        return;
      }
      created[name] = await createLabel(client, name);
    }),
  );
  return created;
}

/**
 * Add a label to a message.
 * @param client An authorized GmailClient
 * @param gmailId The ID of the message to label
 * @param labelId The ID of the label to apply
 */
export async function labelMessage(
  client: GmailClient,
  gmailId: string,
  labelId: string,
): Promise<Message> {
  const requestBody = { addLabelIds: [labelId] };
  const resp = await client.users.messages.modify({
    ...SELF,
    id: gmailId,
    requestBody,
  });
  return resp.data;
}
