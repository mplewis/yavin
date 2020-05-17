import { Connection, createConnection } from 'typeorm';
import { readFile } from 'fs-extra';
import persist, {
  SparseMessage,
  castToSparse,
  shouldSaveMessage,
  omitKnownMessages,
  hydrateAll,
  persistAll,
  parseReceivedHeader,
} from './persist';
import { Message as GmailMessage, GmailClient } from '../types';
import Message from '../entities/message';
import FAKE_RECEIVED_HEADERS from '../../fixtures/fake_received_headers.json';

jest.mock('../gmail/api');

describe('castToSparse', () => {
  it('casts messages with ids to SparseMessages', () => {
    const input: GmailMessage = { id: '1234', threadId: '5678' };
    const output: SparseMessage = castToSparse(input);
    expect(input).toEqual(output);
  });

  it('refuses to cast messages lacking ids', () => {
    const input: GmailMessage = { threadId: '5678' };
    expect(() => castToSparse(input)).toThrowErrorMatchingInlineSnapshot(
      '"message lacks id"',
    );
  });
});

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

  async function insertMessagesWithIds(...ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id) => {
        const message = new Message();
        message.gmailId = id;
        message.data = {};
        message.receivedAt = new Date();
        return message.save();
      }),
    );
  }

  describe('shouldSaveMessage', () => {
    beforeEach(async () => {
      await insertMessagesWithIds('known1', 'known2');
    });

    it('knows which messages are already persisted', async () => {
      expect(await shouldSaveMessage('known1')).toBeFalsy();
      expect(await shouldSaveMessage('known2')).toBeFalsy();
      expect(await shouldSaveMessage('unknown1')).toBeTruthy();
      expect(await shouldSaveMessage('unknown2')).toBeTruthy();
    });
  });

  describe('omitKnownMessages', () => {
    beforeEach(async () => {
      await insertMessagesWithIds('known1', 'known2');
    });

    it('omits messages that have already been persisted', async () => {
      const input: SparseMessage[] = [
        { id: 'known1', payload: { headers: FAKE_RECEIVED_HEADERS } },
        { id: 'known2', payload: { headers: FAKE_RECEIVED_HEADERS } },
        { id: 'unknown1', payload: { headers: FAKE_RECEIVED_HEADERS } },
        { id: 'unknown2', payload: { headers: FAKE_RECEIVED_HEADERS } },
      ];
      expect((await omitKnownMessages(input)).map((m) => m.id)).toEqual([
        'unknown1',
        'unknown2',
      ]);
    });
  });

  describe('parseReceivedHeader', () => {
    function makeFakeMsg(date: string): GmailMessage {
      const value = `by 127.0.0.1 with SMTP id deadbeefcafe;        ${date}`;
      const fake = { payload: { headers: [{ name: 'Received', value }] } };
      return (fake as unknown) as GmailMessage;
    }

    it('parses Received headers as expected', () => {
      const msg = makeFakeMsg('Fri, 17 Apr 2020 18:02:07 -0700 (PDT)');
      expect(parseReceivedHeader(msg)).toMatchInlineSnapshot(
        '2020-04-18T01:02:07.000Z',
      );
    });

    it('throws when headers are missing', () => {
      const msg = ({} as unknown) as GmailMessage;
      expect(() => parseReceivedHeader(msg)).toThrowError(
        /Message has no headers/,
      );
    });

    it('throws when Received header is mangled', () => {
      const value = 'Fri, 17 Apr 2020 18:02:07 -0700 (PDT)'; // no ; to denote start of timestamp
      const msg = ({
        payload: { headers: [{ name: 'Received', value }] },
      } as unknown) as GmailMessage;
      expect(() => parseReceivedHeader(msg)).toThrowError(/Cannot parse date/);
    });

    it('throws when Received date is invalid', () => {
      const msg = makeFakeMsg(
        'Blursday, 32 Juneteenth 2020 18:02:07 -0700 (PDT)',
      );
      expect(() => parseReceivedHeader(msg)).toThrowError(
        /Message date is invalid/,
      );
    });
  });

  describe('hydrateAll', () => {
    it('hydrates the specified messages', async () => {
      const fakeClient = (null as unknown) as GmailClient;
      const input: SparseMessage[] = [
        { id: '1', payload: { headers: FAKE_RECEIVED_HEADERS } },
        { id: '2', payload: { headers: FAKE_RECEIVED_HEADERS } },
        { id: '3', payload: { headers: FAKE_RECEIVED_HEADERS } },
      ];
      const result = await hydrateAll(fakeClient, input);
      expect(result.map((m) => m.id)).toEqual(['1', '2', '3']);
    });
  });

  describe('persistAll', () => {
    it('persists messages to the DB as expected and returns saved row count', async () => {
      const input: GmailMessage[] = [
        {
          id: '1',
          raw: 'hydrated_gmail_message',
          payload: { headers: FAKE_RECEIVED_HEADERS },
        },
        {
          id: '2',
          raw: 'hydrated_gmail_message',
          payload: { headers: FAKE_RECEIVED_HEADERS },
        },
        {
          id: '3',
          raw: 'hydrated_gmail_message',
          payload: { headers: FAKE_RECEIVED_HEADERS },
        },
      ];
      const result = await persistAll(input);
      expect(result).toEqual(3);
      expect(await Message.count()).toEqual(3);
      expect(await Message.findOne({ gmailId: '1' })).toMatchObject({
        gmailId: '1',
        data: { id: '1', raw: 'hydrated_gmail_message' },
      });
      expect(await Message.findOne({ gmailId: '2' })).toMatchObject({
        gmailId: '2',
        data: { id: '2', raw: 'hydrated_gmail_message' },
      });
      expect(await Message.findOne({ gmailId: '3' })).toMatchObject({
        gmailId: '3',
        data: { id: '3', raw: 'hydrated_gmail_message' },
      });
    });
  });

  describe('persist', () => {
    beforeEach(async () => {
      const message = new Message();
      message.gmailId = '2';
      message.receivedAt = new Date();
      message.data = {};
      return message.save();
    });

    it('persists messages that do not yet exist in the database', async () => {
      const fakeClient = (null as unknown) as GmailClient;
      const result = await persist(fakeClient);
      expect(result).toEqual({ pages: 3, listed: 3, saved: 2 });
      expect(await Message.count()).toEqual(3);
      expect(await Message.findOne({ gmailId: '1' })).toMatchObject({
        gmailId: '1',
        data: { id: '1', raw: 'hydrated_gmail_message' },
      });
      expect(await Message.findOne({ gmailId: '3' })).toMatchObject({
        gmailId: '3',
        data: { id: '3', raw: 'hydrated_gmail_message' },
      });
    });
  });
});
