/* eslint-disable import/prefer-default-export */
import base64 from 'base64-js';
import { TextDecoder } from 'util';

/**
 * Decode a base64 string into UTF-8 string data.
 * @param b64data The base64 string to be decoded
 */
export function decode(b64data: string): string {
  const body = base64.toByteArray(b64data);
  return new TextDecoder().decode(body);
}
