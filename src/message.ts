import { MessagePart } from './types';

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
  let selected: MessagePart | undefined;
  PREFERRED_MIMETYPES.forEach((preferred) => {
    if (selected) return;
    selected = parts.find((part) => part.mimeType === preferred && part.body?.data);
  });
  if (selected) return selected;
  return parts[0];
}
