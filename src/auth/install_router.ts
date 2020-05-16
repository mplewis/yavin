import { Express, Response } from 'express';
import pug from 'pug';
import { join } from 'path';
import { UploadedFile } from 'express-fileupload';
import Storage from '../lib/storage';

const storage = new Storage('./secrets');

const FRONTEND_SERVER = 'http://localhost:8080';

function isFileArray(
  thing: UploadedFile | UploadedFile[],
): thing is UploadedFile[] {
  return Object.prototype.hasOwnProperty.call(thing, 'length');
}

function render(
  res: Response,
  templateRelativePath: string,
  msg: string,
): void {
  console.warn(
    `${msg}\nVisit http://localhost:9999 to complete the signin process.`,
  );
  const absolutePath = join(__dirname, templateRelativePath);
  const html = pug.renderFile(absolutePath);
  res.send(html);
}

/**
 * Install the auth routes into the core app.
 * @param app The Express app to be modified with new routes
 */
export default async function installRouter({
  app,
  onSigninComplete,
}: {
  app: Express;
  onSigninComplete: () => void;
}): Promise<void> {
  app.get('/', async (_req, res) => {
    const creds = await storage.get('credentials');
    if (!creds.found) {
      render(res, 'creds.pug', 'Yavin does not have Gmail app credentials.');
      return;
    }

    const token = await storage.get('token');
    const tokenValid = token.found
      && token.value.expiry_date
      && new Date(token.value.expiry_date) < new Date();
    if (!tokenValid) {
      render(
        res,
        'signin.pug',
        'Yavin does not have access to your email account.',
      );
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
      clientError('Missing uploaded file creds.json');
      return;
    }

    if (isFileArray(file)) {
      clientError('Uploaded more than one file for creds.json');
      return;
    }

    const data = file.data.toString();
    // TODO: Validate creds look sane and wipe if they don't work
    await storage.set('credentials', data);
    console.log('Saved provided credentials');

    res.redirect('/');
  });
}
