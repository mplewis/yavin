import { GmailClient, Message } from '../../types';
import FAKE_RECEIVED_HEADERS from '../../../fixtures/fake_received_headers.json';

export async function listMessages(
  _client: GmailClient,
  _query: string,
  pageToken?: string,
): Promise<{ messages: Message[]; nextPageToken?: string }> {
  if (!pageToken) return { messages: [{ id: '1', threadId: '1' }], nextPageToken: 'page_2' };
  if (pageToken === 'page_2') return { messages: [{ id: '2', threadId: '2' }], nextPageToken: 'page_3' };
  if (pageToken === 'page_3') return { messages: [{ id: '3', threadId: '3' }] };
  throw new Error('Received an invalid page token in a test');
}

export async function getMessage(
  _client: GmailClient,
  id: string,
): Promise<Message> {
  return {
    id,
    raw: 'hydrated_gmail_message',
    payload: { headers: FAKE_RECEIVED_HEADERS },
  };
}
