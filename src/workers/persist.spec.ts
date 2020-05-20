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

jest.mock('../lib/gmail/api');

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
    function makeFakeMsg({
      date,
      value,
    }: {
      date?: string;
      value?: string;
    }): GmailMessage {
      if (value) {
        const v = value.trim().split('\n').join();
        return { payload: { headers: [{ name: 'Received', value: v }] } };
      }
      return makeFakeMsg({
        value: `by 127.0.0.1 with SMTP id deadbeefcafe;        ${date}`,
      });
    }

    it('parses Received headers as expected', () => {
      const msg = makeFakeMsg({
        date: 'Fri, 17 Apr 2020 18:02:07 -0700 (PDT)',
      });
      expect(parseReceivedHeader(msg)).toMatchInlineSnapshot(
        '2020-04-18T01:02:07.000Z',
      );
    });

    it('even parses Received headers missing semicolons', () => {
      const value = 'from MTAzMzg1MDM (unknown) by geopod-ismtpd-5-0 (SG) with '
        + 'HTTP id iz6CugXqRImzFy0ExSSbJQ Mon, 20 Apr 2020 21:17:19.253 +0000 (UTC)';
      const msg = makeFakeMsg({ value });
      expect(parseReceivedHeader(msg)).toMatchInlineSnapshot(
        '2020-04-20T21:17:19.253Z',
      );
    });

    it('even parses long Received headers that rely on semicolons 1', () => {
      const value = `
from a13-53.smtp-out.amazonses.com (a13-53.smtp-out.amazonses.com [54.240.13.53])
(using TLSv1.2 with cipher ECDHE-RSA-AES128-SHA256 (128/128 bits))
(No client certificate requested) by mx-fwd-1.nearlyfreespeech.net (Postfix)
with ESMTPS for <matt@mplewis.com>; Sun, 17 May 2020 21:14:37 +0000 (UTC)
`;
      const msg = makeFakeMsg({ value });
      expect(parseReceivedHeader(msg)).toMatchInlineSnapshot(
        '2020-05-17T21:14:37.000Z',
      );
    });

    it('even parses long Received headers that rely on semicolons 2', () => {
      const value = `
from mail-sor-f69.google.com (mail-sor-f69.google.com. [209.85.220.69])
        by mx.google.com with SMTPS id g26sor7377804ile.82.2020.05.17.12.51.27
        for <mathprog777@gmail.com>
        (Google Transport Security);
        Sun, 17 May 2020 12:51:27 -0700 (PDT)`;
      const msg = makeFakeMsg({ value });
      expect(parseReceivedHeader(msg)).toMatchInlineSnapshot(
        '2020-05-17T19:51:27.000Z',
      );
    });

    it('throws when headers are missing', () => {
      const msg: GmailMessage = {};
      expect(() => parseReceivedHeader(msg)).toThrowError(
        /Message has no headers/,
      );
    });

    it('throws when Received header is mangled', () => {
      const value = 'this is completely incorrect Fri, 17 Apr 2020; 18:02:07 -0700 (PDT)';
      const msg = makeFakeMsg({ value });
      expect(() => parseReceivedHeader(msg)).toThrowError(/Cannot parse date/);
    });

    it('throws when Received date is invalid', () => {
      const msg = makeFakeMsg({
        date: 'Blursday, 32 Juneteenth 2020 18:02:07 -0700 (PDT)',
      });
      expect(() => parseReceivedHeader(msg)).toThrowError(/Cannot parse date/);
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
