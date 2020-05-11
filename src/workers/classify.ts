import { join } from 'path';
import { readFileSync } from 'fs-extra';
import Message from '../entities/message';
import { List, tag, parseKeywordLists } from '../lib/classify';
import { extractPlaintextContent } from '../lib/content';

const BATCH_SIZE = 10;
const RAW_KEYWORDS_PATH = join('resources', 'keywords.yaml');
const RAW_KEYWORDS_YAML = readFileSync(RAW_KEYWORDS_PATH).toString();

async function persistTags(message: Message, tags: string[]): Promise<void> {
  const now = new Date();
  message.taggedAt = now; // eslint-disable-line no-param-reassign
  message.tags = tags; // eslint-disable-line no-param-reassign
  await message.save();
  const tagsStr = tags.length > 0 ? tags.join(', ') : '<no tags>';
  console.log(`Tagged ${message.id} with ${tagsStr}`);
}

/**
 * Classify a message using keyword lists, then persist its tags to the database.
 * Returns true on success, false if body could not be extracted.
 * @param message The message to classify
 * @param lists The keyword lists to be used for tagging
 */
async function classifyOne(message: Message, lists: List[]): Promise<void> {
  const body = extractPlaintextContent(message.data);
  if (!body) {
    console.warn(`Could not extract plaintext body for ${message.id}`);
    await persistTags(message, ['untaggable']);
    return;
  }

  const tags = tag(body, lists);
  await persistTags(message, tags);
}

/**
 * Add tags to classify unclassified emails in the database. Returns the number of emails
 * successfully classified.
 */
export default async function classify(lists?: List[]): Promise<number> {
  const xLists = lists || (await parseKeywordLists(RAW_KEYWORDS_YAML));
  const toTag = await Message.find({
    take: BATCH_SIZE,
    where: { taggedAt: null },
  });
  if (toTag.length === 0) return 0;
  await Promise.all(toTag.map((message) => classifyOne(message, xLists)));
  return toTag.length + (await classify(lists));
}
