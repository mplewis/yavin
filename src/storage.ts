import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';

type NotFound = null
type Item = any

/**
 * A simple key-value store using the filesystem.
 * Automatically de/serializes data via `JSON.parse`/`stringify`.
 * Best-effort set/get - any errors either bubble up or turn into `NotFound`.
 */
export default class Storage {
  basePath: string

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

  /**
   * Store a value in a key, serializing it as JSON.
   * @param key The key for which data is being set
   * @param value The data being set
   */
  async set(key: string, value: any): Promise<void> {
    await writeFile(this.pathTo(key), JSON.stringify(value));
  }

  /**
   * Retrieve a value for a key, deserializing it from JSON.
   * @param key The key for which data is being retreived
   */
  async get(key: string): Promise<Item | NotFound> {
    let value;
    try {
      value = readFile(this.pathTo(key));
    } catch (e) {
      // HACK: other things could go wrong besides file not found - i'm not handling them here
      return null;
    }
    return JSON.parse((await value).toString());
  }
}
