import stemmer from 'stemmer';
import yaml from 'js-yaml';

type List = { name: string; words: string[]; phrases: string[] }

/**
 * Count instances of unique strings.
 *
 * https://stackoverflow.com/a/15052738/254187
 */
function count(arr: string[]): { [k: string]: number } {
  const counts: { [k: string]: number } = {};
  for (let i = 0; i < arr.length; i += 1) {
    counts[arr[i]] = 1 + (counts[arr[i]] || 0);
  }
  delete counts[''];
  return counts;
}

/**
 * Stem a word. Used as a simple shim to provide clean imports for other source files that
 * need to stem words.
 * @param word The word to be stemmed
 */
export function stem(word: string): string {
  return stemmer(word);
}

/**
 * Trim punctuation from the start and end of a string.
 *
 * https://stackoverflow.com/a/4328722/254187
 *
 * @param s The string to be trimmed
 */
export function trimPunc(s: string): string {
  return s
    .replace(/^[.,/#!$%^&*;:{}=\-_`~()]+/, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]+$/, '');
}

/**
 * Given input text, extract lowercase words, trimming all whitespace.
 * @param text The text from which to extract words
 */
export function extractWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((s) => s.toLowerCase())
    .map((s) => trimPunc(s));
}

/**
 * Given input text, extract all the words, stem each one, and count instances of each stem.
 * @param text The text to analyze
 */
export function stemAndCount(text: string): { [word: string]: number } {
  return count(extractWords(text).map((w) => stem(w)));
}

/**
 * Classify an item as a word or a phrase.
 * @param item The item to classify
 */
function wordOrPhrase(item: string): 'word' | 'phrase' {
  return item.match(/\s/) ? 'phrase' : 'word';
}

/**
 * Parse the keywords YAML into Lists.
 */
export function parseKeywordLists(rawYaml: string): List[] {
  const rawObj: { [name: string]: string[] } = yaml.safeLoad(rawYaml);
  const lists: List[] = [];
  Object.entries(rawObj).forEach(([name, items]) => {
    const words: string[] = [];
    const phrases: string[] = [];
    items.forEach((rawItem) => {
      const lowered = rawItem.toLowerCase();
      if (wordOrPhrase(lowered) === 'phrase') {
        phrases.push(lowered);
        return;
      }
      words.push(stem(lowered));
    });
    lists.push({ name, words, phrases });
  });
  return lists;
}
