import 'reflect-metadata';
import cors from 'cors';
import express, { Express } from 'express';
import { createConnection } from 'typeorm';
import Message from './entities/message';
import { extractPlaintextContent } from './message';
import { EmailResponse } from './types';
import { headerPairsToHash } from './util';

const DEFAULT_PORT = 9999;
const ORIGIN = 'http://localhost:8080'; // HACK: This only works with the Vue dev server for now

function convertMessage(message: Message): EmailResponse {
  const { id, gmailId, data } = message;
  const headersRaw = data.payload?.headers;
  if (!headersRaw) throw new Error(`message lacks headers: ${message.id}`);
  const headers = headerPairsToHash(headersRaw);
  const from = headers.From;
  const subject = headers.Subject;
  const body = extractPlaintextContent(data);

  return {
    id, gmailId, data, body, from, subject, tags: ['fake-tag'], suspicion: 0.01,
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
