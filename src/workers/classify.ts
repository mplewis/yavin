import { join } from 'path';
import { readFileSync } from 'fs-extra';
import Message from '../entities/message';
import { List, tag, parseKeywordLists } from '../lib/classify';
import { extractPlaintextContent } from '../lib/content';
import { ensureLabels, labelMessage, LabelWithId } from '../lib/gmail/api';
import { GmailClient } from '../types';

const BATCH_SIZE = 10;
const RAW_KEYWORDS_PATH = join('resources', 'keywords.yaml');
export const RAW_KEYWORDS_YAML = readFileSync(RAW_KEYWORDS_PATH).toString();

async function persistTags(message: Message, tags: string[]): Promise<void> {
  const now = new Date();
  message.taggedAt = now; // eslint-disable-line no-param-reassign
  message.tags = tags; // eslint-disable-line no-param-reassign
  await message.save();
  const tagsStr = tags.length > 0 ? tags.join(', ') : '<no tags>';
  console.log(`Tagged ${message.id} with ${tagsStr}`);
}

type ClassifyResult = { success: boolean; tagsApplied: string[] };
/**
 * Classify a message using keyword lists, then persist its tags to the database.
 * Returns whether body extraction was successful and the tags applied.
 * @param message The message to classify
 * @param lists The keyword lists to be used for tagging
 */
async function classifyOne(
  message: Message,
  lists: List[],
): Promise<ClassifyResult> {
  const body = extractPlaintextContent(message.data);
  if (!body) {
    console.warn(`Could not extract plaintext body for ${message.id}`);
    const tags = ['untaggable'];
    await persistTags(message, tags);
    return { success: false, tagsApplied: tags };
  }

  const tags = tag(body, lists);
  await persistTags(message, tags);
  return { success: true, tagsApplied: tags };
}

/**
 * Add tags to classify unclassified emails in the database. Returns the number of emails
 * successfully classified.
 */
export default async function classify(
  client: GmailClient,
  lists?: List[],
): Promise<number> {
  const {
    'Yavin: Clean': labelClean,
    'Yavin: Suspicious': labelSuspicious,
    'Yavin: Untaggable': labelUntaggable,
  } = await ensureLabels(client, [
    'Yavin: Clean',
    'Yavin: Suspicious',
    'Yavin: Untaggable',
  ]);
  const xLists = lists || (await parseKeywordLists(RAW_KEYWORDS_YAML)).lists;
  const toTag = await Message.find({
    take: BATCH_SIZE,
    where: { taggedAt: null },
  });
  if (toTag.length === 0) return 0;

  const classifyResults = await Promise.all(
    toTag.map(async (message) => {
      const result = await classifyOne(message, xLists);
      // TODO: Label emails after the fact to save on API requests with message.batchModify
      let label: LabelWithId;
      if (!result.success) {
        label = labelUntaggable;
      } else if (result.tagsApplied.length === 0) {
        label = labelClean;
      } else {
        label = labelSuspicious;
      }
      const messageId = message.gmailId;
      console.log(`Labeling ${messageId} with ${label.name}`);
      await labelMessage(client, messageId, label.id);
      return result;
    }),
  );

  const successes = classifyResults.filter((result) => result.success).length;
  return successes + (await classify(client, lists));
}
