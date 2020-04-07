import { google } from 'googleapis';
import { Credentials as GalCreds } from 'google-auth-library';
import { GmailClient } from './types';
import prompt from './prompt';
import Storage from './storage';

/* eslint-disable camelcase,@typescript-eslint/no-explicit-any */
/**
 * HACK: It's really hard to find the exact type of this OAuth2Client,
 * and we only use it in this file anyway
 */
type OAuth2Client = any;
/**
 * An access token provided by Google when a user authorizes access
 */
type AccessToken = GalCreds
/* eslint-enable camelcase,@typescript-eslint/no-explicit-any */

const storage = new Storage('./secrets');

/**
 * Ask the user to authorize access to their Google account, then return the new token.
 * @param client The OAuth2 client to get token for.
 */
async function askUserForAuthorization(
  client: OAuth2Client, scope: string[],
): Promise<AccessToken> {
  const authUrl = client.generateAuthUrl({ access_type: 'offline', scope });
  console.log('Authorize this app by visiting this url:', authUrl);
  const code = await prompt('Enter the code from that page here:');
  return new Promise((resolve, reject) => {
    client.getToken(code, (err: Error, resp: AccessToken) => {
      if (err) return reject(err);
      return resolve(resp);
    });
  });
  // const token = await promisify(client.getToken)(code);
  // return token;
}

/**
 * Initialize the OAuth2 client with an access token, asking the user to
 * grant permission if there is no token stored.
 *
 * TODO: This does not yet check for validity or refresh the token when it's expired
 *
 * @param oAuth2Client The OAuth2 client to be initialized
 */
async function initializeClientWithToken(
  oAuth2Client: OAuth2Client, scopes: string[],
): Promise<void> {
  const token = await storage.get('token');
  if (!token.found) {
    const newToken = await askUserForAuthorization(oAuth2Client, scopes);
    await storage.set('token', newToken);
    return initializeClientWithToken(oAuth2Client, scopes);
  }
  oAuth2Client.setCredentials(token.value);
  return undefined;
}

/**
 * Create a Gmail client with the given credentials and initialize it with a valid token.
 *
 * TODO: You have to drop creds into `/secrets/credentials` as a JSON file
 * TODO: This doesn't validate credential structure
 *
 * @param credentials The authorization client credentials.
 */
export default async function createClient(scopes: string[]): Promise<GmailClient> {
  const credentials = await storage.get('credentials');
  if (!credentials.found) throw new Error('No credentials found in storage');
  const {
    installed: { client_secret: cs, client_id: cid, redirect_uris: ris },
  } = credentials.value;
  const client = new google.auth.OAuth2(cid, cs, ris[0]);
  await initializeClientWithToken(client, scopes);
  const gmailClient = google.gmail({ version: 'v1', auth: client });
  return gmailClient;
}
