import { google } from 'googleapis';
import prompt from './prompt';
import Storage from './storage';

const storage = new Storage('./secrets');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
// The token inside storage stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getNewToken(oAuth2Client: any): Promise<void> {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const code = await prompt('Enter the code from that page here:');
  oAuth2Client.getToken(code, async (err: Error, token: any) => {
    if (err) return console.error('Error retrieving access token', err);
    oAuth2Client.setCredentials(token);
    // Store the token to disk for later program executions
    await storage.set('token', token);
    console.log('Token stored');
    return null;
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(credentials: any, callback: (c: any) => void): Promise<void> {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0],
  );

  // Check if we have previously stored a token.
  const token = await storage.get('token');
  if (!token.found) {
    getNewToken(oAuth2Client);
    return;
  }

  oAuth2Client.setCredentials(token.value);
  callback(oAuth2Client);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth: any): void {
  const gmail = google.gmail({ version: 'v1', auth });
  gmail.users.labels.list({
    userId: 'me',
  }, (err, res) => {
    if (err) return console.log(`The API returned an error: ${err}`);
    if (!res) throw new Error();
    const { labels } = res.data;
    if (!labels) throw new Error();
    if (labels.length) {
      console.log('Labels:');
      labels.forEach((label) => {
        console.log(`- ${label.name}`);
      });
    } else {
      console.log('No labels found.');
    }
    return null;
  });
}

async function main(): Promise<void> {
  // Load client secrets from a local file.
  const credentials = await storage.get('credentials');
  if (!credentials.found) throw new Error('No credentials found in storage');
  authorize(credentials.value, listLabels);
}

main();
