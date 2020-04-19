import { Connection, createConnection } from 'typeorm';
import { SparseMessage, castToSparse, shouldSaveMessage } from './features';
import { Message as GmailMessage } from '../types';
import Message from '../entities/message';

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
});
