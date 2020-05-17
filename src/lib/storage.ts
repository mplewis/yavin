import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Found = { found: true; value: any };
type NotFound = { found: false };
type Result = Found | NotFound;

/**
 * A simple key-value store using the filesystem.
 * Automatically de/serializes data via `JSON.parse`/`stringify`.
 * Best-effort set/get - any errors either bubble up or turn into `NotFound`.
 */
export default class Storage {
  basePath: string;

  /**
   * Create a new instance of Storage.
   * @param basePath The filesystem path under which values are stored
   */
  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get a fully-qualified absolute path to the file for a given key.
   * @param key The key for which data is being set or requested
   */
  private pathTo(key: string): string {
    return join(this.basePath, key);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /**
   * Store a value in a key, serializing it as JSON.
   * @param key The key for which data is being set
   * @param value The data being set
   */
  async set(key: string, value: any): Promise<void> {
    return writeFile(this.pathTo(key), JSON.stringify(value));
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /**
   * Retrieve a value for a key, deserializing it from JSON.
   * @param key The key for which data is being retreived
   */
  async get(key: string): Promise<Result> {
    let value;
    try {
      value = await readFile(this.pathTo(key));
    } catch (e) {
      // HACK: other things could go wrong besides file not found - i'm not handling them here
      return { found: false };
    }
    return { found: true, value: JSON.parse((await value).toString()) };
  }
}
