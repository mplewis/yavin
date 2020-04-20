import { GmailClient, Message } from '../../types';

export async function getMessage(_client: GmailClient, id: string): Promise<Message> {
  const message: Message = { id, raw: 'hydrated_gmail_message' };
  return Promise.resolve(message);
}
