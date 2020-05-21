import { Connection, createConnection } from 'typeorm';
import { readFile } from 'fs-extra';
import Message from '../../entities/message';

export default async function ensureSafeDb(): Promise<void> {
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
}
