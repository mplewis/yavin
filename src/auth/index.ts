import { Express, Response } from 'express';
import pug from 'pug';
import { join } from 'path';
import { UploadedFile } from 'express-fileupload';
import { google } from 'googleapis';
import { Credentials as GoogleAccessToken } from 'google-auth-library';
import Storage from '../lib/storage';
import { GmailClient } from '../types';

const storage = new Storage('./secrets');

const FRONTEND_SERVER = 'http://localhost:8080';
// If you change Gmail access scopes, you must invalidate all tokens
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

interface RenderArgs {
  res: Response;
  msg: string;
  templatePath: string;
  templateArgs?: { [k: string]: any };
}

// TODO: Creating the wrong kind of app returns the wrong kind of credentials
// (e.g. `installed` not `web`). We don't validate that at this time.
interface Credentials {
  /* eslint-disable camelcase */
  web: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  /* eslint-enable camelcase */
}

function isFileArray(
  thing: UploadedFile | UploadedFile[],
): thing is UploadedFile[] {
  return Object.prototype.hasOwnProperty.call(thing, 'length');
}
function guideNextStep({
  res,
  msg,
  templatePath,
  templateArgs = {},
}: RenderArgs): void {
  console.warn(
    `${msg}\nVisit http://localhost:9999 to complete the signin process.`,
  );
  const absolutePath = join(__dirname, templatePath);
  const html = pug.renderFile(absolutePath, templateArgs);
  res.send(html);
}

function gmailAuthUrlForScopes(
  { web: c }: Credentials,
  scope: string[],
): string {
  const client = new google.auth.OAuth2(
    c.client_id,
    c.client_secret,
    c.redirect_uris[0],
  );
  return client.generateAuthUrl({
    scope,
    // Allow token refresh without user's explicit consent
    access_type: 'offline',
  });
}

async function exchangeCodeForToken(
  { web: c }: Credentials,
  code: string,
): Promise<GoogleAccessToken> {
  // HACK: importing the OAuth2Client type is hard so let's just copy and paste it for now
  const client = new google.auth.OAuth2(
    c.client_id,
    c.client_secret,
    c.redirect_uris[0],
  );
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Create a Gmail client and initialize it with a valid token.
 */
export async function createClient(): Promise<GmailClient | undefined> {
  const credsLookup = await storage.get('credentials');
  if (!credsLookup.found) {
    console.error('GmailClient could not find app credentials');
    return undefined;
  }

  const token = await storage.get('token');
  if (!token.found) {
    console.error('GmailClient could not find user token');
    return undefined;
  }

  const { web: c }: Credentials = credsLookup.value;
  const client = new google.auth.OAuth2(
    c.client_id,
    c.client_secret,
    c.redirect_uris[0],
  );
  client.setCredentials(token.value);
  const gmailClient = google.gmail({ version: 'v1', auth: client });
  return gmailClient;
}

/**
 * Install the auth routes into the core app.
 * @param app The Express app to be modified with new routes
 */
export async function installRouter({
  app,
  onSigninComplete,
}: {
  app: Express;
  onSigninComplete: () => void;
}): Promise<void> {
  app.get('/', async (_req, res) => {
    const credsLookup = await storage.get('credentials');
    if (!credsLookup.found) {
      guideNextStep({
        res,
        msg: 'Yavin does not have Gmail app credentials.',
        templatePath: 'creds.pug',
      });
      return;
    }
    const creds: Credentials = credsLookup.value;

    const token = await storage.get('token');
    // TODO: Support token refresh flow
    // TODO: Check token expiry date and force wipe if expired
    if (!token.found) {
      const authUrl = gmailAuthUrlForScopes(creds, SCOPES);
      guideNextStep({
        res,
        msg: 'Yavin does not have access to your email account.',
        templatePath: 'signin.pug',
        templateArgs: { authUrl },
      });
      return;
    }

    onSigninComplete();
    res.redirect(FRONTEND_SERVER);
  });

  app.post('/save_creds', async (req, res) => {
    function clientError(msg: string): void {
      res.status(400).send(msg);
    }

    const file = req?.files && req.files['creds.json'];
    if (!file) {
      clientError('Missing uploaded file `creds.json`');
      return;
    }

    if (isFileArray(file)) {
      clientError('Uploaded more than one file for `creds.json`');
      return;
    }

    const data = JSON.parse(file.data.toString());
    await storage.set('credentials', data);
    console.log('Saved provided credentials');

    res.redirect('/');
  });

  app.get('/authenticate', async (req, res) => {
    function clientError(msg: string): void {
      res.status(400).send(msg);
    }

    // HACK: We're ignoring the scope query param, so we won't know the scope for which we
    // created our token
    const { code } = req.query;
    if (typeof code !== 'string') {
      clientError('Received an invalid value for query param `code`');
      return;
    }

    // HACK: Duplicated code block, may not be worth deduping
    const credsLookup = await storage.get('credentials');
    if (!credsLookup.found) {
      guideNextStep({
        res,
        msg: 'Yavin does not have Gmail app credentials.',
        templatePath: 'creds.pug',
      });
      return;
    }
    const creds: Credentials = credsLookup.value;
    const token = await exchangeCodeForToken(creds, code);
    await storage.set('token', token);
    console.log('Received and saved Google token');

    res.redirect('/');
  });
}
