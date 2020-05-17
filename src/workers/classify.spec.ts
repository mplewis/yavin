import { Connection, createConnection } from 'typeorm';
import { readFile, readFileSync } from 'fs-extra';
import { join } from 'path';
import classify from './classify';
import Message from '../entities/message';
import { encode } from '../lib/util';
import { parseKeywordLists, List } from '../lib/classify';

const messageFixtures = [
  // Empty; should be unclassifiable
  { gmailId: 'a', data: {} },
  // should be classified as "theft"
  {
    gmailId: 'b',
    data: {
      payload: { body: { data: encode('IP espionage intellectual property') } },
    },
  },
  // should be classified as "fraud"
  {
    gmailId: 'c',
    data: {
      payload: {
        body: { data: encode('pyramid Ponzi loophole contract law') },
      },
    },
  },
  // should be classified as "conspiracy"
  {
    gmailId: 'd',
    data: {
      payload: { body: { data: encode('under the table alliance agreement') } },
    },
  },
];

function createMessages(): Promise<Message[]> {
  return Promise.all(
    messageFixtures.map(async ({ gmailId, data }) => {
      const m = new Message();
      m.gmailId = gmailId;
      m.data = data;
      await m.save();
      return m;
    }),
  );
}

describe('message db tests', () => {
  let conn: Connection;
  beforeAll(async () => {
    conn = await createConnection();
  });
  afterAll(async () => {
    await conn.close();
  });

  afterEach(async () => {
    // HACK: This is a really jank way to ensure that VSCode's Jest runner doesn't nuke the current
    // DB when you're running a dev server alongside your editor
    const ormconfig = JSON.parse(
      (await readFile('./ormconfig.json')).toString(),
    );
    const { database }: { database: string } = ormconfig;
    if (!database.endsWith('_test')) {
      throw new Error(`Cowardly refusing to clear non-test DB ${database}`);
    }
    await Message.clear();
  });

  describe('classify', () => {
    let lists: List[];
    beforeEach(async () => {
      const rawYaml = readFileSync(
        join('fixtures', 'keywords.yaml'),
      ).toString();
      lists = parseKeywordLists(rawYaml).lists;
      await createMessages();
    });

    it('classifies messages properly', async () => {
      await classify(lists);
      const empty = await Message.findOneOrFail({ gmailId: 'a' });
      const theft = await Message.findOneOrFail({ gmailId: 'b' });
      const fraud = await Message.findOneOrFail({ gmailId: 'c' });
      const conspiracy = await Message.findOneOrFail({ gmailId: 'd' });
      expect(empty.tags).toEqual(['untaggable']);
      expect(theft.tags).toEqual(['theft']);
      expect(fraud.tags).toEqual(['fraud']);
      expect(conspiracy.tags).toEqual(['conspiracy']);
    });
  });
});
