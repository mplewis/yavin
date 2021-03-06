import 'reflect-metadata';
import cors from 'cors';
import express, { Express } from 'express';
import fileUpload from 'express-fileupload';
import { createConnection, FindManyOptions } from 'typeorm';
import Message from './entities/message';
import { extractPlaintextContent } from './lib/content';
import { EmailResponse } from './types';
import { headerPairsToHash } from './lib/util';
import classify, { RAW_KEYWORDS_YAML } from './workers/classify';
import persist from './workers/persist';
import { createClient, installRouter } from './lib/auth';
import { parseKeywordLists } from './lib/classify';
import { MESSAGE_FILTERS } from './lib/filters';

const DEFAULT_PORT = 9999;
const ORIGIN = 'http://localhost:8080'; // HACK: This only works with the Vue dev server for now
const WORKER_INTERVAL = 5 * 60 * 1000; // 5m

const DEFAULT_PAGE_COUNT = 10;

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

type Plucker = (key: string) => string | null;
type NumPlucker = (key: string, dfault: number) => number;
/**
 * From an Express request, return functions to help extract and structure specific named arguments
 * from the query.
 * @param query The Express query to generate pluckers for
 */
function plucker(query: Query): { pluck: Plucker; pluckInt: NumPlucker } {
  /**
   * Get a named string key. Returns null if the key is not present.
   * @param key The key to pluck
   */
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

  /**
   * Get a named key parsed as an integer.
   * @param key The key to pluck
   * @param dfault If the key is not present, use this value
   */
  function pluckInt(key: string, dfault: number): number {
    const raw = pluck(key);
    if (!raw) return dfault;
    return parseInt(raw, 10);
  }

  return { pluck, pluckInt };
}

/**
 * Structure and parse a DB message for use in the frontend.
 * @param message The DB message model to restructure
 */
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

/**
 * Create the Express server.
 */
async function createApp(): Promise<Express> {
  const app = express();
  app.use(cors({ origin: ORIGIN }));
  app.use(fileUpload());

  /**
   * Get the data for a batch of emails.
   * Params:
   *   - take: The limit of emails to take from the DB
   *   - skip: The offset of emails to retrieve
   *   - filter: Optional. The name of the filter to use.
   */
  app.get('/emails', async (req, res) => {
    const { pluck, pluckInt } = plucker(req.query);
    const findParams: FindManyOptions<Message> = {
      order: { receivedAt: 'DESC' },
      take: pluckInt('limit', DEFAULT_PAGE_COUNT),
      skip: pluckInt('offset', 0),
    };

    const filterName = pluck('filter');
    if (filterName) {
      const filter = MESSAGE_FILTERS[filterName];
      if (!filter) {
        const known = Object.keys(MESSAGE_FILTERS).join(', ');
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

  /**
   * Get the count of emails in the DB.
   * Params:
   *   - filter: Optional. The name of the filter to use.
   */
  app.get('/emails/count', async (req, res) => {
    const { pluck } = plucker(req.query);
    const findParams: FindManyOptions<Message> = {};

    const filterName = pluck('filter');
    if (filterName) {
      const filter = MESSAGE_FILTERS[filterName];
      if (!filter) {
        const known = Object.keys(MESSAGE_FILTERS).join(', ');
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

  /**
   * Get the keywords config used for classifying emails.
   */
  app.get('/keywords', async (_req, res) => {
    res.json(KEYWORDS);
  });
  return app;
}

/**
 * Start persist and classify workers if the Gmail client is ready.
 */
async function startWorkers(): Promise<void> {
  if (workersStarted) return;
  const client = await createClient();
  if (!client) throw new Error('Cannot create workers; client is not ready');
  work('persistAndClassify', async () => {
    await persist(client);
    await classify(client);
  });
  workersStarted = true;
}

/**
 * Entry point. Send the user to localhost:9999 to start using Yavin.
 */
async function main(): Promise<void> {
  const port = process.env.PORT || DEFAULT_PORT;
  await createConnection();
  const app = await createApp();

  try {
    // Start workers right away if the client is ready (has creds and token)
    startWorkers();
  } catch (e) {
    // The client isn't ready. That's OK, the user needs to onboard
  }

  // Otherwise, the router will handle it after the user completes onboarding
  installRouter({ app, onSigninComplete: startWorkers });
  app.listen(port, () => {
    console.log(`Visit http://localhost:${port} to start using Yavin.`);
  });
}

main();
