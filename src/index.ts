import 'reflect-metadata';
import cors from 'cors';
import express, { Express } from 'express';
import { createConnection } from 'typeorm';
import Message from './entities/message';
import { extractPlaintextContent } from './lib/content';
import { EmailResponse } from './types';
import { headerPairsToHash } from './lib/util';
import classify from './workers/classify';
import persist from './workers/persist';
import createClient from './auth';

const DEFAULT_PORT = 9999;
const ORIGIN = 'http://localhost:8080'; // HACK: This only works with the Vue dev server for now
const WORKER_INTERVAL = 5 * 60 * 1000; // 5m
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

const DEFAULT_PAGE_COUNT = 10;

// HACK: Stolen from Express because I can't get it to import
interface Query {
  [key: string]: string | Query | Array<string | Query>;
}

function work(name: string, task: () => any): void {
  const once = async (): Promise<void> => {
    console.log(`Task ${name} starting`);
    const start = Date.now();
    await task();
    console.log(`Task ${name} complete. Duration: ${Date.now() - start} ms`);
  };
  once();
  setInterval(once, WORKER_INTERVAL);
}

function numPlucker(query: Query) {
  return function pluck(key: string, dfault: number): number {
    const raw = query[key];
    if (!raw) return dfault;
    if (typeof raw !== 'string') {
      throw new Error(
        `Cannot pluck non-String value from query for key ${key}: ${raw}`,
      );
    }
    return parseInt(raw, 10);
  };
}

function convertMessage(message: Message): EmailResponse {
  const { id, gmailId, data } = message;
  const headersRaw = data.payload?.headers;
  if (!headersRaw) throw new Error(`message lacks headers: ${message.id}`);
  const headers = headerPairsToHash(headersRaw);
  const from = headers.From;
  const subject = headers.Subject;
  const body = extractPlaintextContent(data);

  return {
    id,
    gmailId,
    data,
    body,
    from,
    subject,
    tags: ['fake-tag'],
    suspicion: 0.01,
  };
}

function createApp(): Express {
  const app = express();
  app.use(cors({ origin: ORIGIN }));
  app.get('/emails', async (req, res) => {
    const pluck = numPlucker(req.query);
    const limit = pluck('limit', DEFAULT_PAGE_COUNT);
    const offset = pluck('offset', 0);
    const messages = await Message.find({ take: limit, skip: offset });
    const emails = messages.map((m) => convertMessage(m));
    res.json(emails);
  });
  return app;
}

async function startWorkers(): Promise<void> {
  const client = await createClient(SCOPES);
  work('persist', async () => {
    await persist(client);
  });
  work('classify', async () => {
    await classify();
  });
}

async function main(): Promise<void> {
  const port = process.env.PORT || DEFAULT_PORT;
  await createConnection();
  startWorkers();
  const app = createApp();
  app.listen(port, () => {
    console.log(`Serving on http://localhost:${port}`);
  });
}

main();
