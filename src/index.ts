import createClient from './auth';
import { GmailClient } from './types';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

/**
 * Lists the labels in the user's account.
 * @param client An authorized OAuth2 client.
 */
function listLabels(client: GmailClient): void {
  client.users.labels.list({
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
  const gmailClient = await createClient(SCOPES);
  await listLabels(gmailClient);
}

main();
