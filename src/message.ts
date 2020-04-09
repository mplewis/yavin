import { MessagePart, Message } from './types';
import { decode } from './util';

const PREFERRED_MIMETYPES = [
  'text/plain',
  'text/html',
];

/**
 * Given a series of message parts, pick one that we prefer.
 *
 * This is a simple app for analyzing text content of a message, so we prefer the simplest
 * text format possible for now.
 *
 * @param parts The MessageParts for this message from the Gmail API
 */
export function selectPart(parts: MessagePart[]): MessagePart {
  // HACK: multipart-alternative contains the ACTUAL parts I want to parse out,
  // and I'm making a lot of assumptions about how I can find those actual parts right now
  const container = parts.find((part) => part.mimeType === 'multipart/alternative' && part.parts);
  // HACK: ?. silences ts; ugly but i promise we already did the check in the #find
  if (container?.parts) { return selectPart(container.parts); }

  let selected: MessagePart | undefined;
  PREFERRED_MIMETYPES.forEach((preferred) => {
    if (selected) return;
    selected = parts.find((part) => part.mimeType === preferred && part.body?.data);
  });
  if (selected) return selected;
  return parts[0];
}

/**
 * Extract some useful text content from a message, if possible. Prefer body, then parts.
 *
 * TODO: Extract text from HTML
 *
 * @param message The message from which to extract content
 */
export function extractContent(message: Message): string | null {
  const { payload } = message;
  if (!payload) return null;
  const bodyData = payload.body?.data;
  if (bodyData) return decode(bodyData);
  if (!payload.parts) return null;
  const preferredPart = selectPart(payload.parts);
  const partData = preferredPart.body?.data;
  return partData ? decode(partData) : null;
}
