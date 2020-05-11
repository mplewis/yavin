/* eslint-disable import/no-extraneous-dependencies */
import { dir } from 'tmp-promise';
import Storage from './storage';

async function instance(): Promise<Storage> {
  // tmp will clean up after itself at process exit
  const { path } = await dir({ unsafeCleanup: true });
  return new Storage(path);
}

describe('Storage', () => {
  let storage: Storage;
  beforeEach(async () => {
    storage = await instance();
  });

  it('works as expected', async () => {
    expect(await storage.get('dummy_key_doesnt_exist')).toEqual({
      found: false,
    });
    expect(await storage.get('rebel_base_location')).toEqual({ found: false });
    await storage.set('rebel_base_location', {
      planet: 'Yavin IV',
      lat: 67.328,
      lon: -34.199,
    });
    expect(await storage.get('rebel_base_location')).toEqual({
      found: true,
      value: { planet: 'Yavin IV', lat: 67.328, lon: -34.199 },
    });
  });
});
