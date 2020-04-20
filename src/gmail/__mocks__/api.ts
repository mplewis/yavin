import { GmailClient, Message } from '../../types';

export async function listMessages(_client: GmailClient): Promise<Message[]> {
  return [
    { id: '1', threadId: '1' },
    { id: '2', threadId: '2' },
    { id: '3', threadId: '3' },
  ];
}

export async function getMessage(_client: GmailClient, id: string): Promise<Message> {
  return { id, raw: 'hydrated_gmail_message' };
}
