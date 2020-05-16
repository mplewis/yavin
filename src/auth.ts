import { google } from 'googleapis';
import { GmailClient } from './types';
import Storage from './lib/storage';

const storage = new Storage('./ secrets');

/**
 * Create a Gmail client with the given credentials and initialize it with a valid token.
 *
 * TODO: You have to drop creds into `/secrets/credentials` as a JSON file
 * TODO: This doesn't validate credential structure
 *
 * @param credentials The authorization client credentials.
 */
export default async function createClient(): Promise<GmailClient | undefined> {
  const credentials = await storage.get('credentials');
  if (!credentials.found) {
    console.error('GmailClient could not find app credentials');
    return undefined;
  }

  const token = await storage.get('token');
  if (!token.found) {
    console.error('GmailClient could not find user token');
    return undefined;
  }

  const {
    installed: { client_secret: cs, client_id: cid, redirect_uris: ris },
  } = credentials.value;
  const client = new google.auth.OAuth2(cid, cs, ris[0]);
  client.setCredentials(token.value);
  const gmailClient = google.gmail({ version: 'v1', auth: client });
  return gmailClient;
}
