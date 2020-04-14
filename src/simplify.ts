import { Message, StrStr } from './types';
import { extractPlaintextContent } from './message';
import { headerPairsToHash } from './util';

type SimpleMessage = {
  date: Date;
  from: string;
  subject: string;
  headers: StrStr;
  plaintext: string;
}

const headerPlucker = (message: Message): { pluck: (key: string) => string; headers: StrStr } => {
  if (!message.payload?.headers) throw new Error('Message has no headers');
  const headers = headerPairsToHash(message.payload.headers);
  const pluck = (key: string): string => {
    const value = headers[key];
    if (!value) throw new Error(`Could not pluck ${key} from message headers`);
    return value;
  };
  return { pluck, headers };
};

/**
 * Get the important bits out of a message. Simplifies this stuff for devs.
 * @param message The message to be simplified
 */
export default function simplify(message: Message): SimpleMessage {
  const { pluck, headers } = headerPlucker(message);

  const from = pluck('From');
  const subject = pluck('Subject');

  const date = new Date(pluck('Date'));
  if (!date) throw new Error('Could not parse message date');

  const plaintext = extractPlaintextContent(message);
  if (!plaintext) throw new Error('Could not extract plaintext from message');
  return {
    date, from, subject, headers, plaintext,
  };
}
