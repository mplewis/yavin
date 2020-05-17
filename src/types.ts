import { gmail_v1 as GmailV1 } from 'googleapis';

export type SNU = string | null | undefined;
export type StrStr = { [k: string]: string };
export type StrNum = { [k: string]: number };

export type GmailClient = GmailV1.Gmail;

export type Thread = GmailV1.Schema$Thread;
export type Message = GmailV1.Schema$Message;
export type MessagePart = GmailV1.Schema$MessagePart;
export type MessagePartBody = GmailV1.Schema$MessagePartBody;

/**
 * Returned from the "GET /emails" endpoint.
 */
export interface EmailResponse {
  id: number;
  gmailId: string;
  tags?: string[];
  from: string;
  subject: string;
  body?: string;
  data: Message;
}
