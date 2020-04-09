import base64 from 'base64-js';
import { TextDecoder } from 'util';

type SNU = string | null | undefined
type Pair = { name?: SNU; value?: SNU }
type Hash = { [key: string]: string }

/**
 * Decode a base64 string into UTF-8 string data.
 * @param b64data The base64 string to be decoded
 */
export function decode(b64data: string): string {
  const body = base64.toByteArray(b64data);
  return new TextDecoder().decode(body);
}

/**
 * Convert an array of name-value pair objects into a key-value object (hash).
 * @param pairs The name-value pair objects from the Gmail API
 */
export function headerPairsToHash(pairs: Pair[]): Hash {
  const hash: Hash = {};
  pairs.forEach(({ name, value }) => {
    if (!name) return;
    if (!value) return;
    hash[name] = value;
  });
  return hash;
}
