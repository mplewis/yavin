import stemmer from 'wink-porter2-stemmer';
import yaml from 'js-yaml';
import { StrNum } from './types';

type List = { name: string; words: string[]; phrases: string[] }
type Hits = StrNum
type Tags = string[]

/**
 * Count instances of unique strings.
 *
 * https://stackoverflow.com/a/15052738/254187
 */
function countUniqueStrings(arr: string[]): StrNum {
  const counts: StrNum = {};
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
export function stemAndCount(text: string): StrNum {
  return countUniqueStrings(extractWords(text).map((w) => stem(w)));
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

/**
 * Analyze the words in a document and return the number of hits in each list.
 * Keywords occurring multiple times are counted multiple times.
 * @param bodyWords The body of the document to be analyzed
 * @param lists The lists to search for matching keywords
 */
export function analyzeWords(body: string, lists: List[]): Hits {
  const results: StrNum = {};
  const bodyWordCount = stemAndCount(body);
  lists.forEach(({ name, words }) => {
    results[name] = words.reduce((total, word) => total + (bodyWordCount[word] || 0), 0);
  });
  return results;
}

/**
 * Analyze the phrases in a document and return the number of hits in each list.
 * Phrases occurring multiple times are counted multiple times.
 * @param body The body of the document to be analyzed
 * @param lists The lists to search for matching keywords
 */
export function analyzePhrases(body: string, lists: List[]): Hits {
  const results: StrNum = {};
  lists.forEach(({ name, phrases }) => {
    phrases.forEach((phrase) => {
      const matcher = new RegExp(phrase, 'gi');
      const hits = (body.match(matcher) || []).length;
      results[name] = hits;
    });
  });
  return results;
}

/**
 * Sum the counts from two or more Hits results.
 * @param objects The string-number hashes to combine
 */
function combineCounts(...hits: Hits[]): StrNum {
  const results: StrNum = {};
  hits.forEach((hit) => {
    Object.entries(hit).forEach(([name, count]) => {
      results[name] = (results[name] || 0) + count;
    });
  });
  return results;
}

/**
 * Analyze a document and return the number of hits from each keyword list.
 * @param body The body of the document to be analyzed
 * @param lists The lists to search for matching keywords
 */
export function analyze(body: string, lists: List[]): Hits {
  const wordHits = analyzeWords(body, lists);
  const phraseHits = analyzePhrases(body, lists);
  return combineCounts(wordHits, phraseHits);
}

/**
 * Tag a document based on the relative frequency of occurring words from keyword lists.
 * @param body The text to analyze
 * @param lists The lists to search for matching keywords
 */
export function relativeFrequency(body: string, lists: List[]): StrNum {
  const hits = analyze(body, lists);
  const wordCount = extractWords(body).length;
  const result: StrNum = {};
  Object.entries(hits).forEach(([name, count]) => {
    result[name] = (count === 0) ? 0 : count / wordCount;
  });
  return result;
}

/**
 * Tag a document based on the relative frequency of occurring words from keyword lists.
 * @param body The text to analyze
 * @param lists The lists to search for matching keywords
 * @param threshold A fractional percentage (`0 < n < 1`).
 *                  If `category_hits / word_count >= threshold`, the tag is applied.
 */
export function tag(body: string, lists: List[], threshold: number): Tags {
  const hits = analyze(body, lists);
  const wordCount = extractWords(body).length;
  return Object.entries(hits)
    .filter(([, hitsCount]) => {
      if (!hitsCount) return false;
      return (hitsCount / wordCount) >= threshold;
    })
    .map(([name]) => name);
}
