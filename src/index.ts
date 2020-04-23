import 'reflect-metadata';
import express, { Express } from 'express';
import { createConnection } from 'typeorm';
import Message from './entities/message';
import { Message as GmailMessage } from './types';

const DEFAULT_PORT = 9999;

async function emails(): Promise<GmailMessage[]> {
  const messages = await Message.find();
  return messages.map((m) => m.data);
}

function createApp(): Express {
  const app = express();
  app.get('/emails', async (_req, res) => {
    res.json(await emails());
  });
  return app;
}

async function main(): Promise<void> {
  const port = process.env.PORT || DEFAULT_PORT;
  await createConnection();
  const app = createApp();
  app.listen(port, () => { console.log(`Serving on http://localhost:${port}`); });
}

main();
