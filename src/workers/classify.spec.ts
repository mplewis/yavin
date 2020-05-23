import { readFileSync } from 'fs-extra';
import { join } from 'path';
import classify from './classify';
import Message from '../entities/message';
import { encode } from '../lib/util';
import { parseKeywordLists, List } from '../lib/classify';
import FAKE_RECEIVED_HEADERS from '../../fixtures/fake_received_headers.json';
import ensureSafeDb from '../spec/helpers/ensure_safe_db';
import { GmailClient } from '../types';
import * as gmailApiMock from '../lib/gmail/api';

jest.mock('../lib/gmail/api');

const messageFixtures = [
  // Empty; should be unclassifiable
  { gmailId: 'a', data: {} },
  // should be classified as "theft"
  {
    gmailId: 'b',
    data: {
      payload: {
        headers: FAKE_RECEIVED_HEADERS,
        body: { data: encode('IP espionage intellectual property') },
      },
    },
  },
  // should be classified as "fraud"
  {
    gmailId: 'c',
    data: {
      payload: {
        headers: FAKE_RECEIVED_HEADERS,
        body: { data: encode('pyramid Ponzi loophole contract law') },
      },
    },
  },
  // should be classified as "conspiracy"
  {
    gmailId: 'd',
    data: {
      payload: {
        headers: FAKE_RECEIVED_HEADERS,
        body: { data: encode('under the table alliance agreement') },
      },
    },
  },
];

function createMessages(): Promise<Message[]> {
  return Promise.all(
    messageFixtures.map(async ({ gmailId, data }) => {
      const m = new Message();
      m.gmailId = gmailId;
      m.data = data;
      m.receivedAt = new Date();
      await m.save();
      return m;
    }),
  );
}

describe('message db tests', () => {
  ensureSafeDb();

  describe('classify', () => {
    const client = (null as unknown) as GmailClient;
    let lists: List[];
    beforeEach(async () => {
      const rawYaml = readFileSync(
        join('fixtures', 'keywords.yaml'),
      ).toString();
      lists = parseKeywordLists(rawYaml).lists;
      await createMessages();
    });

    it('classifies messages properly', async () => {
      await classify(client, lists);
      const empty = await Message.findOneOrFail({ gmailId: 'a' });
      const theft = await Message.findOneOrFail({ gmailId: 'b' });
      const fraud = await Message.findOneOrFail({ gmailId: 'c' });
      const conspiracy = await Message.findOneOrFail({ gmailId: 'd' });
      expect(empty.tags).toEqual(['untaggable']);
      expect(theft.tags).toEqual(['theft']);
      expect(fraud.tags).toEqual(['fraud']);
      expect(conspiracy.tags).toEqual(['conspiracy']);
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      expect(gmailApiMock.labelsApplied()).toEqual({
        a: ['Yavin: Untaggable'],
        b: ['Yavin: Suspicious'],
        c: ['Yavin: Suspicious'],
        d: ['Yavin: Suspicious'],
      });
    });
  });
});
