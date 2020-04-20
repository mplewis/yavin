import { Connection, createConnection } from 'typeorm';
import {
  SparseMessage, castToSparse, shouldSaveMessage, omitKnownMessages, hydrateAll,
} from './features';
import { Message as GmailMessage, GmailClient } from '../types';
import Message from '../entities/message';

jest.mock('./api');

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
  beforeAll(async () => { conn = await createConnection(); });
  afterAll(async () => { await conn.close(); });

  beforeEach(() => { Message.clear(); });

  async function insertMessagesWithIds(...ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => {
      const message = new Message();
      message.gmailId = id;
      message.data = {};
      return message.save();
    }));
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
        { id: 'known1' }, { id: 'known2' }, { id: 'unknown1' }, { id: 'unknown2' }];
      expect(await omitKnownMessages(input)).toEqual([{ id: 'unknown1' }, { id: 'unknown2' }]);
    });
  });

  describe('hydrateAll', () => {
    it('hydrates the specified messages', async () => {
      const fakeClient = null as unknown as GmailClient;
      const input: SparseMessage[] = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const result = await hydrateAll(fakeClient, input);
      expect(result).toEqual([
        { id: '1', raw: 'hydrated_gmail_message' },
        { id: '2', raw: 'hydrated_gmail_message' },
        { id: '3', raw: 'hydrated_gmail_message' },
      ]);
    });
  });
});
