import 'reflect-metadata';
import cors from 'cors';
import express, { Express } from 'express';
import fileUpload from 'express-fileupload';
import {
  createConnection,
  Not,
  FindConditions,
  ObjectLiteral,
  FindManyOptions,
} from 'typeorm';
import Message from './entities/message';
import { extractPlaintextContent } from './lib/content';
import { EmailResponse } from './types';
import { headerPairsToHash } from './lib/util';
import classify, { RAW_KEYWORDS_YAML } from './workers/classify';
import persist from './workers/persist';
import { createClient, installRouter } from './lib/auth';
import { parseKeywordLists } from './lib/classify';

const DEFAULT_PORT = 9999;
const ORIGIN = 'http://localhost:8080'; // HACK: This only works with the Vue dev server for now
const WORKER_INTERVAL = 5 * 60 * 1000; // 5m

const DEFAULT_PAGE_COUNT = 10;

const FILTERS: {
  [name: string]:
    | FindConditions<Message>[]
    | FindConditions<Message>
    | ObjectLiteral
    | string;
} = {
  clean: [{ tags: '[]' }],
  suspicious: [{ tags: Not('[]') }],
};

// HACK: This import is silly. Revisit it
const { keywords: KEYWORDS } = parseKeywordLists(RAW_KEYWORDS_YAML);

let workersStarted = false;

// HACK: Stolen from Express because I can't get it to import
interface Query {
  [key: string]: string | Query | Array<string | Query>;
}

/**
 * Register a worker to run alongside the server.
 * @param name The worker's name for logs
 * @param task The actual stuff to call to do the work
 */
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

function plucker(query: Query) {
  function pluck(key: string): string | null {
    const raw = query[key];
    if (!raw) return null;
    if (typeof raw !== 'string') {
      throw new Error(
        `Cannot pluck non-String value from query for key ${key}: ${raw}`,
      );
    }
    return raw;
  }

  function pluckNum(key: string, dfault: number): number {
    const raw = pluck(key);
    if (!raw) return dfault;
    return parseInt(raw, 10);
  }

  return { pluck, pluckNum };
}

function convertMessage(message: Message): EmailResponse {
  const {
    id, gmailId, data, tags, receivedAt,
  } = message;
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
    tags,
    receivedAt,
  };
}

async function createApp(): Promise<Express> {
  const app = express();
  app.use(cors({ origin: ORIGIN }));
  app.use(fileUpload());

  app.get('/emails', async (req, res) => {
    const { pluck, pluckNum } = plucker(req.query);
    const findParams: FindManyOptions<Message> = {
      order: { receivedAt: 'DESC' },
      take: pluckNum('limit', DEFAULT_PAGE_COUNT),
      skip: pluckNum('offset', 0),
    };

    const filterName = pluck('filter');
    if (filterName) {
      const filter = FILTERS[filterName];
      if (!filter) {
        const known = Object.keys(FILTERS).join(', ');
        res
          .status(400)
          .send(
            `Expected filter to be one of ${known}, but found ${filterName}`,
          );
        return;
      }
      findParams.where = filter;
    }

    const messages = await Message.find(findParams);
    const emails = messages.map((m) => convertMessage(m));
    res.json(emails);
  });

  app.get('/emails/count', async (req, res) => {
    const { pluck } = plucker(req.query);
    const findParams: FindManyOptions<Message> = {};

    const filterName = pluck('filter');
    if (filterName) {
      const filter = FILTERS[filterName];
      if (!filter) {
        const known = Object.keys(FILTERS).join(', ');
        res
          .status(400)
          .send(
            `Expected filter to be one of ${known}, but found ${filterName}`,
          );
        return;
      }
      findParams.where = filter;
    }

    const count = await Message.count(findParams);
    res.json(count);
  });

  app.get('/keywords', async (_req, res) => {
    res.json(KEYWORDS);
  });
  return app;
}

async function startWorkers(): Promise<void> {
  if (workersStarted) return;
  const client = await createClient();
  if (!client) throw new Error('Cannot create workers; client is not ready');
  work('persistAndClassify', async () => {
    await persist(client);
    await classify();
  });
  workersStarted = true;
}

async function main(): Promise<void> {
  const port = process.env.PORT || DEFAULT_PORT;
  await createConnection();
  const app = await createApp();
  // Start workers right away if the client is ready (has creds and token)
  startWorkers();
  // Otherwise, the router will handle it after the user completes the auth flow
  installRouter({ app, onSigninComplete: startWorkers });
  app.listen(port, () => {
    console.log(`Visit http://localhost:${port} to start using Yavin.`);
  });
}

main();
