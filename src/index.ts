import 'reflect-metadata';
import cors from 'cors';
import express, { Express } from 'express';
import { createConnection } from 'typeorm';
import Message from './entities/message';
import { Message as GmailMessage } from './types';
import { extractPlaintextContent } from './message';

const DEFAULT_PORT = 9999;

interface EmailResponse {
  id: number;
  gmailId: string;
  body?: string;
  data: GmailMessage;
}
const ORIGIN = 'http://localhost:8080'; // HACK: This only works with the Vue dev server for now

function convertMessage(message: Message): EmailResponse {
  const { id, gmailId, data } = message;
  const body = extractPlaintextContent(data);
  return {
    id, gmailId, data, body,
  };
}

function createApp(): Express {
  const app = express();
  app.use(cors({ origin: ORIGIN }));
  app.get('/emails', async (_req, res) => {
    const messages = await Message.find();
    const emails = messages.map((m) => convertMessage(m));
    res.json(emails);
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
