import striptags from 'striptags';
import { MessagePart, Message, SNU } from '../types';
import { decode } from './util';

type Content = { kind: ContentType; body: string };
type ContentType = 'plaintext' | 'html' | 'unknown';

const MIME_TO_CONTENT_TYPE: { [m: string]: ContentType } = {
  'text/plain': 'plaintext',
  'text/html': 'html',
};

/**
 * Mimetypes in this list will be preferred in top-down order when searching an email's parts
 * for valid body content
 */
const PREFERRED_MIMETYPES = ['text/plain', 'text/html'];

/**
 * If body content contains one of these, it's probably HTML. If not, it's probably plaintext.
 */
const HTML_MARKERS = ['<html>', '<head>', '<body>', '<table>'];

/**
 * Convert an email part mimetype to a ContentType.
 * @param mimeType The part mimetype
 */
export function contentTypeFor(mimeType?: SNU): ContentType {
  if (!mimeType) return 'unknown';
  return MIME_TO_CONTENT_TYPE[mimeType] || 'unknown';
}

/**
 * Make a simple guess as to what type of content the uncategorized body text is.
 * @param body The body text to scan
 */
export function categorize(body: string): ContentType {
  const haystack = body.toLowerCase();
  const found = HTML_MARKERS.find((needle) => haystack.includes(needle));
  if (found) return 'html';
  return 'plaintext';
}

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
  const container = parts.find(
    (part) => part.mimeType === 'multipart/alternative' && part.parts,
  );
  // HACK: ?. silences ts; ugly but i promise we already did the check in the #find
  if (container?.parts) {
    return selectPart(container.parts);
  }

  let selected: MessagePart | undefined;
  PREFERRED_MIMETYPES.forEach((preferred) => {
    if (selected) return;
    selected = parts.find(
      (part) => part.mimeType === preferred && part.body?.data,
    );
  });
  if (selected) return selected;
  return parts[0];
}

/**
 * Extract the most useful text content from a message, if any reasonable content is found.
 * Prefer body, then parts.
 *
 * @param message The message from which to extract content
 */
export function extractContent(message: Message): Content | null {
  const { payload } = message;
  if (!payload) return null;

  const bodyData = payload.body?.data;
  if (bodyData) {
    const body = decode(bodyData);
    const kind = categorize(body);
    return { kind, body };
  }

  if (!payload.parts) return null;
  const preferredPart = selectPart(payload.parts);
  const partData = preferredPart.body?.data;
  if (!partData) return null;

  const body = decode(partData);
  const kind = contentTypeFor(preferredPart.mimeType);
  return { body, kind };
}

/**
 * Extract plaintext content from a message, if possible. If only HTML is present, strip the tags.
 * @param message The message from which to extract plaintext content
 */
export function extractPlaintextContent(message: Message): string | undefined {
  const content = extractContent(message);
  if (!content) return undefined;
  if (content.kind === 'plaintext') return content.body;
  return striptags(content.body);
}
